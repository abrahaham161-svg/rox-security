const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, MessageFlags } = require('discord.js');
const db = require('../utils/database');
const antiNuke = require('../utils/antiNuke');
const log = require('../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('antinuke')
    .setDescription('Protección contra acciones masivas (anti-nuke)'),

  async execute(interaction) {
    if (interaction.user.id !== interaction.guild.ownerId) {
      return interaction.reply({ content: '❌ Solo el dueño del servidor puede usar este comando.', flags: MessageFlags.Ephemeral });
    }
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
      const info = antiNuke.getAction(actionType);
      if (!info) return i.update(buildMenu(i.guild));

      const config = antiNuke.getConfig(i.guild.id);
      const action = config[actionType] || { enabled: false, limit: 1, punishment: 'kick' };

      await i.update(buildActionPanel(i.guild, actionType, info, action));
      return;
    }

    if (id.startsWith('an_toggle_')) {
      const actionType = id.replace('an_toggle_', '');
      const c = db.get(i.guild.id) || {};
      if (!c.antiNuke) c.antiNuke = {};
      if (!c.antiNuke[actionType]) c.antiNuke[actionType] = { enabled: false, limit: 1, punishment: 'kick' };
      c.antiNuke[actionType].enabled = !c.antiNuke[actionType].enabled;
      db.set(i.guild.id, c);

      const info = antiNuke.getAction(actionType);
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

    if (id.startsWith('an_punish_')) {
      const actionType = id.replace('an_punish_', '');
      const c = db.get(i.guild.id) || {};
      if (!c.antiNuke) c.antiNuke = {};
      if (!c.antiNuke[actionType]) c.antiNuke[actionType] = { enabled: false, limit: 1, punishment: 'kick' };

      const idx = antiNuke.PUNISHMENTS.indexOf(c.antiNuke[actionType].punishment || 'kick');
      c.antiNuke[actionType].punishment = antiNuke.PUNISHMENTS[(idx + 1) % antiNuke.PUNISHMENTS.length];
      db.set(i.guild.id, c);

      const info = antiNuke.getAction(actionType);
      const action = c.antiNuke[actionType];
      await i.update(buildActionPanel(i.guild, actionType, info, action));
      return;
    }

    if (id.startsWith('an_timeout_')) {
      const actionType = id.replace('an_timeout_', '');
      const c = db.get(i.guild.id) || {};
      const cur = (c.antiNuke?.[actionType]?.timeoutDuration || 600000) / 60000;
      const modal = new ModalBuilder().setCustomId('an_timeout_m_' + actionType).setTitle('⏱️ Duración de aislamiento');
      modal.addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId('an_timeout_v').setLabel('Minutos (1-40320, ej: 10)').setStyle(TextInputStyle.Short).setRequired(true).setMaxLength(5).setPlaceholder('Ej: 10').setValue(String(cur)),
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

    if (id.startsWith('an_limit_m_')) {
      const actionType = id.replace('an_limit_m_', '');
      const val = parseInt(i.fields.getTextInputValue('an_limit_v'));
      if (isNaN(val) || val < 1 || val > 20) {
        return i.reply({ content: '❌ Ingresá un número entre 1 y 20.', flags: MessageFlags.Ephemeral });
      }
      const c = db.get(i.guild.id) || {};
      if (!c.antiNuke) c.antiNuke = {};
      if (!c.antiNuke[actionType]) c.antiNuke[actionType] = { enabled: false, limit: 1, punishment: 'kick' };
      c.antiNuke[actionType].limit = val;
      db.set(i.guild.id, c);
      await log.sendLog(i.guild, 'info', '⚡ Límite anti-nuke', `**${antiNuke.getAction(actionType)?.label}** → ${val}/min por ${i.user.tag}`);
      return i.reply({
        embeds: [{ title: '✅ Límite actualizado', description: '━━━━━━━━━━━━━━━━━━━━━━━━\n**' + (antiNuke.getAction(actionType)?.label || actionType) + '**\nAhora: **' + val + '** por minuto\n━━━━━━━━━━━━━━━━━━━━━━━━', color: 0x00ff88, footer: { text: 'Rox Security v1.0' } }],
        flags: MessageFlags.Ephemeral,
      });
    }

    if (id.startsWith('an_timeout_m_')) {
      const actionType = id.replace('an_timeout_m_', '');
      const val = parseInt(i.fields.getTextInputValue('an_timeout_v'));
      if (isNaN(val) || val < 1 || val > 40320) {
        return i.reply({ content: '❌ Ingresá un número entre 1 y 40320 minutos (28 días).', flags: MessageFlags.Ephemeral });
      }
      const c = db.get(i.guild.id) || {};
      if (!c.antiNuke) c.antiNuke = {};
      if (!c.antiNuke[actionType]) c.antiNuke[actionType] = { enabled: false, limit: 1, punishment: 'timeout' };
      c.antiNuke[actionType].timeoutDuration = val * 60000;
      c.antiNuke[actionType].punishment = 'timeout';
      db.set(i.guild.id, c);
      await log.sendLog(i.guild, 'info', '⏱️ Duración timeout anti-nuke', `**${antiNuke.getAction(actionType)?.label}** → ${val} min por ${i.user.tag}`);
      return i.reply({
        embeds: [{ title: '✅ Duración guardada', description: '━━━━━━━━━━━━━━━━━━━━━━━━\n**' + (antiNuke.getAction(actionType)?.label || actionType) + '**\nAislamiento: **' + val + ' minuto(s)**\n━━━━━━━━━━━━━━━━━━━━━━━━', color: 0x00ff88, footer: { text: 'Rox Security v1.0' } }],
        flags: MessageFlags.Ephemeral,
      });
    }
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
      const info = antiNuke.getAction(k);
      const a = config[k] || {};
      if (info.premium) return '🔒 ' + info.label;
      const status = a.enabled !== false ? '✅' : '⛔';
      return status + ' ' + info.label + ' — ' + (a.limit || 1) + '/min';
    });
    lines.push('**' + cat.name + '**\n' + items.join('\n'));
  }

  const actionList = Object.keys(antiNuke.ACTIONS);
  const rows = [];
  let row = [];
  for (const key of actionList) {
    const info = antiNuke.getAction(key);
    row.push(new ButtonBuilder()
      .setCustomId('an_action_' + key)
      .setLabel(info.label.substring(0, 20))
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
  if (info.premium) {
    return {
      embeds: [{
        title: info.emoji + ' ' + info.label + ' Premium',
        description: '━━━━━━━━━━━━━━━━━━━━━━━━\n🔒 **Necesitas Premium para usar esta función**\n━━━━━━━━━━━━━━━━━━━━━━━━',
        color: 0xffaa00,
        footer: { text: 'Rox Security v1.0' },
      }],
      components: [new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('an_main').setLabel('◀ Volver').setStyle(ButtonStyle.Secondary),
      )],
    };
  }

  const on = action.enabled !== false;
  const punishment = action.punishment || 'kick';
  const pLabel = { kick: '👢 Kick', ban: '🔨 Ban', timeout: '⏱️ Aislamiento' };
  const timeoutMin = Math.round((action.timeoutDuration || 600000) / 60000);

  const btns = [
    new ButtonBuilder().setCustomId('an_toggle_' + actionType).setLabel(on ? '⛔ Desactivar' : '✅ Activar').setStyle(on ? ButtonStyle.Danger : ButtonStyle.Success),
    new ButtonBuilder().setCustomId('an_limit_' + actionType).setLabel('⚡ Límite: ' + (action.limit || 1)).setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('an_punish_' + actionType).setLabel('⚙️ ' + pLabel[punishment]).setStyle(ButtonStyle.Secondary),
  ];
  if (punishment === 'timeout') {
    btns.push(new ButtonBuilder().setCustomId('an_timeout_' + actionType).setLabel('⏱️ ' + timeoutMin + ' min').setStyle(ButtonStyle.Secondary));
  }
  btns.push(new ButtonBuilder().setCustomId('an_main').setLabel('◀ Volver').setStyle(ButtonStyle.Secondary));

  return {
    embeds: [{
      title: info.emoji + ' ' + info.label + ' Free',
      description: '━━━━━━━━━━━━━━━━━━━━━━━━\nLimita el número máximo de ' + info.label.toLowerCase() + ' que podrá realizar un usuario por minuto.\n━━━━━━━━━━━━━━━━━━━━━━━━',
      color: on ? 0x00ff88 : 0xff4444,
      fields: [
        { name: '📊 Estado sistema', value: on ? '✅ **Activado**' : '⛔ **Desactivado**', inline: true },
        { name: '⚡ Acciones por minuto', value: '**' + (action.limit || 1) + '**', inline: true },
        { name: '⚙️ Castigo al superar', value: '**' + (pLabel[punishment] || punishment) + '**' + (punishment === 'timeout' ? ' (' + timeoutMin + ' min)' : ''), inline: true },
      ],
      footer: { text: 'Rox Security v1.0' },
      timestamp: new Date().toISOString(),
    }],
    components: [new ActionRowBuilder().addComponents(btns)],
  };
}
