const crypto = require('crypto');

const pending = new Map();

function generate() {
  return Array.from({ length: 6 }, () => 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'[crypto.randomInt(56)]).join('');
}

function createVerification(memberId, guildId) {
  const code = generate();
  pending.set(`${guildId}-${memberId}`, { code, expiresAt: Date.now() + 300000, attempts: 0 });
  return code;
}

function verifyCode(memberId, guildId, userCode) {
  const key = `${guildId}-${memberId}`;
  const data = pending.get(key);
  if (!data) return { success: false, reason: 'No tienes verificación pendiente' };
  if (Date.now() > data.expiresAt) { pending.delete(key); return { success: false, reason: 'Código expirado (5 min)' }; }
  if (data.attempts >= 3) { pending.delete(key); return { success: false, reason: 'Demasiados intentos (máx 3)' }; }
  data.attempts++;
  if (data.code === userCode) { pending.delete(key); return { success: true }; }
  return { success: false, reason: 'Código incorrecto' };
}

function getVerificationData(memberId, guildId) {
  return pending.get(`${guildId}-${memberId}`) || null;
}

function removeVerification(memberId, guildId) {
  pending.delete(`${guildId}-${memberId}`);
}

function getCaptchaText(code) {
  return `━━━━━━━━━━━━━━━━━━━━━━━━\n🔐 VERIFICACIÓN\n━━━━━━━━━━━━━━━━━━━━━━━━\n\nEscribe este código:\n\n${code}\n\n━━━━━━━━━━━━━━━━━━━━━━━━\n⏰ 5 minutos · 🔒 3 intentos\n━━━━━━━━━━━━━━━━━━━━━━━━`;
}

function getCode(memberId, guildId) {
  const data = pending.get(`${guildId}-${memberId}`);
  return data ? data.code : null;
}

module.exports = { createVerification, verifyCode, getVerificationData, removeVerification, getCaptchaText, getCode };
