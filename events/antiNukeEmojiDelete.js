const antiNuke = require('../utils/antiNuke');
const { AuditLogEvent } = require('discord.js');

module.exports = {
  name: 'emojiDelete',
  async execute(emoji) {
    await antiNuke.handleEvent(emoji.guild, 'deleteEmoji', AuditLogEvent.EmojiDelete);
  },
};
