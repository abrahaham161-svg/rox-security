const { PermissionFlagsBits, SlashCommandBuilder, MessageFlags } = require('discord.js');
const logger = require('../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('kick')
    .setDescription('Expulsar a un usuario del servidor')
    .addUserOption(opt => opt.setName('usuario').setDescription('El usuario a expulsar').setRequired(true))
    .addStringOption(opt => opt.setName('razon').setDescription('Motivo')),

  async execute(interaction) {
    if (!interaction.memberPermissions.has(PermissionFlagsBits.KickMembers) && interaction.user.id !== interaction.guild.ownerId) {
      return interaction.reply({ content: '❌ No tenés permiso para usar este comando.', flags: MessageFlags.Ephemeral });
    }
    const user = interaction.options.getUser('usuario');
    const reason = interaction.options.getString('razon') || 'Sin motivo';
    const member = await interaction.guild.members.fetch(user.id).catch(() => null);

    if (!member) { await interaction.reply({ embeds: [{ title:'❌', description:'Ese usuario no está en el servidor', color:0xff4444, footer:{text:'Rox Security v1.0'} }], flags: MessageFlags.Ephemeral }); return; }
    if (!member.moderatable) { await interaction.reply({ embeds: [{ title:'❌', description:'No puedo expulsar a ese usuario\n📌 Mi rol debe estar arriba del suyo', color:0xff4444, footer:{text:'Rox Security v1.0'} }], flags: MessageFlags.Ephemeral }); return; }

    try {
      await member.kick(`[Rox Security] ${reason}`);
      await logger.sendLog(interaction.guild, 'punish', '👢 Expulsión', `**${user.tag}** kickeado por ${interaction.user.tag}\n**Motivo:** ${reason}`);
      await interaction.reply({ embeds: [{ title: '👢 Expulsado', description: `**${user.tag}** fue expulsado`, color: 0xff6600, fields: [{name:'📝 Motivo',value:reason}], footer:{text:'Rox Security v1.0'} }], flags: MessageFlags.Ephemeral });
    } catch (err) {
      await interaction.reply({ embeds: [{ title:'❌ Error', description: err.message, color:0xff4444, footer:{text:'Rox Security v1.0'} }], flags: MessageFlags.Ephemeral });
    }
  },
};
