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
    const createdDays = Math.floor((Date.now() - user.createdTimestamp) / 86400000);
    const joinedDays = member ? Math.floor((Date.now() - member.joinedTimestamp) / 86400000) : 0;

    const badges = [];
    if (user.id === interaction.guild.ownerId) badges.push('👑 **Dueño del servidor**');
    if (user.id === '1133066682399739974') badges.push('🤖 **Owner del Bot**');
    if (user.bot) badges.push('🤖 **Bot**');
    if (inWhitelist) badges.push('🛡️ **Whitelisted**');
    if (isVerified) badges.push('✅ **Verificado**');
    if (!badges.length) badges.push('👤 **Miembro**');

    await interaction.reply({
      embeds: [{
        title: user.tag,
        thumbnail: { url: user.displayAvatarURL({ size: 256 }) },
        color: member?.displayColor || 0x00d4ff,
        fields: [
          {
            name: '🎖️ Insignias',
            value: badges.join('\n'),
            inline: false,
          },
          {
            name: '📅 Cuenta creada',
            value: `<t:${Math.floor(user.createdTimestamp / 1000)}:R>`,
            inline: true,
          },
          {
            name: '⏳ Antigüedad',
            value: `**${createdDays}** día(s)`,
            inline: true,
          },
          {
            name: '📥 Se unió',
            value: member ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>` : '❌ No está en el servidor',
            inline: true,
          },
          {
            name: '📆 Tiempo en el server',
            value: member ? `**${joinedDays}** día(s)` : '—',
            inline: true,
          },
          {
            name: '🎭 Apodo',
            value: member?.nickname || 'Sin apodo',
            inline: true,
          },
          {
            name: '🎖️ Rol más alto',
            value: member ? `${member.roles.highest}` : '—',
            inline: true,
          },
          {
            name: '📊 Roles',
            value: member ? `**${member.roles.cache.size - 1}** rol(es)` : '—',
            inline: true,
          },
          {
            name: '🆔 ID',
            value: `\`${user.id}\``,
            inline: false,
          },
        ],
        footer: { text: 'Rox Security v1.0' },
        timestamp: new Date().toISOString(),
      }],
      flags: MessageFlags.Ephemeral,
    });
  },
};
