const { SlashCommandBuilder, MessageFlags } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Ver la latencia del bot'),

  async execute(interaction) {
    const ws = Math.round(interaction.client.ws.ping);
    let color = 0x00ff88;
    let emoji = '🟢';
    if (ws > 300) { color = 0xff4444; emoji = '🔴'; }
    else if (ws > 150) { color = 0xffaa00; emoji = '🟡'; }

    await interaction.reply({
      embeds: [{
        title: '🏓 Pong!',
        description: '━━━━━━━━━━━━━━━━━━━━━━━━\nLatencia del bot.\n━━━━━━━━━━━━━━━━━━━━━━━━',
        color,
        fields: [
          { name: `${emoji} Websocket`, value: `**${ws}ms**`, inline: true },
        ],
        footer: { text: 'Rox Security v1.0' },
        timestamp: new Date().toISOString(),
      }],
      flags: MessageFlags.Ephemeral,
    });
  },
};
