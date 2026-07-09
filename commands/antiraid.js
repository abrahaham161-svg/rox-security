const { PermissionFlagsBits, SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, MessageFlags } = require('discord.js');
const db = require('../utils/database');
const antiRaid = require('../utils/antiRaid');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('antiraid')
    .setDescription('Configurar la protección anti-raid del servidor')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    await interaction.reply({ ...buildPanel(interaction.guild), flags: MessageFlags.Ephemeral });
  },

  async handleButton(i) {
    const id = i.customId;

    if (id === 'ar_refresh') {
      await i.update(buildPanel(i.guild));
      return;
    }

    if (id === 'ar_toggle') {
      const c = db.get(i.guild.id) || {};
      c.antiRaidEnabled = c.antiRaidEnabled === false ? true : false;
      db.set(i.guild.id, c);
      await i.update(buildPanel(i.guild));
      return;
    }

    if (id === 'ar_action') {
      const c = db.get(i.guild.id) || {};
      c.action = c.action === 'ban' ? 'kick' : 'ban';
      db.set(i.guild.id, c);
      await i.update(buildPanel(i.guild));
      return;
    }

    if (id === 'ar_age') {
      const modal = new ModalBuilder().setCustomId('ar_age_m').setTitle('⏱️ Edad mínima de cuenta');
      modal.addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId('ar_age_v').setLabel('Minutos (mín 1)').setStyle(TextInputStyle.Short).setRequired(true).setMaxLength(4).setPlaceholder('Ej: 15'),
        ),
      );
      await i.showModal(modal);
      return;
    }

    if (id === 'ar_joins') {
      const modal = new ModalBuilder().setCustomId('ar_joins_m').setTitle('📊 Límite de joins');
      modal.addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId('ar_joins_m_v').setLabel('Joins por minuto').setStyle(TextInputStyle.Short).setRequired(true).setMaxLength(3).setPlaceholder('Ej: 5'),
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId('ar_joins_10_v').setLabel('Joins por 10 seg').setStyle(TextInputStyle.Short).setRequired(true).setMaxLength(3).setPlaceholder('Ej: 3'),
        ),
      );
      await i.showModal(modal);
      return;
    }

    if (id === 'ar_reset') {
      antiRaid.resetGuild(i.guild.id);
      await i.update({
        embeds: [{
          title: '🔄 Registros reiniciados',
          description: '━━━━━━━━━━━━━━━━━━━━━━━━\nLos temporizadores de joins se reiniciaron.\n━━━━━━━━━━━━━━━━━━━━━━━━',
          color: 0x00ff88,
          footer: { text: 'Rox Security v1.0' },
        }],
        components: [new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('ar_refresh').setLabel('◀ Volver').setStyle(ButtonStyle.Secondary),
        )],
      });
    }
  },

  async handleModal(i) {
    const id = i.customId;
    const c = db.get(i.guild.id) || {};

    if (id === 'ar_age_m') {
      const val = parseInt(i.fields.getTextInputValue('ar_age_v'));
      if (isNaN(val) || val < 1) {
        return i.reply({ content: '❌ Ingresá un número válido (mín 1).', flags: MessageFlags.Ephemeral });
      }
      c.accountAgeMinutes = val;
      db.set(i.guild.id, c);
      await i.reply({
        embeds: [{
          title: '✅ Edad mínima guardada',
          description: '━━━━━━━━━━━━━━━━━━━━━━━━\n⏱️ Cuentas de menos de **' + val + ' minuto(s)** serán marcadas.\n━━━━━━━━━━━━━━━━━━━━━━━━',
          color: 0x00ff88,
          footer: { text: 'Rox Security v1.0' },
        }],
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    if (id === 'ar_joins_m') {
      const perMin = parseInt(i.fields.getTextInputValue('ar_joins_m_v'));
      const per10s = parseInt(i.fields.getTextInputValue('ar_joins_10_v'));
      if (isNaN(perMin) || perMin < 1 || isNaN(per10s) || per10s < 1) {
        return i.reply({ content: '❌ Ingresá números válidos (mín 1).', flags: MessageFlags.Ephemeral });
      }
      c.maxJoinsPerMinute = perMin;
      c.maxJoinsPer10Seconds = per10s;
      db.set(i.guild.id, c);
      await i.reply({
        embeds: [{
          title: '✅ Límites guardados',
          description: '━━━━━━━━━━━━━━━━━━━━━━━━\n📊 Máx **' + perMin + ' joins/minuto**\n📊 Máx **' + per10s + ' joins/10 seg**\n━━━━━━━━━━━━━━━━━━━━━━━━',
          color: 0x00ff88,
          footer: { text: 'Rox Security v1.0' },
        }],
        flags: MessageFlags.Ephemeral,
      });
    }
  },
};

function buildPanel(guild) {
  const c = db.get(guild.id) || {};
  const on = c.antiRaidEnabled !== false;
  return {
    embeds: [{
      title: '🛡️ ANTI-RAID',
      description: '━━━━━━━━━━━━━━━━━━━━━━━━\nProtección contra entradas masivas y cuentas sospechosas.\n━━━━━━━━━━━━━━━━━━━━━━━━',
      color: on ? 0x00ff88 : 0xff4444,
      fields: [
        { name: '🛡️ Estado', value: on ? '✅ **Activado**' : '⛔ **Desactivado**', inline: true },
        { name: '⚡ Acción', value: '**' + (c.action || 'kick') + '**', inline: true },
        { name: '⏱️ Edad mínima', value: '**' + (c.accountAgeMinutes || 15) + '** min', inline: true },
        { name: '📊 Joins/min', value: '**' + (c.maxJoinsPerMinute || 5) + '**', inline: true },
        { name: '📊 Joins/10s', value: '**' + (c.maxJoinsPer10Seconds || 3) + '**', inline: true },
      ],
      footer: { text: 'Rox Security v1.0' },
      timestamp: new Date().toISOString(),
    }],
    components: [
      new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('ar_toggle').setLabel(on ? '⛔ Desactivar' : '✅ Activar').setStyle(on ? ButtonStyle.Danger : ButtonStyle.Success),
        new ButtonBuilder().setCustomId('ar_action').setLabel('⚡ Acción: ' + (c.action || 'kick')).setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('ar_age').setLabel('⏱️ Edad cuenta').setStyle(ButtonStyle.Secondary),
      ),
      new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('ar_joins').setLabel('📊 Límite joins').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('ar_reset').setLabel('🔄 Reset').setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId('ar_refresh').setLabel('🔄 Actualizar').setStyle(ButtonStyle.Primary),
      ),
    ],
  };
}
