const { SlashCommandBuilder, MessageFlags } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('tutorial')
    .setDescription('Guía rápida de cómo usar Rox Security'),

  async execute(interaction) {
    const steps = [
      '**1️⃣ Anti-Raid**\nUsa \`/antiraid\` para configurar la acción al detectar joins masivos.',
      '**2️⃣ Anti-Nuke**\nUsa \`/antinuke\` para limitar acciones destructivas por minuto.',
      '**3️⃣ Whitelist**\nAgrega usuarios de confianza con \`/whitelist\` o desde el panel 📜.',
      '**4️⃣ Anti-raid automático**\nSi alguien entra muy rápido o con cuenta nueva, el bot lo expulsa/bloquea solo.',
      '**5️⃣ Moderación**\nUsa \`/ban\`, \`/kick\`, \`/idban\`, \`/lock\`, \`/clear\`, \`/nuke\` para mantener el orden.',
      '**6️⃣ Panel interactivo**\nUsa \`/panel\` para controlar todo con botones.',
    ];

    await interaction.reply({
      embeds: [{
        title: '📖 TUTORIAL - ROX SECURITY',
        description: steps.join('\n\n'),
        color: 0x00d4ff,
        footer: { text: 'Rox Security v1.0' },
        timestamp: new Date().toISOString(),
      }],
      flags: MessageFlags.Ephemeral,
    });
  },
};
