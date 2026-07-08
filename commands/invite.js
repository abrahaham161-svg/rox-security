const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('invite')
    .setDescription('Invitar a Rox Security a otros servidores'),

  async execute(interaction) {
    const inviteUrl = `https://discord.com/api/oauth2/authorize?client_id=${interaction.client.user.id}&permissions=8&scope=bot%20applications.commands`;

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setLabel('📨 Invitar Rox Security').setStyle(ButtonStyle.Link).setURL(inviteUrl),
    );

    await interaction.reply({
      embeds: [{
        title: '📨 INVITAR ROX SECURITY',
        description: '¿Quieres protegerte en otro servidor?\nPresiona el botón de abajo para invitarme.',
        color: 0x00d4ff,
        footer: { text: 'Rox Security v1.0' },
        timestamp: new Date().toISOString(),
      }],
      components: [row],
      flags: MessageFlags.Ephemeral,
    });
  },
};
