const antiNuke = require('../utils/antiNuke');
const { AuditLogEvent } = require('discord.js');

module.exports = {
  name: 'roleCreate',
  async execute(role) {
    await antiNuke.handleEvent(role.guild, 'createRole', AuditLogEvent.RoleCreate);
  },
};
