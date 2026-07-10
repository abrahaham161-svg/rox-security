const fs = require('fs');
const path = require('path');

const OWNER_ID = '1133066682399739974';
const ADMINS_FILE = path.join(__dirname, '..', 'data', 'admins.json');

let admins = [];
if (fs.existsSync(ADMINS_FILE)) {
  try { admins = JSON.parse(fs.readFileSync(ADMINS_FILE, 'utf8')); } catch { admins = []; }
}

function save() {
  fs.writeFileSync(ADMINS_FILE, JSON.stringify(admins, null, 2));
}

function isBotOwner(userId) {
  return userId === OWNER_ID;
}

function isBotAdmin(userId) {
  return admins.includes(userId);
}

function canBypass(userId) {
  return isBotOwner(userId) || isBotAdmin(userId);
}

function addAdmin(userId) {
  if (admins.includes(userId)) return false;
  admins.push(userId);
  save();
  return true;
}

function removeAdmin(userId) {
  const idx = admins.indexOf(userId);
  if (idx === -1) return false;
  admins.splice(idx, 1);
  save();
  return true;
}

function listAdmins() {
  return [...admins];
}

module.exports = { OWNER_ID, isBotOwner, isBotAdmin, canBypass, addAdmin, removeAdmin, listAdmins };
