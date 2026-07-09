const { PermissionFlagsBits, SlashCommandBuilder, MessageFlags } = require('discord.js');
const logger = require('../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('idban')
    .setDescription('Bloquear a alguien por su ID (no necesita estar en el servidor)')
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .addStringOption(opt => opt.setName('id').setDescription('ID del usuario').setRequired(true))
    .addStringOption(opt => opt.setName('razon').setDescription('Motivo del bloqueo')),

  async execute(interaction) {
    const id = interaction.options.getString('id');
    const reason = interaction.options.getString('razon') || 'Sin motivo';

    if (!/^\d{17,19}$/.test(id)) {
      await interaction.reply({ embeds: [{ title: '❌', description: 'Eso no parece una ID válida\n📌 Una ID tiene 17-19 números', color: 0xff4444, footer: { text: 'Rox Security v1.0' } }], flags: MessageFlags.Ephemeral });
      return;
    }

    try {
      await interaction.guild.bans.create(id, { reason: `[Rox Security] ${reason}` });
      await logger.sendLog(interaction.guild, 'punish', '🔨 ID Ban', `**${id}** baneado por ${interaction.user.tag}\n**Motivo:** ${reason}`);
      await interaction.reply({
        embeds: [{
          title: '🔨 BANEADO POR ID',
          description: `Usuario \`${id}\` bloqueado\n**Motivo:** ${reason}`,
          color: 0xff4444,
          footer: { text: 'Rox Security v1.0' },
          timestamp: new Date().toISOString(),
        }],
        flags: MessageFlags.Ephemeral,
      });
    } catch (e) {
      await interaction.reply({ embeds: [{ title: '❌', description: `No pude banear esa ID\n📌 ${e.message}`, color: 0xff4444, footer: { text: 'Rox Security v1.0' } }], flags: MessageFlags.Ephemeral });
    }
  },
};
