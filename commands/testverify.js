const captcha = require('../utils/captcha');
const { SlashCommandBuilder, MessageFlags } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder().setName('testverify').setDescription('Genera un código de verificación para probar'),
  async execute(interaction) {
    const code = captcha.createVerification(interaction.user.id, interaction.guild.id);
    await interaction.reply({
      embeds: [{
        title: '🔐 Código de Prueba',
        description: '━━━━━━━━━━━━━━━━━━━━━━━━\n'
          + 'Código generado para probar:\n\n'
          + `\`\`\`${code}\`\`\`\n`
          + '━━━━━━━━━━━━━━━━━━━━━━━━\n\n'
          + '📌 Presiona **✅ Verificar** en el canal.\n'
          + '📌 Escribe el código **exactamente como aparece**.\n'
          + '⚠️ **Respeta mayúsculas y minúsculas.**',
        color: 0x00d4ff,
        footer: { text: 'Rox Security v1.0' },
      }],
      flags: MessageFlags.Ephemeral,
    });
  },
};
