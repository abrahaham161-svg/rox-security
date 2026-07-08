const { PermissionFlagsBits, SlashCommandBuilder, MessageFlags, ChannelType } = require('discord.js');
const database = require('../utils/database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setup')
    .setDescription('Configurar la protección del servidor')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption(opt => opt.setName('action').setDescription('Acción al detectar raid').addChoices({ name: 'Expulsar (Kick)', value: 'kick' }, { name: 'Bloquear (Ban)', value: 'ban' }))
    .addChannelOption(opt => opt.setName('log_channel').setDescription('Canal para los registros').addChannelTypes(ChannelType.GuildText))
    .addRoleOption(opt => opt.setName('verified_role').setDescription('Rol para usuarios verificados')),

  async execute(interaction) {
    const guildId = interaction.guild.id;
    let config = database.get(guildId) || { whitelist:[], logs:[], guildName:interaction.guild.name, verifyEnabled:true };

    const map = {
      action: 'action',
      logChannel: 'log_channel',
      verifiedRole: 'verified_role',
    };

    let changed = false;
    for (const [key, opt] of Object.entries(map)) {
      const val = interaction.options.get(opt)?.value;
      if (val !== undefined) { config[key] = val; changed = true; }
    }

    if (changed) database.set(guildId, config);

    const lines = [`**Acción:** ${config.action||'kick'}`, `**Canal logs:** ${config.logChannel?`<#${config.logChannel}>`:'No'}`];
    if (config.verifyEnabled && config.verifiedRole) lines.push(`**Rol verificado:** <@&${config.verifiedRole}>`);

    await interaction.reply({ embeds: [{
      title: changed ? '⚙️ Configuración guardada' : '⚙️ Configuración actual',
      description: lines.join('\n'),
      color: changed ? 0x00ff88 : 0x00d4ff,
      footer: { text: 'Rox Security v1.0' },
      timestamp: new Date().toISOString(),
    }], flags: MessageFlags.Ephemeral });
  },
};
