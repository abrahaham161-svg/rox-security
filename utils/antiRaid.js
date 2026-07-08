const database = require('./database');

const joinTimestamps = new Map();
const suspiciousGuilds = new Map();

function checkJoin(guildId, member) {
  const config = database.get(guildId);
  if (!config) return { raid: false, reason: null };

  const now = Date.now();
  if (!joinTimestamps.has(guildId)) joinTimestamps.set(guildId, []);
  const timestamps = joinTimestamps.get(guildId);

  timestamps.push({ id: member.id, time: now, age: member.user.createdTimestamp });
  joinTimestamps.set(guildId, timestamps.filter(t => now - t.time < 120000));

  const accountAge = now - member.user.createdTimestamp;
  if (accountAge < 60000) {
    return { raid: true, reason: `Cuenta creada hace menos de 1 minuto`, level: 'high' };
  }

  if (member.user.flags && member.user.flags.has('VERIFIED_BOT')) {
    return { raid: false, reason: null };
  }

  if (member.user.avatar === null) {
    return { raid: true, reason: 'Cuenta sin avatar', level: 'low' };
  }

  return { raid: false, reason: null };
}

function resetGuild(guildId) {
  joinTimestamps.delete(guildId);
  suspiciousGuilds.delete(guildId);
}

module.exports = { checkJoin, resetGuild };
