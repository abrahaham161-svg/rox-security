const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('valoraciones')
    .setDescription('Ver todas las valoraciones de mis servicios'),

  async execute(interaction) {
    const dataDir = path.join(__dirname, '..', 'data');
    const file = path.join(dataDir, 'reviews.json');
    let reviews = [];
    try {
      if (fs.existsSync(file)) reviews = JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch {}

    if (!reviews.length) {
      return interaction.reply({
        embeds: [{
          title: '⭐ Valoraciones',
          description: 'Todavía no hay valoraciones.\nSé el primero en dejar una.',
          color: 0x00ffc8,
          footer: { text: 'Rox Security v1.0' },
        }],
        flags: MessageFlags.Ephemeral,
      });
    }

    const perPage = 5;
    let page = 0;
    const totalPages = Math.ceil(reviews.length / perPage);

    function renderEmbed(p) {
      const start = p * perPage;
      const items = reviews.slice(start, start + perPage);
      const avg = (reviews.reduce((s, r) => s + r.stars, 0) / reviews.length).toFixed(1);
      const starsTotal = '⭐'.repeat(Math.round(parseFloat(avg)));

      return {
        embeds: [{
          title: '⭐ Valoraciones',
          description: `**${reviews.length} valoraciones** · ${starsTotal} ${avg}/5`,
          color: 0x00ffc8,
          fields: items.map(r => ({
            name: `${'⭐'.repeat(r.stars)} ${r.name}`,
            value: r.text || '*Sin comentario*',
          })),
          footer: { text: `Página ${p + 1}/${totalPages} · Rox Security v1.0` },
        }],
      };
    }

    function renderRow(p) {
      return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('prev')
          .setLabel('◀')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(p === 0),
        new ButtonBuilder()
          .setCustomId('next')
          .setLabel('▶')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(p === totalPages - 1),
      );
    }

    const msg = await interaction.reply({
      ...renderEmbed(page),
      components: [renderRow(page)],
      fetchReply: true,
    });

    const collector = msg.createMessageComponentCollector({ time: 60000 });
    collector.on('collect', async (i) => {
      if (i.user.id !== interaction.user.id) {
        return i.reply({ content: 'No puedes interactuar con este mensaje.', flags: MessageFlags.Ephemeral });
      }
      if (i.customId === 'prev' && page > 0) page--;
      if (i.customId === 'next' && page < totalPages - 1) page++;
      await i.update({ ...renderEmbed(page), components: [renderRow(page)] });
    });
    collector.on('end', async () => {
      try { await msg.edit({ components: [] }); } catch {}
    });
  },
};
