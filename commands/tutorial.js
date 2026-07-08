const { SlashCommandBuilder, MessageFlags } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('tutorial')
    .setDescription('Guía rápida de cómo usar Rox Security'),

  async execute(interaction) {
    const steps = [
      '**1️⃣ Configuración inicial**\nUsa \`/setup\` o el botón ⚙️ en el panel para ajustar la protección.',
      '**2️⃣ Activar verificación**\nAsegúrate de que la verificación esté encendida en \`/settings\` o en el panel.',
      '**3️⃣ Whitelist**\nAgrega usuarios de confianza con \`/whitelist add\` o desde el panel 📜.',
      '**4️⃣ Canal de logs**\nConfigura un canal con \`/setup log_channel\` para ver los eventos.',
      '**5️⃣ Anti-raid automático**\nSi alguien entra muy rápido o con cuenta nueva, el bot lo expulsa/bloquea solo.',
      '**6️⃣ Moderación**\nUsa \`/punish\`, \`/lock\`, \`/clear\`, \`/nuke\` para mantener el orden.',
      '**7️⃣ Panel interactivo**\nUsa \`/panel\` para controlar todo con botones.',
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
