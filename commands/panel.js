const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { mainPanel } = require('../utils/panelHandler');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('panel')
    .setDescription('Abre el panel de control interactivo'),

  async execute(interaction) {
    if (interaction.user.id !== interaction.guild.ownerId) {
      return interaction.reply({ content: '❌ Solo el dueño del servidor puede usar este comando.', flags: MessageFlags.Ephemeral });
    }
    await interaction.reply({ ...mainPanel(interaction.guild), flags: MessageFlags.Ephemeral });
  },
};
