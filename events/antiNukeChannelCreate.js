const antiNuke = require('../utils/antiNuke');
const { AuditLogEvent } = require('discord.js');

module.exports = {
  name: 'channelCreate',
  async execute(channel) {
    await antiNuke.handleEvent(channel.guild, 'createChannel', AuditLogEvent.ChannelCreate);
  },
};
