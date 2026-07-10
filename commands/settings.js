const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const database = require('../utils/database');
const { canAccess } = require('../utils/permissions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('settings')
    .setDescription('Ver toda la configuración del servidor'),

  async execute(interaction) {
    if (!canAccess(interaction, { ownerOnly: true })) {
      return interaction.reply({ content: '❌ Solo el dueño del servidor puede usar este comando.', flags: MessageFlags.Ephemeral });
    }
    const config = database.get(interaction.guild.id) || {};
    const on = config.verifyEnabled !== false;

    const fields = [
      { name: '🛡️ Protección', value: on ? '✅ Activada' : '⛔ En pausa', inline: true },
      { name: '👢 Acción anti-raid', value: `**${config.action || 'kick'}**`, inline: true },
      { name: '📢 Canal de logs', value: config.logChannel ? `<#${config.logChannel}>` : '❌ No', inline: true },
      { name: '📜 Whitelist', value: `**${(config.whitelist || []).length}** usuarios`, inline: true },
      { name: '📋 Eventos guardados', value: `**${(config.logs || []).length}**`, inline: true },
    ];

    if (config.verifyEnabled) {
      fields.splice(3, 0, { name: '🎖️ Rol verificado', value: config.verifiedRole ? `<@&${config.verifiedRole}>` : '❌ No', inline: true });
    }

    await interaction.reply({
      embeds: [{
        title: '⚙️ CONFIGURACIÓN COMPLETA',
        color: 0x00d4ff,
        fields,
        footer: { text: 'Rox Security v1.0' },
        timestamp: new Date().toISOString(),
      }],
      flags: MessageFlags.Ephemeral,
    });
  },
};
