const { PermissionFlagsBits, SlashCommandBuilder, MessageFlags } = require('discord.js');
const logger = require('../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('idunban')
    .setDescription('Desbloquear a alguien por su ID')
    .addStringOption(opt => opt.setName('id').setDescription('ID del usuario').setRequired(true)),

  async execute(interaction) {
    if (!interaction.memberPermissions.has(PermissionFlagsBits.BanMembers) && interaction.user.id !== interaction.guild.ownerId) {
      return interaction.reply({ content: '❌ No tenés permiso para usar este comando.', flags: MessageFlags.Ephemeral });
    }
    const id = interaction.options.getString('id');

    if (!/^\d{17,19}$/.test(id)) {
      await interaction.reply({ embeds: [{ title: '❌', description: 'Eso no parece una ID válida', color: 0xff4444, footer: { text: 'Rox Security v1.0' } }], flags: MessageFlags.Ephemeral });
      return;
    }

    try {
      await interaction.guild.bans.remove(id, `[Rox Security] Desbaneado por ${interaction.user.tag}`);
      await logger.sendLog(interaction.guild, 'success', '✅ ID Unban', `**${id}** desbaneado por ${interaction.user.tag}`);
      await interaction.reply({
        embeds: [{
          title: '✅ DESBANEADO',
          description: `Usuario \`${id}\` desbloqueado`,
          color: 0x00ff88,
          footer: { text: 'Rox Security v1.0' },
          timestamp: new Date().toISOString(),
        }],
        flags: MessageFlags.Ephemeral,
      });
    } catch (e) {
      await interaction.reply({ embeds: [{ title: '❌', description: `No pudo desbanear: ${e.message}`, color: 0xff4444, footer: { text: 'Rox Security v1.0' } }], flags: MessageFlags.Ephemeral });
    }
  },
};
