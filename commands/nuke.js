const { PermissionFlagsBits, SlashCommandBuilder, MessageFlags } = require('discord.js');
const { canAccess } = require('../utils/permissions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('nuke')
    .setDescription('Clonar y eliminar un canal (lo deja como nuevo)')
    .addChannelOption(opt => opt.setName('canal').setDescription('El canal a nukear (por defecto este)')),

  async execute(interaction) {
    if (!canAccess(interaction, { permission: PermissionFlagsBits.ManageChannels })) {
      return interaction.reply({ content: '❌ No tenés permiso para usar este comando.', flags: MessageFlags.Ephemeral });
    }
    if (!interaction.guild) {
      await interaction.reply({ embeds: [{ title: '❌ Error', description: '━━━━━━━━━━━━━━━━━━━━━━━━\nEsto solo funciona en un servidor.\n━━━━━━━━━━━━━━━━━━━━━━━━', color: 0xff4444, footer: { text: 'Rox Security v1.0' } }], flags: MessageFlags.Ephemeral });
      return;
    }

    const channel = interaction.options.getChannel('canal') || interaction.channel;
    if (!channel.isTextBased()) {
      await interaction.reply({ embeds: [{ title: '❌ Error', description: '━━━━━━━━━━━━━━━━━━━━━━━━\nSolo canales de texto.\n━━━━━━━━━━━━━━━━━━━━━━━━', color: 0xff4444, footer: { text: 'Rox Security v1.0' } }], flags: MessageFlags.Ephemeral });
      return;
    }

    try {
      await interaction.reply({ embeds: [{ title: '💣 Nukear...', description: '━━━━━━━━━━━━━━━━━━━━━━━━\nDestruyendo <#' + channel.id + '>...\n━━━━━━━━━━━━━━━━━━━━━━━━', color: 0xff6600, footer: { text: 'Rox Security v1.0' } }], flags: MessageFlags.Ephemeral });

      const clone = await channel.clone({ reason: `Nuke por ${interaction.user.tag}` });
      await channel.delete(`Nuke por ${interaction.user.tag}`);
      await clone.send({ embeds: [{ title: '💣 Canal Nukeado', description: '━━━━━━━━━━━━━━━━━━━━━━━━\nEste canal fue limpiado por **' + interaction.user.tag + '**.\n━━━━━━━━━━━━━━━━━━━━━━━━', color: 0xff4444, footer: { text: 'Rox Security v1.0' }, timestamp: new Date().toISOString() }] });
    } catch (e) {
      console.error('Error en nuke:', e);
    }
  },
};
