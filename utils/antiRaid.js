const database = require('./database');

const joinTimestamps = new Map();

function checkJoin(guildId, member) {
  const config = database.get(guildId);
  if (!config) return { raid: false, reason: null };
  if (config.antiRaidEnabled === false) return { raid: false, reason: null };

  const now = Date.now();
  if (!joinTimestamps.has(guildId)) joinTimestamps.set(guildId, []);
  const timestamps = joinTimestamps.get(guildId);

  const maxAge = (config.maxJoinsPerMinute || 5) * 12000;
  timestamps.push({ id: member.id, time: now, age: member.user.createdTimestamp });
  joinTimestamps.set(guildId, timestamps.filter(t => now - t.time < maxAge));

  const accountAgeMin = (config.accountAgeMinutes || 15) * 60000;
  const accountAge = now - member.user.createdTimestamp;
  if (accountAge < accountAgeMin) {
    return { raid: true, reason: `Cuenta creada hace menos de ${config.accountAgeMinutes || 15} minutos`, level: 'high' };
  }

  if (member.user.flags && member.user.flags.has('VERIFIED_BOT')) {
    return { raid: false, reason: null };
  }

  if (member.user.avatar === null) {
    return { raid: true, reason: 'Cuenta sin avatar', level: 'low' };
  }

  const recent = joinTimestamps.get(guildId).filter(t => now - t.time < 10000);
  const max10s = config.maxJoinsPer10Seconds || 3;
  if (recent.length > max10s) {
    return { raid: true, reason: `Más de ${max10s} joins en 10 segundos`, level: 'high' };
  }

  const maxMin = config.maxJoinsPerMinute || 5;
  const inMinute = joinTimestamps.get(guildId).filter(t => now - t.time < 60000);
  if (inMinute.length > maxMin) {
    return { raid: true, reason: `Más de ${maxMin} joins en 1 minuto`, level: 'medium' };
  }

  return { raid: false, reason: null };
}

function resetGuild(guildId) {
  joinTimestamps.delete(guildId);
}

module.exports = { checkJoin, resetGuild };
