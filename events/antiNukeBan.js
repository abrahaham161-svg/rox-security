const antiNuke = require('../utils/antiNuke');
const { AuditLogEvent } = require('discord.js');

module.exports = {
  name: 'guildBanAdd',
  async execute(ban) {
    await antiNuke.handleEvent(ban.guild, 'ban', AuditLogEvent.MemberBanAdd);
  },
};
