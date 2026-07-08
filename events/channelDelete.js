const db = require('../utils/database');
const log = require('../utils/logger');

module.exports = {
  name: 'channelDelete',
  async execute(channel) {
    if (channel.type !== 0) return;

    const config = db.get(channel.guild.id);
    if (!config) return;

    if (config.verifyChannel === channel.id) {
      config.verifyChannel = null;
      db.set(channel.guild.id, config);

      await log.sendLog(channel.guild, 'warn', '⚠️ Canal de verificación eliminado',
        `El canal **#${channel.name}** fue eliminado.\nSe requiere configurar un nuevo canal de verificación con el comando \`/verificacion\`.`);
    }
  },
};
