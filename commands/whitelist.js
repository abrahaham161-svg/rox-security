const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const { wlMenu } = require('../utils/panelHandler');
const { canAccess } = require('../utils/permissions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('whitelist')
    .setDescription('Gestionar la lista blanca de usuarios y canales'),

  async execute(interaction) {
    if (!canAccess(interaction, { ownerOnly: true })) {
      return interaction.reply({ content: '❌ Solo el dueño del servidor puede usar este comando.', flags: MessageFlags.Ephemeral });
    }
    await interaction.reply({ ...wlMenu(interaction.guild, interaction.client), flags: MessageFlags.Ephemeral });
  },
};
