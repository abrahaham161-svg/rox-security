const { MessageFlags } = require('discord.js');
const panel = require('../utils/panelHandler');

module.exports = {
  name: 'interactionCreate',
  async execute(interaction) {
    if (interaction.isChatInputCommand()) {
      const cmd = interaction.client.commands.get(interaction.commandName);
      if (!cmd) return;
      try {
        await cmd.execute(interaction);
      } catch (e) {
        console.error(`Error en /${interaction.commandName}:`, e);
        const r = { content: 'Error al ejecutar el comando.', flags: MessageFlags.Ephemeral };
        if (interaction.replied || interaction.deferred) await interaction.followUp(r).catch(() => {});
        else await interaction.reply(r).catch(() => {});
      }
      return;
    }

    if (interaction.isButton() || interaction.isAnySelectMenu() || interaction.isModalSubmit()) {
      try {
        await panel.handle(interaction);
      } catch (e) {
        console.error('Error en panel:', e);
        if (!interaction.replied && !interaction.deferred) {
          await interaction.reply({ content: 'Error al procesar la interacción.', flags: MessageFlags.Ephemeral }).catch(() => {});
        }
      }
      return;
    }
  },
};
