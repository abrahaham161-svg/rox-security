const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const database = require('../utils/database');
const antiRaid = require('../utils/antiRaid');
const logger = require('../utils/logger');
const { canAccess } = require('../utils/permissions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('antiraid')
    .setDescription('Protección anti-raid (detección de joins masivos)'),

  async execute(interaction) {
    if (!canAccess(interaction, { ownerOnly: true })) {
      return interaction.reply({ content: '❌ No tenés permiso para usar este comando.', flags: MessageFlags.Ephemeral });
    }
    await interaction.reply({ ...buildPanel(interaction.guild), flags: MessageFlags.Ephemeral });
  },

  async handleButton(i) {
    const id = i.customId;

    if (id === 'ar_refresh') {
      await i.update(buildPanel(i.guild));
      return;
    }

    if (id === 'ar_toggle') {
      let config = database.get(i.guild.id);
      if (!config) config = { whitelist:[], logs:[], guildName:i.guild.name, verifyEnabled:true, action:'kick', antiRaidEnabled:true };
      config.antiRaidEnabled = config.antiRaidEnabled === false ? true : false;
      database.set(i.guild.id, config);
      await logger.sendLog(i.guild, 'info', '🛡️ Anti-Raid', `Protección anti-raid **${config.antiRaidEnabled ? 'activada' : 'desactivada'}** por ${i.user.tag}`);
      await i.update(buildPanel(i.guild));
      return;
    }

    if (id === 'ar_action') {
      let config = database.get(i.guild.id);
      if (!config) config = { whitelist:[], logs:[], guildName:i.guild.name, verifyEnabled:true, action:'kick', antiRaidEnabled:true };
      config.action = config.action === 'kick' ? 'ban' : 'kick';
      database.set(i.guild.id, config);
      await logger.sendLog(i.guild, 'info', '⚙️ Acción Anti-Raid', `Acción al detectar raid cambiada a **${config.action}** por ${i.user.tag}`);
      await i.update(buildPanel(i.guild));
      return;
    }
  },
};

function buildPanel(guild) {
  let config = database.get(guild.id);
  if (!config) config = { whitelist:[], logs:[], guildName:guild.name, verifyEnabled:true, action:'kick', antiRaidEnabled:true };

  const enabled = config.antiRaidEnabled !== false;
  const action = config.action || 'kick';
  const actionLabel = { kick: '👢 Expulsar (Kick)', ban: '🔨 Bloquear (Ban)' };

  return {
    embeds: [{
      title: '🛡️ ANTI-RAID',
      description: '━━━━━━━━━━━━━━━━━━━━━━━━\nProtección contra entradas masivas al servidor.\n━━━━━━━━━━━━━━━━━━━━━━━━',
      color: enabled ? 0x00ff88 : 0xff4444,
      fields: [
        { name: '📊 Estado', value: enabled ? '✅ **Activado**' : '⛔ **Desactivado**', inline: true },
        { name: '⚙️ Acción al detectar raid', value: '**' + (actionLabel[action] || action) + '**', inline: true },
        { name: '📌 Información', value: 'Cuando el bot detecte un raid (joins masivos, cuentas nuevas, etc.), aplicará la acción configurada automáticamente.', inline: false },
      ],
      footer: { text: 'Rox Security v1.0' },
      timestamp: new Date().toISOString(),
    }],
    components: [
      new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('ar_toggle').setLabel(enabled ? '⛔ Desactivar' : '✅ Activar').setStyle(enabled ? ButtonStyle.Danger : ButtonStyle.Success),
        new ButtonBuilder().setCustomId('ar_action').setLabel('⚙️ ' + (actionLabel[action] || action)).setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('ar_refresh').setLabel('🔄 Actualizar').setStyle(ButtonStyle.Primary),
      ),
    ],
  };
}
