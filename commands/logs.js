const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const database = require('../utils/database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('logs')
    .setDescription('Ver los últimos eventos de seguridad'),

  async execute(interaction) {
    if (interaction.user.id !== interaction.guild.ownerId) {
      return interaction.reply({ content: '❌ Solo el dueño del servidor puede usar este comando.', flags: MessageFlags.Ephemeral });
    }
    const config = database.get(interaction.guild.id) || { logs: [] };
    const logs = config.logs || [];

    if (!logs.length) {
      await interaction.reply({ embeds: [{ title:'📋 Registros', description:'No hay eventos aún.\nCuando pase algo, aparecerá aquí.', color:0x00d4ff, footer:{text:'Rox Security v1.0'} }], flags: MessageFlags.Ephemeral });
      return;
    }

    const icons = { raid:'🚨', punish:'🔨', info:'📩', warn:'⚠️', error:'❌', success:'✅' };
    const desc = logs.slice(-10).reverse().map(l => `${icons[l.type]||'📋'} ${l.title}`).join('\n');

    await interaction.reply({ embeds: [{
      title: '📋 Registros',
      description: desc,
      color: 0x00d4ff,
      footer: { text: 'Rox Security v1.0' },
      timestamp: new Date().toISOString(),
    }], flags: MessageFlags.Ephemeral });
  },
};
