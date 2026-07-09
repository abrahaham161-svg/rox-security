const db = require('./database');

const actionLog = new Map();

const ACTIONS = {
  createChannel: { label: 'Crear Canales', emoji: '📁', premium: false, defaultLimit: 1 },
  deleteChannel: { label: 'Borrar Canales', emoji: '🗑️', premium: false, defaultLimit: 1 },
  editChannel: { label: 'Editar Canales', emoji: '✏️', premium: true, defaultLimit: 1 },
  createRole: { label: 'Crear Roles', emoji: '🎭', premium: false, defaultLimit: 1 },
  deleteRole: { label: 'Borrar Roles', emoji: '🗑️', premium: false, defaultLimit: 1 },
  editRole: { label: 'Editar Roles', emoji: '✏️', premium: true, defaultLimit: 1 },
  createEmoji: { label: 'Crear Emojis', emoji: '😀', premium: true, defaultLimit: 1 },
  deleteEmoji: { label: 'Borrar Emojis', emoji: '🗑️', premium: true, defaultLimit: 1 },
  kick: { label: 'Expulsar Usuarios', emoji: '👢', premium: false, defaultLimit: 3 },
  ban: { label: 'Banear Usuarios', emoji: '🔨', premium: false, defaultLimit: 3 },
  unban: { label: 'Desbanear Usuarios', emoji: '✅', premium: false, defaultLimit: 3 },
  editWebhook: { label: 'Editar Webhooks', emoji: '🔗', premium: true, defaultLimit: 1 },
};

function getConfig(guildId) {
  const c = db.get(guildId) || {};
  if (!c.antiNuke) {
    c.antiNuke = {};
    for (const [key, def] of Object.entries(ACTIONS)) {
      c.antiNuke[key] = { enabled: !def.premium, limit: def.defaultLimit };
    }
    db.set(guildId, c);
  }
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
