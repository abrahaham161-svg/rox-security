const antiNuke = require('../utils/antiNuke');
const { AuditLogEvent } = require('discord.js');

module.exports = {
  name: 'channelDelete',
  async execute(channel) {
    await antiNuke.handleEvent(channel.guild, 'deleteChannel', AuditLogEvent.ChannelDelete);
  },
};
