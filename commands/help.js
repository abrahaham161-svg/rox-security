const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Ver los comandos disponibles'),

  async execute(interaction) {
    const embed = {
      title: '🛡️ Rox Security',
      description: '━━━━━━━━━━━━━━━━━━━━━━━━\n**Sistema de protección para tu servidor**\n━━━━━━━━━━━━━━━━━━━━━━━━\n\nUsa `/panel` para abrir el panel de control.\nUsa `/verificacion` para configurar la verificación.',
      color: 0x00d4ff,
      footer: { text: 'Rox Security v1.0' },
      timestamp: new Date().toISOString(),
    };

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('hp_sg').setLabel('🛡️ Seguridad').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('hp_md').setLabel('👮 Moderación').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('hp_vr').setLabel('✅ Verificación').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId('hp_ut').setLabel('🔧 Utilidades').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('hp_td').setLabel('📋 Todos').setStyle(ButtonStyle.Secondary),
    );

    await interaction.reply({ embeds: [embed], components: [row], flags: MessageFlags.Ephemeral });
  },
};
