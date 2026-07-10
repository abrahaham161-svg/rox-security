const antiNuke = require('../utils/antiNuke');
const { AuditLogEvent } = require('discord.js');

module.exports = {
  name: 'guildMemberRemove',
  async execute(member) {
    if (!member.guild || member.user.bot) return;
    const config = antiNuke.getConfig(member.guild.id);
    const actionCfg = config.kick;
    if (!actionCfg || !actionCfg.enabled) return;

    try {
      await new Promise(r => setTimeout(r, 1000));
      const audit = await member.guild.fetchAuditLogs({ type: AuditLogEvent.MemberKick, limit: 1 });
      const entry = audit.entries.first();
      if (!entry || entry.executor.bot || entry.target.id !== member.id) return;
      await antiNuke.handleEvent(member.guild, 'kick', AuditLogEvent.MemberKick);
    } catch (e) {
      console.error('[AntiNukeKick] Error:', e.message);
    }
  },
};
