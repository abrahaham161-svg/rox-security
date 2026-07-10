const antiNuke = require('../utils/antiNuke');
const { AuditLogEvent } = require('discord.js');

module.exports = {
  name: 'emojiCreate',
  async execute(emoji) {
    await antiNuke.handleEvent(emoji.guild, 'createEmoji', AuditLogEvent.EmojiCreate);
  },
};
