const antiNuke = require('../utils/antiNuke');
const { AuditLogEvent } = require('discord.js');

module.exports = {
  name: 'guildBanRemove',
  async execute(ban) {
    await antiNuke.handleEvent(ban.guild, 'unban', AuditLogEvent.MemberBanRemove);
  },
};
