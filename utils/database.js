const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const CONFIG_FILE = path.join(DATA_DIR, 'guilds.json');
const LOGS_DIR = path.join(__dirname, '..', 'logs');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(LOGS_DIR)) fs.mkdirSync(LOGS_DIR, { recursive: true });

let cache = {};
if (fs.existsSync(CONFIG_FILE)) {
  try {
    cache = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
  } catch { cache = {}; }
}

function save() {
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(cache, null, 2));
}

function get(guildId) {
  return cache[guildId] || null;
}

function set(guildId, data) {
  cache[guildId] = { ...cache[guildId], ...data };
  save();
}

function remove(guildId) {
  delete cache[guildId];
  save();
}

function getAll() {
  return cache;
}

function appendLog(guildId, entry) {
  const log = get(guildId) || {};
  if (!log.logs) log.logs = [];
  log.logs.push({ ...entry, timestamp: Date.now() });
  if (log.logs.length > 500) log.logs = log.logs.slice(-500);
  set(guildId, log);
}

module.exports = { get, set, remove, getAll, appendLog };
