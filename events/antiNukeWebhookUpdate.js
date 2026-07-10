const antiNuke = require('../utils/antiNuke');
const { AuditLogEvent } = require('discord.js');

module.exports = {
  name: 'webhookUpdate',
  async execute(channel) {
    await antiNuke.handleEvent(channel.guild, 'editWebhook', AuditLogEvent.WebhookUpdate);
  },
};
