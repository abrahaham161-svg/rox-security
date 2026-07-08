const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const database = require('../utils/database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('perfil')
    .setDescription('Ver tu perfil de seguridad o el de otro usuario')
    .addUserOption(opt => opt.setName('usuario').setDescription('El usuario (opcional)')),

  async execute(interaction) {
    const user = interaction.options.getUser('usuario') || interaction.user;
    const config = database.get(interaction.guild.id) || {};
    const member = await interaction.guild.members.fetch(user.id).catch(() => null);

    const inWhitelist = (config.whitelist || []).includes(user.id);
    const isVerified = config.verifiedRole && member?.roles.cache.has(config.verifiedRole);

    const badges = [];
    if (inWhitelist) badges.push('📜 Whitelist');
    if (isVerified) badges.push('✅ Verificado');
    if (user.id === interaction.guild.ownerId) badges.push('👑 Dueño');
    if (!badges.length) badges.push('🔹 Miembro');

    await interaction.reply({
      embeds: [{
        title: `👤 ${user.tag}`,
        thumbnail: { url: user.displayAvatarURL({ size: 128 }) },
        color: 0x00d4ff,
        fields: [
          { name: '🎖️ Insignias', value: badges.join('\n'), inline: true },
          { name: '📆 Se unió', value: member ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>` : '❌ No está', inline: true },
          { name: '🆔 ID', value: user.id, inline: true },
        ],
        footer: { text: 'Rox Security v1.0' },
        timestamp: new Date().toISOString(),
      }],
      flags: MessageFlags.Ephemeral,
    });
  },
};
