const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { showVerPanel } = require('../utils/verificationManager');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('verificacion')
    .setDescription('Configurar el sistema de verificación del servidor'),

  async execute(interaction) {
    if (interaction.user.id !== interaction.guild.ownerId) {
      return interaction.reply({ content: '❌ Solo el dueño del servidor puede usar este comando.', flags: MessageFlags.Ephemeral });
    }
    await showVerPanel(interaction);
  },
};
