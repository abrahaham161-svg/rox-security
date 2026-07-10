const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const database = require('../utils/database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('status')
    .setDescription('Ver el estado de la protección'),

  async execute(interaction) {
    if (interaction.user.id !== interaction.guild.ownerId) {
      return interaction.reply({ content: '❌ Solo el dueño del servidor puede usar este comando.', flags: MessageFlags.Ephemeral });
    }
    let config = database.get(interaction.guild.id);
    if (!config) {
      config = { maxJoinsPerMinute:5, maxJoinsPer10Seconds:3, accountAgeMinutes:15, action:'kick', verifyEnabled:true, whitelist:[], logs:[], guildName:interaction.guild.name };
      database.set(interaction.guild.id, config);
    }

    const on = config.verifyEnabled !== false;
    await interaction.reply({ embeds: [{
      title: '📊 Estado',
      color: on ? 0x00ff88 : 0xffaa00,
      fields: [
        { name: '👥 Miembros', value: `**${interaction.guild.memberCount}**`, inline: true },
        { name: '🛡️ Protección', value: on ? '✅ Activa' : '⛔ En pausa', inline: true },
        { name: '📋 Registros', value: `${(config.logs||[]).length} eventos`, inline: true },
        { name: '📜 Whitelist', value: `${(config.whitelist||[]).length} usuarios`, inline: true },
        { name: '⚙️ Acción', value: `**${config.action||'kick'}**`, inline: true },
        { name: '💡 Consejo', value: 'Usa `/panel` para el menú interactivo', inline: false },
      ],
      footer: { text: 'Rox Security v1.0' },
      timestamp: new Date().toISOString(),
    }], flags: MessageFlags.Ephemeral });
  },
};
