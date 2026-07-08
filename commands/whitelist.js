const { PermissionFlagsBits, SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const { wlMenu } = require('../utils/panelHandler');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('whitelist')
    .setDescription('Gestionar whitelist de usuarios y canales')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    await interaction.reply({ ...wlMenu(interaction.guild, interaction.client), flags: MessageFlags.Ephemeral });
  },
};
