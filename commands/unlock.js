const { PermissionFlagsBits, SlashCommandBuilder, MessageFlags } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('unlock')
    .setDescription('Desbloquear un canal para que todos puedan escribir')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .addChannelOption(opt => opt.setName('canal').setDescription('El canal a desbloquear (por defecto este)')),

  async execute(interaction) {
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
