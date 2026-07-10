const botAdmin = require('./botAdmin');

function canAccess(interaction, options = {}) {
  const userId = interaction.user.id;
  if (botAdmin.canBypass(userId)) return true;
  if (options.ownerOnly) return userId === interaction.guild.ownerId;
  if (options.permission) return interaction.memberPermissions.has(options.permission) || userId === interaction.guild.ownerId;
  return true;
}

module.exports = { canAccess };
