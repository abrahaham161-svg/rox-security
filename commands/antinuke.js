const { PermissionFlagsBits, SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, MessageFlags } = require('discord.js');
const db = require('../utils/database');
const antiNuke = require('../utils/antiNuke');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('antinuke')
    .setDescription('Protección contra acciones masivas (anti-nuke)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    await interaction.reply({ ...buildMenu(interaction.guild), flags: MessageFlags.Ephemeral });
  },

  async handleButton(i) {
    const id = i.customId;

    if (id === 'an_refresh') {
      await i.update(buildMenu(i.guild));
      return;
    }

    if (id.startsWith('an_action_')) {
      const actionType = id.replace('an_action_', '');
      const info = antiNuke.getActionInfo(actionType);
      if (!info) return i.update(buildMenu(i.guild));

      const config = antiNuke.getConfig(i.guild.id);
      const action = config[actionType] || { enabled: false, limit: 1 };

      await i.update(buildActionPanel(i.guild, actionType, info, action));
      return;
    }

    if (id.startsWith('an_toggle_')) {
      const actionType = id.replace('an_toggle_', '');
      const c = db.get(i.guild.id) || {};
      if (!c.antiNuke) c.antiNuke = {};
      if (!c.antiNuke[actionType]) c.antiNuke[actionType] = { enabled: false, limit: 1 };
      c.antiNuke[actionType].enabled = !c.antiNuke[actionType].enabled;
      db.set(i.guild.id, c);

      const info = antiNuke.getActionInfo(actionType);
      const action = c.antiNuke[actionType];
      await i.update(buildActionPanel(i.guild, actionType, info, action));
      return;
    }

    if (id.startsWith('an_limit_')) {
      const actionType = id.replace('an_limit_', '');
      const modal = new ModalBuilder().setCustomId('an_limit_m_' + actionType).setTitle('Límite por minuto');
      modal.addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId('an_limit_v').setLabel('Acciones por minuto (1-20)').setStyle(TextInputStyle.Short).setRequired(true).setMaxLength(2).setPlaceholder('Ej: 3'),
        ),
      );
      await i.showModal(modal);
      return;
    }

    if (id === 'an_main') {
      await i.update(buildMenu(i.guild));
    }
  },

  async handleModal(i) {
    const id = i.customId;
    if (!id.startsWith('an_limit_m_')) return;
    const actionType = id.replace('an_limit_m_', '');

    const val = parseInt(i.fields.getTextInputValue('an_limit_v'));
    if (isNaN(val) || val < 1 || val > 20) {
      return i.reply({ content: '❌ Ingresá un número entre 1 y 20.', flags: MessageFlags.Ephemeral });
    }

    const c = db.get(i.guild.id) || {};
    if (!c.antiNuke) c.antiNuke = {};
    if (!c.antiNuke[actionType]) c.antiNuke[actionType] = { enabled: false, limit: 1 };
    c.antiNuke[actionType].limit = val;
    db.set(i.guild.id, c);

    await i.reply({
      embeds: [{
        title: '✅ Límite actualizado',
        description: '━━━━━━━━━━━━━━━━━━━━━━━━\n**' + (antiNuke.getActionInfo(actionType)?.label || actionType) + '**\nAhora: **' + val + '** por minuto\n━━━━━━━━━━━━━━━━━━━━━━━━',
        color: 0x00ff88,
        footer: { text: 'Rox Security v1.0' },
      }],
      flags: MessageFlags.Ephemeral,
    });
  },
};

function buildMenu(guild) {
  const config = antiNuke.getConfig(guild.id);
  const categories = [
    { name: '📁 Canales', keys: ['createChannel', 'deleteChannel', 'editChannel'] },
    { name: '🎭 Roles', keys: ['createRole', 'deleteRole', 'editRole'] },
    { name: '😀 Emojis', keys: ['createEmoji', 'deleteEmoji'] },
    { name: '👥 Usuarios', keys: ['kick', 'ban', 'unban'] },
    { name: '🔗 Webhooks', keys: ['editWebhook'] },
  ];

  const lines = [];
  for (const cat of categories) {
    const items = cat.keys.map(k => {
      const info = antiNuke.getActionInfo(k);
      const a = config[k] || {};
      if (info.premium) return '🔒 ' + info.label;
      const status = a.enabled !== false ? '✅' : '⛔';
      return status + ' ' + info.label + ' — ' + (a.limit || info.defaultLimit) + '/min';
    });
    lines.push('**' + cat.name + '**\n' + items.join('\n'));
  }

  const actionList = Object.keys(antiNuke.ACTIONS);
  const rows = [];
  let row = [];
  for (const key of actionList) {
    const info = antiNuke.getActionInfo(key);
    const label = info.label.substring(0, 20);
    row.push(new ButtonBuilder()
      .setCustomId('an_action_' + key)
      .setLabel(label)
      .setStyle(info.premium ? ButtonStyle.Secondary : ButtonStyle.Primary)
      .setDisabled(info.premium));
    if (row.length === 5) {
      rows.push(new ActionRowBuilder().addComponents(row));
      row = [];
    }
  }
  if (row.length) rows.push(new ActionRowBuilder().addComponents(row));

  rows.push(new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('an_refresh').setLabel('🔄 Actualizar').setStyle(ButtonStyle.Primary),
  ));

  return {
    embeds: [{
      title: '🛡️ ANTI-NUKE',
      description: '━━━━━━━━━━━━━━━━━━━━━━━━\nLímites de acciones por usuario por minuto.\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n' + lines.join('\n\n'),
      color: 0x00d4ff,
      footer: { text: 'Rox Security v1.0' },
      timestamp: new Date().toISOString(),
    }],
    components: rows,
  };
}

function buildActionPanel(guild, actionType, info, action) {
  const isPremium = info.premium;

  if (isPremium) {
    return {
      embeds: [{
        title: info.emoji + ' ' + info.label + ' Premium',
        description: '━━━━━━━━━━━━━━━━━━━━━━━━\n'
          + '🔒 **Necesitas Premium para usar esta función**\n'
          + '━━━━━━━━━━━━━━━━━━━━━━━━\n\n'
          + 'Actualiza a Premium para desbloquear esta protección.',
        color: 0xffaa00,
        footer: { text: 'Rox Security v1.0' },
      }],
      components: [
        new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('an_main').setLabel('◀ Volver').setStyle(ButtonStyle.Secondary),
        ),
      ],
    };
  }

  const on = action.enabled !== false;
  return {
    embeds: [{
      title: info.emoji + ' ' + info.label + ' Free',
      description: '━━━━━━━━━━━━━━━━━━━━━━━━\n'
        + 'Limita el número máximo de ' + info.label.toLowerCase() + ' que podrá realizar un usuario por minuto.\n'
        + '━━━━━━━━━━━━━━━━━━━━━━━━',
      color: on ? 0x00ff88 : 0xff4444,
      fields: [
        { name: '📊 Estado sistema', value: on ? '✅ **Activado**' : '⛔ **Desactivado**', inline: true },
        { name: '⚡ Acciones por minuto', value: '**' + (action.limit || info.defaultLimit) + '**', inline: true },
      ],
      footer: { text: 'Rox Security v1.0' },
      timestamp: new Date().toISOString(),
    }],
    components: [
      new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('an_toggle_' + actionType).setLabel(on ? '⛔ Desactivar' : '✅ Activar').setStyle(on ? ButtonStyle.Danger : ButtonStyle.Success),
        new ButtonBuilder().setCustomId('an_limit_' + actionType).setLabel('⚡ Cambiar límite').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('an_main').setLabel('◀ Volver').setStyle(ButtonStyle.Secondary),
      ),
    ],
  };
}
