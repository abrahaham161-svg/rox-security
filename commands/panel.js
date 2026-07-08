const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { mainPanel } = require('../utils/panelHandler');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('panel')
    .setDescription('Abre el panel de control interactivo'),

  async execute(interaction) {
    await interaction.reply({ ...mainPanel(interaction.guild), flags: MessageFlags.Ephemeral });
  },
};
