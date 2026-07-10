const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const botAdmin = require('../utils/botAdmin');
const logger = require('../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('botadmin')
    .setDescription('Gestionar administradores del bot (solo owner del bot)'),

  async execute(interaction) {
    if (interaction.user.id !== botAdmin.OWNER_ID) {
      return interaction.reply({ content: '❌ Solo el owner del bot puede usar este comando.', flags: MessageFlags.Ephemeral });
    }
    await interaction.reply({ ...buildPanel(), flags: MessageFlags.Ephemeral });
  },

  async handleButton(i) {
    const id = i.customId;

    if (id === 'ba_refresh') {
      await i.update(buildPanel());
      return;
    }

    if (id === 'ba_add') {
      const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');
      const modal = new ModalBuilder().setCustomId('ba_add_modal').setTitle('Añadir administrador');
      modal.addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId('ba_id').setLabel('ID del usuario').setStyle(TextInputStyle.Short).setRequired(true).setMaxLength(19).setPlaceholder('Ej: 1133066682399739974'),
        ),
      );
      await i.showModal(modal);
      return;
    }

    if (id === 'ba_remove') {
      const admins = botAdmin.listAdmins();
      if (admins.length === 0) {
        await i.reply({ content: '❌ No hay administradores para quitar.', flags: MessageFlags.Ephemeral });
        return;
      }
      const { ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
      const row = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder().setCustomId('ba_remove_sel').setPlaceholder('Selecciona un admin...').addOptions(
          admins.map(id => ({ label: id, value: id })),
        ),
      );
      await i.update({ components: [row, new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('ba_refresh').setLabel('◀ Volver').setStyle(ButtonStyle.Secondary))] });
      return;
    }
  },

  async handleSelect(i) {
    if (i.customId === 'ba_remove_sel') {
      const id = i.values[0];
      if (id === botAdmin.OWNER_ID) {
        await i.update({ embeds: [{ title: '❌ No podés quitarte a vos mismo', description: 'El owner del bot no puede ser removido.', color: 0xff4444, footer: { text: 'Rox Security v1.0' } }], components: [new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('ba_refresh').setLabel('◀ Volver').setStyle(ButtonStyle.Secondary))] });
        return;
      }
      botAdmin.removeAdmin(id);
      await logger.sendLog(i.guild, 'info', '👑 Bot Admin -', `**${id}** quitado como admin del bot por ${i.user.tag}`);
      await i.update({ embeds: [{ title: '✅ Quitado', description: `\`${id}\` ya no es admin del bot.`, color: 0x00ff88, footer: { text: 'Rox Security v1.0' } }], components: [new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('ba_refresh').setLabel('◀ Volver').setStyle(ButtonStyle.Secondary))] });
    }
  },

  async handleModal(i) {
    if (i.customId === 'ba_add_modal') {
      const id = i.fields.getTextInputValue('ba_id').trim();
      if (!/^\d{17,19}$/.test(id)) {
        return i.reply({ content: '❌ Eso no parece una ID válida (17-19 dígitos).', flags: MessageFlags.Ephemeral });
      }
      if (id === botAdmin.OWNER_ID) {
        return i.reply({ content: '❌ El owner del bot ya tiene acceso total.', flags: MessageFlags.Ephemeral });
      }
      if (botAdmin.addAdmin(id)) {
        await logger.sendLog(i.guild, 'info', '👑 Bot Admin +', `**${id}** agregado como admin del bot por ${i.user.tag}`);
        await i.reply({ embeds: [{ title: '✅ Administrador agregado', description: `\`${id}\` ahora puede configurar el bot en todos los servidores.`, color: 0x00ff88, footer: { text: 'Rox Security v1.0' } }], flags: MessageFlags.Ephemeral });
      } else {
        await i.reply({ content: '⚠️ Ese usuario ya es administrador del bot.', flags: MessageFlags.Ephemeral });
      }
    }
  },
};

function buildPanel() {
  const admins = botAdmin.listAdmins();
  return {
    embeds: [{
      title: '👑 BOT ADMINISTRADORES',
      description: '━━━━━━━━━━━━━━━━━━━━━━━━\nLos admins del bot pueden usar cualquier comando en todos los servidores, sin necesidad de ser dueño del servidor ni tener permisos.\n━━━━━━━━━━━━━━━━━━━━━━━━',
      color: 0xffd700,
      fields: [
        { name: '🤖 Owner del bot', value: `\`${botAdmin.OWNER_ID}\``, inline: false },
        { name: '👥 Administradores', value: admins.length ? admins.map(id => `\`${id}\``).join('\n') : '❌ Ninguno', inline: false },
      ],
      footer: { text: 'Rox Security v1.0' },
      timestamp: new Date().toISOString(),
    }],
    components: [
      new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('ba_add').setLabel('➕ Añadir admin').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('ba_remove').setLabel('➖ Quitar admin').setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId('ba_refresh').setLabel('🔄 Actualizar').setStyle(ButtonStyle.Primary),
      ),
    ],
  };
}
