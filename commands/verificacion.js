const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { showVerPanel } = require('../utils/verificationManager');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('verificacion')
    .setDescription('Configurar el sistema de verificación del servidor')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    await showVerPanel(interaction);
  },
};
