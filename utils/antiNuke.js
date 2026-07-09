const db = require('./database');

const actionLog = new Map();

const ACTIONS = {
  createChannel: { label: 'Crear Canales', emoji: '📁', premium: false },
  deleteChannel: { label: 'Borrar Canales', emoji: '🗑️', premium: false },
  editChannel: { label: 'Editar Canales', emoji: '✏️', premium: true },
  createRole: { label: 'Crear Roles', emoji: '🎭', premium: false },
  deleteRole: { label: 'Borrar Roles', emoji: '🗑️', premium: false },
  editRole: { label: 'Editar Roles', emoji: '✏️', premium: true },
  createEmoji: { label: 'Crear Emojis', emoji: '😀', premium: false },
  deleteEmoji: { label: 'Borrar Emojis', emoji: '🗑️', premium: false },
  kick: { label: 'Expulsar Usuarios', emoji: '👢', premium: false },
  ban: { label: 'Banear Usuarios', emoji: '🔨', premium: false },
  unban: { label: 'Desbanear Usuarios', emoji: '✅', premium: false },
  editWebhook: { label: 'Editar Webhooks', emoji: '🔗', premium: false },
};

function getConfig(guildId) {
  const c = db.get(guildId) || {};
  if (!c.antiNuke) { c.antiNuke = {}; db.set(guildId, c); }
  return c.antiNuke;
}

function checkAction(guildId, userId, actionType) {
  const config = getConfig(guildId);
  const action = config[actionType];
  if (!action || !action.enabled) return { blocked: false };

  const key = `${guildId}-${userId}-${actionType}`;
  const now = Date.now();

  if (!actionLog.has(key)) actionLog.set(key, []);
  const log = actionLog.get(key);

  const recent = log.filter(t => now - t < 60000);
  recent.push(now);
  actionLog.set(key, recent);

  if (recent.length > action.limit) {
    return { blocked: true, limit: action.limit };
  }

  return { blocked: false };
}

function getActionInfo(actionType) {
  return ACTIONS[actionType] || null;
}

module.exports = { ACTIONS, getConfig, checkAction, getActionInfo };
