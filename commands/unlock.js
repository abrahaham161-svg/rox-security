const { PermissionFlagsBits, SlashCommandBuilder, MessageFlags } = require('discord.js');
const { canAccess } = require('../utils/permissions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('unlock')
    .setDescription('Desbloquear un canal para que todos puedan escribir')
    .addChannelOption(opt => opt.setName('canal').setDescription('El canal a desbloquear (por defecto este)')),

  async execute(interaction) {
    if (!canAccess(interaction, { permission: PermissionFlagsBits.ManageChannels })) {
      return interaction.reply({ content: '❌ No tenés permiso para usar este comando.', flags: MessageFlags.Ephemeral });
    }
    const channel = interaction.options.getChannel('canal') || interaction.channel;
    if (!channel.isTextBased()) {
      await interaction.reply({ embeds: [{ title: '❌ Error', description: '━━━━━━━━━━━━━━━━━━━━━━━━\nSolo canales de texto.\n━━━━━━━━━━━━━━━━━━━━━━━━', color: 0xff4444, footer: { text: 'Rox Security v1.0' } }], flags: MessageFlags.Ephemeral });
      return;
    }

    await channel.permissionOverwrites.edit(interaction.guild.roles.everyone, { SendMessages: null }).catch(() => null);
    await interaction.reply({
      embeds: [{
        title: '🔓 Canal Desbloqueado',
        description: '━━━━━━━━━━━━━━━━━━━━━━━━\n<#' + channel.id + '> ahora está **abierto**.\nTodos pueden enviar mensajes.\n━━━━━━━━━━━━━━━━━━━━━━━━',
        color: 0x00ff88,
        footer: { text: 'Rox Security v1.0' },
        timestamp: new Date().toISOString(),
      }],
      flags: MessageFlags.Ephemeral,
    });
  },
};
