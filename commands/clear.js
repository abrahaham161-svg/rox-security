const { PermissionFlagsBits, SlashCommandBuilder, MessageFlags } = require('discord.js');
const { canAccess } = require('../utils/permissions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('clear')
    .setDescription('Borrar mensajes del canal')
    .addIntegerOption(opt => opt.setName('cantidad').setDescription('Mensajes a borrar (1-100)').setRequired(true).setMinValue(1).setMaxValue(100)),

  async execute(interaction) {
    if (!canAccess(interaction, { permission: PermissionFlagsBits.ManageMessages })) {
      return interaction.reply({ content: '❌ No tenés permiso para usar este comando.', flags: MessageFlags.Ephemeral });
    }
    const amount = interaction.options.getInteger('cantidad');
    const messages = await interaction.channel.bulkDelete(amount, true).catch(() => null);

    if (!messages) {
      await interaction.reply({ embeds: [{ title: '❌ Error', description: '━━━━━━━━━━━━━━━━━━━━━━━━\nNo pude borrar mensajes.\nLos mensajes de más de **14 días** no se pueden borrar así.\n━━━━━━━━━━━━━━━━━━━━━━━━', color: 0xff4444, footer: { text: 'Rox Security v1.0' } }], flags: MessageFlags.Ephemeral });
      return;
    }

    await interaction.reply({
      embeds: [{
        title: '🧹 Mensajes Borrados',
        description: '━━━━━━━━━━━━━━━━━━━━━━━━\nSe borraron **' + messages.size + '** mensajes de <#' + interaction.channel.id + '>.\n━━━━━━━━━━━━━━━━━━━━━━━━',
        color: 0x00d4ff,
        footer: { text: 'Rox Security v1.0' },
        timestamp: new Date().toISOString(),
      }],
      flags: MessageFlags.Ephemeral,
    });
  },
};
