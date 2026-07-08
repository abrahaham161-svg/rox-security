const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const database = require('../utils/database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('check')
    .setDescription('Verificar el estado de un usuario en el servidor')
    .addUserOption(opt => opt.setName('usuario').setDescription('El usuario a revisar').setRequired(true)),

  async execute(interaction) {
    const user = interaction.options.getUser('usuario');
    const member = await interaction.guild.members.fetch(user.id).catch(() => null);
    const config = database.get(interaction.guild.id) || {};

    const fields = [
      { name: '📌 ID', value: user.id, inline: true },
      { name: '📆 Registro', value: `<t:${Math.floor(user.createdTimestamp / 1000)}:R>`, inline: true },
      { name: '👤 En servidor', value: member ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>` : '❌ No está', inline: true },
      { name: '🔰 Roles', value: member ? (member.roles.cache.filter(r => r.id !== interaction.guild.id).map(r => r.name).join(', ') || 'Ninguno') : '—', inline: false },
      { name: '📜 Whitelist', value: (config.whitelist || []).includes(user.id) ? '✅ Sí está' : '❌ No está', inline: true },
    ];

    if (config.verifyEnabled) {
      fields.push({ name: '🛡️ Verificado', value: config.verifiedRole && member?.roles.cache.has(config.verifiedRole) ? '✅ Sí' : '⛔ No', inline: true });
    }

    const embed = {
      title: `🔍 ${user.tag}`,
      color: 0x00d4ff,
      fields,
      footer: { text: 'Rox Security v1.0' },
      timestamp: new Date().toISOString(),
    };

    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
  },
};
