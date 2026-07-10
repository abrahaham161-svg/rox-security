const db = require('./database');
const log = require('./logger');

const actionLog = new Map();
const PUNISHMENTS = ['kick', 'ban', 'timeout'];

const ACTIONS = {
  createChannel: { label: 'Crear Canales', emoji: '📁', premium: false, event: 'channelCreate' },
  deleteChannel: { label: 'Borrar Canales', emoji: '🗑️', premium: false, event: 'channelDelete' },
  editChannel: { label: 'Editar Canales', emoji: '✏️', premium: true, event: 'channelUpdate' },
  createRole: { label: 'Crear Roles', emoji: '🎭', premium: false, event: 'roleCreate' },
  deleteRole: { label: 'Borrar Roles', emoji: '🗑️', premium: false, event: 'roleDelete' },
  editRole: { label: 'Editar Roles', emoji: '✏️', premium: true, event: 'roleUpdate' },
  createEmoji: { label: 'Crear Emojis', emoji: '😀', premium: false, event: 'emojiCreate' },
  deleteEmoji: { label: 'Borrar Emojis', emoji: '🗑️', premium: false, event: 'emojiDelete' },
  kick: { label: 'Expulsar Usuarios', emoji: '👢', premium: false, event: 'guildMemberRemove' },
  ban: { label: 'Banear Usuarios', emoji: '🔨', premium: false, event: 'guildBanAdd' },
  unban: { label: 'Desbanear Usuarios', emoji: '✅', premium: false, event: 'guildBanRemove' },
  editWebhook: { label: 'Editar Webhooks', emoji: '🔗', premium: false, event: 'webhookUpdate' },
};

function getConfig(guildId) {
  const c = db.get(guildId) || {};
  if (!c.antiNuke) { c.antiNuke = {}; db.set(guildId, c); }
  return c.antiNuke;
}

function getAction(actionType) {
  return ACTIONS[actionType] || null;
}

async function enforceAction(guild, userId, actionType, member) {
  const config = getConfig(guild.id);
  const actionCfg = config[actionType];
  if (!actionCfg || !actionCfg.enabled) return;

  const punishment = actionCfg.punishment || 'kick';
  const reason = `[Anti-Nuke] Límite excedido: ${ACTIONS[actionType]?.label || actionType}`;
  let timeoutMinutes = '';

  if (punishment === 'ban') {
    await member.ban({ reason }).catch(() => {});
  } else if (punishment === 'kick') {
    await member.kick(reason).catch(() => {});
  } else if (punishment === 'timeout') {
    const ms = actionCfg.timeoutDuration || 600000;
    timeoutMinutes = ` (${Math.round(ms / 60000)} min)`;
    await member.timeout(ms, reason).catch(() => {});
  }

  await log.sendLog(guild, 'punish', '🔨 Anti-Nuke', `**${member.user.tag}** excedió límite de **${ACTIONS[actionType]?.label}**\n**Castigo:** ${punishment}${timeoutMinutes}`);
}

function checkAction(guildId, userId, actionType) {
  const config = getConfig(guildId);
  const actionCfg = config[actionType];
  if (!actionCfg || !actionCfg.enabled) return { blocked: false };

  const key = `${guildId}-${userId}-${actionType}`;
  const now = Date.now();

  if (!actionLog.has(key)) actionLog.set(key, []);
  const log = actionLog.get(key);

  const recent = log.filter(t => now - t < 60000);
  recent.push(now);
  actionLog.set(key, recent);

  if (recent.length > (actionCfg.limit || 1)) {
    return { blocked: true, limit: actionCfg.limit || 1, punishment: actionCfg.punishment || 'kick', timeoutDuration: actionCfg.timeoutDuration };
  }

  return { blocked: false };
}

async function handleEvent(guild, actionType, auditType) {
  if (!guild) return;
  const config = getConfig(guild.id);
  const actionCfg = config[actionType];
  if (!actionCfg || !actionCfg.enabled) return;

  const actionInfo = ACTIONS[actionType];
  if (!actionInfo || actionInfo.premium) return;

  try {
    const audit = await guild.fetchAuditLogs({ type: auditType, limit: 1 });
    const entry = audit.entries.first();
    if (!entry || entry.executor.bot) return;
    const userId = entry.executor.id;

    const result = checkAction(guild.id, userId, actionType);
    if (!result.blocked) return;

    const member = await guild.members.fetch(userId).catch(() => null);
    if (!member || !member.moderatable) return;

    await enforceAction(guild, userId, actionType, member);
  } catch (e) {
    console.error(`[AntiNuke] Error en handleEvent (${actionType}):`, e.message);
  }
}

function resetGuild(guildId) {
  for (const key of actionLog.keys()) {
    if (key.startsWith(guildId + '-')) actionLog.delete(key);
  }
}

module.exports = { ACTIONS, PUNISHMENTS, getConfig, getAction, enforceAction, checkAction, handleEvent, resetGuild };
