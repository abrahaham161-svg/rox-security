const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { showVerPanel } = require('../utils/verificationManager');
const { canAccess } = require('../utils/permissions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('verificacion')
    .setDescription('Configurar el sistema de verificación del servidor'),

  async execute(interaction) {
    if (!canAccess(interaction, { ownerOnly: true })) {
      return interaction.reply({ content: '❌ Solo el dueño del servidor puede usar este comando.', flags: MessageFlags.Ephemeral });
    }
    await showVerPanel(interaction);
  },
};
