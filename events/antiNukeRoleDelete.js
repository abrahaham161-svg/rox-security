const antiNuke = require('../utils/antiNuke');
const { AuditLogEvent } = require('discord.js');

module.exports = {
  name: 'roleDelete',
  async execute(role) {
    await antiNuke.handleEvent(role.guild, 'deleteRole', AuditLogEvent.RoleDelete);
  },
};
