const antiRaid = require('../utils/antiRaid');
const database = require('../utils/database');
const logger = require('../utils/logger');
const captcha = require('../utils/captcha');
const { startTimer } = require('../utils/verificationManager');

module.exports = {
  name: 'guildMemberAdd',
  async execute(member) {
    if (member.user.bot) return;

    const config = database.get(member.guild.id);
    if (!config) return;
    if (config.whitelist && config.whitelist.includes(member.id)) return;

    const result = antiRaid.checkJoin(member.guild.id, member);

    if (result.raid) {
      await logger.sendLog(member.guild, 'raid', '🚨 Posible raid', `**${member.user.tag}** (${member.id})\n📌 ${result.reason}`);
      const action = config.action || 'kick';
      try {
        if (action === 'ban') await member.ban({ reason: `[Rox Security] ${result.reason}` });
        else await member.kick(`[Rox Security] ${result.reason}`);
        await logger.sendLog(member.guild, 'punish', '🔨 Castigado', `**${member.user.tag}** → ${action}\n📌 ${result.reason}`);
      } catch (err) {
        await logger.sendLog(member.guild, 'error', '❌ Error', `No pude ${action} a **${member.user.tag}**: ${err.message}`);
      }
      return;
    }

    if (config.verifyEnabled) {
      if (config.noVerifiedRole) {
        try {
          await member.roles.add(config.noVerifiedRole);
        } catch {}
      }

      captcha.createVerification(member.id, member.guild.id);

      if (config.verifyTime) {
        startTimer(member.guild.id, member.id, config.verifyTime);
      }
    }
  },
};
