const { SlashCommandBuilder, MessageFlags, ChannelType } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('server')
    .setDescription('Ver información del servidor'),

  async execute(interaction) {
    const g = interaction.guild;
    const owner = await g.fetchOwner().catch(() => null);
    const channels = g.channels.cache;
    const text = channels.filter(c => c.type === ChannelType.GuildText).size;
    const voice = channels.filter(c => c.type === ChannelType.GuildVoice).size;
    const cats = channels.filter(c => c.type === ChannelType.GuildCategory).size;
    const boosts = g.premiumSubscriptionCount || 0;

    const embed = {
      title: `📋 ${g.name}`,
      thumbnail: { url: g.iconURL({ size: 256 }) || '' },
      color: 0x00d4ff,
      description: '━━━━━━━━━━━━━━━━━━━━━━━━\nInformación general del servidor.\n━━━━━━━━━━━━━━━━━━━━━━━━',
      fields: [
        { name: '🆔 ID', value: g.id, inline: true },
        { name: '👑 Dueño', value: owner ? owner.user.tag : '❌', inline: true },
        { name: '📅 Creado', value: `<t:${Math.floor(g.createdTimestamp / 1000)}:R>`, inline: true },
        { name: '👥 Miembros', value: `**${g.memberCount}**`, inline: true },
        { name: '💬 Canales', value: `📝 ${text} · 🔊 ${voice} · 📁 ${cats}`, inline: true },
        { name: '🚀 Boosts', value: `**${boosts}**${boosts >= 7 ? ' 🔥' : ''}`, inline: true },
        { name: '🎭 Roles', value: `**${g.roles.cache.size}**`, inline: true },
        { name: '😀 Emojis', value: `**${g.emojis.cache.size}**`, inline: true },
      ],
      footer: { text: 'Rox Security v1.0' },
      timestamp: new Date().toISOString(),
    };

    if (g.bannerURL()) embed.image = { url: g.bannerURL({ size: 512 }) };
    if (g.description) embed.fields.push({ name: '📝 Descripción', value: g.description, inline: false });

    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
  },
};
