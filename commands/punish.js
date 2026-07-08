const { PermissionFlagsBits, SlashCommandBuilder, MessageFlags } = require('discord.js');
const database = require('../utils/database');
const logger = require('../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('punish')
    .setDescription('Expulsar o bloquear a un usuario')
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
    .addUserOption(opt => opt.setName('usuario').setDescription('El usuario').setRequired(true))
    .addStringOption(opt => opt.setName('accion').setDescription('Qué hacer').setRequired(true).addChoices({ name: 'Expulsar (Kick)', value: 'kick' }, { name: 'Bloquear (Ban)', value: 'ban' }))
    .addStringOption(opt => opt.setName('razon').setDescription('Motivo')),

  async execute(interaction) {
    const user = interaction.options.getUser('usuario');
    const action = interaction.options.getString('accion');
    const reason = interaction.options.getString('razon') || 'Sin motivo';
    const member = await interaction.guild.members.fetch(user.id).catch(() => null);

    if (!member) { await interaction.reply({ embeds: [{ title:'❌', description:'Ese usuario no está en el servidor', color:0xff4444, footer:{text:'Rox Security v1.0'} }], flags: MessageFlags.Ephemeral }); return; }
    if (!member.moderatable) { await interaction.reply({ embeds: [{ title:'❌', description:'No puedo castigar a ese usuario\n📌 Mi rol debe estar arriba del suyo', color:0xff4444, footer:{text:'Rox Security v1.0'} }], flags: MessageFlags.Ephemeral }); return; }

    try {
      if (action === 'ban') await member.ban({ reason: `[Rox Security] ${reason}` });
      else await member.kick(`[Rox Security] ${reason}`);
      await logger.sendLog(interaction.guild, 'punish', '🔨 Castigo', `**${user.tag}** ${action} por ${interaction.user.tag}\n**Motivo:** ${reason}`);
      await interaction.reply({ embeds: [{ title: action === 'ban' ? '🔨 Bloqueado' : '👢 Expulsado', description: `**${user.tag}** fue ${action === 'ban' ? 'bloqueado' : 'expulsado'}`, color: action === 'ban' ? 0xff4444 : 0xff6600, fields: [{name:'📝 Motivo',value:reason}], footer:{text:'Rox Security v1.0'} }], flags: MessageFlags.Ephemeral });
    } catch (err) {
      await interaction.reply({ embeds: [{ title:'❌ Error', description: err.message, color:0xff4444, footer:{text:'Rox Security v1.0'} }], flags: MessageFlags.Ephemeral });
    }
  },
};
