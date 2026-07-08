const database = require('./database');

const colors = {
  info: 0x3498db,
  warn: 0xf1c40f,
  error: 0xe74c3c,
  success: 0x2ecc71,
  punish: 0x9b59b6,
  raid: 0xff0000,
};

const emojis = {
  info: 'ℹ️',
  warn: '⚠️',
  error: '❌',
  success: '✅',
  punish: '🔨',
  raid: '🚨',
};

async function sendLog(guild, type, title, description, fields = []) {
  const config = database.get(guild.id);
  if (!config || !config.logChannel) return;

  const channel = guild.channels.cache.get(config.logChannel);
  if (!channel) return;

  const embed = {
    title: `${emojis[type] || '📋'} ${title}`,
    description,
    color: colors[type] || 0x95a5a6,
    fields,
    timestamp: new Date().toISOString(),
  };

  try {
    await channel.send({ embeds: [embed] });
  } catch { }

  database.appendLog(guild.id, { type, title, description, fields });
}

module.exports = { sendLog, colors, emojis };
