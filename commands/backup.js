const { PermissionFlagsBits, SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, MessageFlags } = require('discord.js');
const backupManager = require('../utils/backupManager');
const database = require('../utils/database');
const logger = require('../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('backup')
    .setDescription('Gestionar respaldos del servidor')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    const row1 = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('bk_cr').setLabel('💾 Crear Backup').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId('bk_ld').setLabel('📂 Cargar Backup').setStyle(ButtonStyle.Primary),
    );
    const row2 = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('bk_up').setLabel('🔄 Actualizar Backup').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('bk_dl').setLabel('❌ Eliminar Backup').setStyle(ButtonStyle.Danger),
    );

    await interaction.reply({
      embeds: [{
        title: '💾 Respaldos',
        description: '━━━━━━━━━━━━━━━━━━━━━━━━\nLos backups son **globales**: puedes cargar un backup de otro servidor aquí.\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n💾 **Crear** — Guarda roles, canales, config del servidor y del bot\n📂 **Cargar** — Restaura todo con un ID\n🔄 **Actualizar** — Actualiza un backup existente\n❌ **Eliminar** — Borra un backup por su ID',
        color: 0x00d4ff,
        footer: { text: 'Rox Security v1.0' },
        timestamp: new Date().toISOString(),
      }],
      components: [row1, row2],
      flags: MessageFlags.Ephemeral,
    });
  },

  async handleButton(i) {
    const id = i.customId;

    if (id === 'bk_cr' || id === 'bk_sel_cr') {
      const isCreate = id === 'bk_cr';
      const allOptions = { roles: true, channels: true, server: true, botConfig: true, members: true };

      if (isCreate) {
        await i.update({
          embeds: [{
            title: '⏳ Creando Backup...',
            description: '━━━━━━━━━━━━━━━━━━━━━━━━\nGuardando roles, canales, miembros y configuración...\n━━━━━━━━━━━━━━━━━━━━━━━━',
            color: 0x00d4ff,
            footer: { text: 'Rox Security v1.0' },
          }],
          components: [],
        });
      }

      const options = id === 'bk_sel_cr' ? i.values.reduce((acc, v) => { acc[v] = true; return acc; }, {}) : allOptions;

      try {
        const backupId = await backupManager.createBackup(i.guild, options);
        const dataLabels = {
          roles: '🎖️ Roles',
          channels: '📢 Canales y categorías',
          server: '🌐 Config. del servidor',
          botConfig: '⚙️ Config. del bot',
          members: '👥 Roles de miembros',
        };
        const included = Object.keys(options).map(k => dataLabels[k] || k).join('\n');

        const editData = {
          embeds: [{
            title: '✅ Backup Creado',
            description: '━━━━━━━━━━━━━━━━━━━━━━━━\n**Backup completado**\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
              '**`' + backupId + '`**\n\n' +
              '📌 **Guardá este ID.** Sin él no podrás cargar el backup.\n' +
              '⚠️ Respetá **mayúsculas, minúsculas y números** — el ID distingue mayúsculas.\n' +
              '━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
              '**📦 Incluye:**\n' + included + '\n\n' +
              '━━━━━━━━━━━━━━━━━━━━━━━━\n' +
              '**¿Cómo restaurar?**\n' +
              '1. Andá al servidor donde querés restaurar\n' +
              '2. Usá `/backup` → 📂 Cargar Backup\n' +
              '3. Pegá este ID\n\n' +
              '⚠️ **El restore borra todo** (roles, canales) y lo reemplaza con los datos del backup.\n' +
              '🔹 El backup es **global** — podés cargarlo en cualquier servidor donde esté Rox Security.',
            color: 0x00ff88,
            fields: [
              { name: '📅 Creado', value: `<t:${Math.floor(Date.now()/1000)}:R>`, inline: true },
              { name: '🔗 Origen', value: i.guild.name, inline: true },
            ],
            footer: { text: 'Rox Security v1.0' },
            timestamp: new Date().toISOString(),
          }],
          components: [new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('bk').setLabel('◀ Volver').setStyle(ButtonStyle.Secondary))],
        };

        if (isCreate) await i.editReply(editData);
        else await i.update(editData);

        await logger.sendLog(i.guild, 'success', '💾 Backup creado', `Backup **${backupId}** creado por ${i.user.tag}\n**Datos:** ${Object.keys(options).join(', ')}`);
      } catch (e) {
        const errData = {
          embeds: [{ title: '❌ Error', description: '━━━━━━━━━━━━━━━━━━━━━━━━\n' + e.message + '\n━━━━━━━━━━━━━━━━━━━━━━━━', color: 0xff4444, footer: { text: 'Rox Security v1.0' } }],
          components: [new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('bk').setLabel('◀ Volver').setStyle(ButtonStyle.Secondary))],
        };
        if (isCreate) await i.editReply(errData);
        else await i.update(errData);
      }
      return;
    }

    if (id === 'bk') {
      const row1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('bk_cr').setLabel('💾 Crear Backup').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('bk_ld').setLabel('📂 Cargar Backup').setStyle(ButtonStyle.Primary),
      );
      const row2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('bk_up').setLabel('🔄 Actualizar Backup').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('bk_dl').setLabel('❌ Eliminar Backup').setStyle(ButtonStyle.Danger),
      );
      await i.update({
        embeds: [{
          title: '💾 Respaldos',
          description: '━━━━━━━━━━━━━━━━━━━━━━━━\nLos backups son **globales**: puedes cargar un backup de otro servidor aquí.\n━━━━━━━━━━━━━━━━━━━━━━━━',
          color: 0x00d4ff,
          footer: { text: 'Rox Security v1.0' },
          timestamp: new Date().toISOString(),
        }],
        components: [row1, row2],
      });
      return;
    }

    if (id === 'bk_ld' || id === 'bk_dl' || id === 'bk_up') {
      const labels = {
        bk_ld: { t: '📂 Cargar Backup', placeholder: 'ID del backup a cargar', customId: 'mod_bk_ld' },
        bk_dl: { t: '❌ Eliminar Backup', placeholder: 'ID del backup a eliminar', customId: 'mod_bk_dl' },
        bk_up: { t: '🔄 Actualizar Backup', placeholder: 'ID del backup a actualizar', customId: 'mod_bk_up' },
      };
      const l = labels[id];
      const modal = new ModalBuilder().setCustomId(l.customId).setTitle(l.t);
      modal.addComponents(new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('bk_id').setLabel('ID del backup').setStyle(TextInputStyle.Short).setRequired(true).setMinLength(8).setMaxLength(10).setPlaceholder(l.placeholder),
      ));
      await i.showModal(modal);
      return;
    }
  },

  async handleSelect(i) {
    if (i.customId === 'bk_sel_cr') {
      const options = i.values.reduce((acc, v) => { acc[v] = true; return acc; }, {});
      await i.update({
        embeds: [{ title: '⏳ Creando Backup...', description: '━━━━━━━━━━━━━━━━━━━━━━━━\nGuardando datos...\n━━━━━━━━━━━━━━━━━━━━━━━━', color: 0x00d4ff, footer: { text: 'Rox Security v1.0' } }],
        components: [],
      });
      try {
        const backupId = await backupManager.createBackup(i.guild, options);
        await i.editReply({
          embeds: [{
            title: '✅ Backup Creado',
            description: '━━━━━━━━━━━━━━━━━━━━━━━━\n**`' + backupId + '`**\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n📌 Guardá este ID para cargar el backup después.',
            color: 0x00ff88,
            footer: { text: 'Rox Security v1.0' },
            timestamp: new Date().toISOString(),
          }],
          components: [new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('bk').setLabel('◀ Volver').setStyle(ButtonStyle.Secondary))],
        });
      } catch (e) {
        await i.editReply({ embeds: [{ title: '❌ Error', description: e.message, color: 0xff4444, footer: { text: 'Rox Security v1.0' } }] });
      }
      return;
    }
  },

  async handleModal(i) {
    const backupId = i.fields.getTextInputValue('bk_id');
    const type = i.customId.split('_')[2];

    if (type === 'dl') {
      const ok = await backupManager.deleteBackup(backupId);
      await i.reply({
        embeds: [{
          title: ok ? '🗑️ Backup Eliminado' : '❌ No encontrado',
          description: ok
            ? '━━━━━━━━━━━━━━━━━━━━━━━━\nBackup `' + backupId + '` eliminado.\n━━━━━━━━━━━━━━━━━━━━━━━━'
            : '━━━━━━━━━━━━━━━━━━━━━━━━\n❌ ID no existe\n━━━━━━━━━━━━━━━━━━━━━━━━',
          color: ok ? 0xff6644 : 0xff4444,
          footer: { text: 'Rox Security v1.0' },
          timestamp: new Date().toISOString(),
        }],
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    if (type === 'up') {
      const backup = await backupManager.getBackup(backupId);
      if (!backup) {
        await i.reply({ embeds: [{ title: '❌ No encontrado', description: '━━━━━━━━━━━━━━━━━━━━━━━━\n❌ ID no existe\n━━━━━━━━━━━━━━━━━━━━━━━━', color: 0xff4444, footer: { text: 'Rox Security v1.0' } }], flags: MessageFlags.Ephemeral });
        return;
      }

      const select = new StringSelectMenuBuilder()
        .setCustomId('bk_sel_up_' + backupId)
        .setPlaceholder('¿Qué quieres actualizar?')
        .setMinValues(1)
        .setMaxValues(5)
        .addOptions([
          { label: 'Roles', value: 'roles', description: 'Actualizar roles guardados', default: backup.options.roles },
          { label: 'Canales', value: 'channels', description: 'Actualizar canales guardados', default: backup.options.channels },
          { label: 'Config. del servidor', value: 'server', description: 'Actualizar nombre e icono', default: backup.options.server },
          { label: 'Config. del bot', value: 'botConfig', description: 'Actualizar config del bot', default: backup.options.botConfig },
          { label: 'Miembros', value: 'members', description: 'Actualizar roles de miembros guardados', default: backup.options.members },
        ]);

      await i.reply({
        embeds: [{
          title: `🔄 Actualizar ${backupId}`,
          description: '━━━━━━━━━━━━━━━━━━━━━━━━\nSelecciona qué datos actualizar.\n━━━━━━━━━━━━━━━━━━━━━━━━',
          color: 0x00d4ff,
          footer: { text: 'Rox Security v1.0' },
          timestamp: new Date().toISOString(),
        }],
        components: [new ActionRowBuilder().addComponents(select)],
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    if (type === 'ld') {
      await i.reply({
        embeds: [{
          title: '⏳ Cargando Backup...',
          description: '━━━━━━━━━━━━━━━━━━━━━━━━\nRestaurando datos, esto puede tomar un momento...\n━━━━━━━━━━━━━━━━━━━━━━━━',
          color: 0x00d4ff,
          footer: { text: 'Rox Security v1.0' },
        }],
        flags: MessageFlags.Ephemeral,
      });

      const result = await backupManager.loadBackup(backupId, i.guild);
      const embedResult = result.success
        ? { title: '✅ Backup Cargado', description: '━━━━━━━━━━━━━━━━━━━━━━━━\nBackup **' + backupId + '** cargado correctamente.\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n' + result.results.join('\n'), color: 0x00ff88 }
        : { title: '❌ Error', description: result.error, color: 0xff4444 };

      try {
        await i.editReply({ embeds: [{ ...embedResult, footer: { text: 'Rox Security v1.0' }, timestamp: new Date().toISOString() }] });
      } catch {
        try { await i.user.send({ embeds: [{ ...embedResult, footer: { text: 'Rox Security v1.0' }, timestamp: new Date().toISOString() }] }); } catch {}
      }
      return;
    }
  },

  async handleUpdateSelect(i) {
    const parts = i.customId.split('_');
    const backupId = parts.slice(3).join('_');
    const options = i.values.reduce((acc, v) => { acc[v] = true; return acc; }, {});

    await i.update({
      embeds: [{ title: '⏳ Actualizando...', description: '━━━━━━━━━━━━━━━━━━━━━━━━\nGuardando cambios...\n━━━━━━━━━━━━━━━━━━━━━━━━', color: 0x00d4ff, footer: { text: 'Rox Security v1.0' } }],
      components: [],
    });

    try {
      await backupManager.updateBackup(backupId, i.guild, options);
      await i.editReply({
        embeds: [{
          title: '✅ Backup Actualizado',
          description: '━━━━━━━━━━━━━━━━━━━━━━━━\nBackup **' + backupId + '** actualizado.\n━━━━━━━━━━━━━━━━━━━━━━━━',
          color: 0x00ff88,
          fields: [{ name: '📦 Datos actualizados', value: Object.keys(options).join(', '), inline: false }],
          footer: { text: 'Rox Security v1.0' },
          timestamp: new Date().toISOString(),
        }],
      });
    } catch (e) {
      await i.editReply({ embeds: [{ title: '❌ Error', description: '━━━━━━━━━━━━━━━━━━━━━━━━\n' + e.message + '\n━━━━━━━━━━━━━━━━━━━━━━━━', color: 0xff4444, footer: { text: 'Rox Security v1.0' } }] });
    }
  },
};
