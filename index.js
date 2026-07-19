const { Client, GatewayIntentBits, Collection, REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');
const config = require('./config');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages,
  ],
});

client.commands = new Collection();

const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(f => f.endsWith('.js'));

for (const file of commandFiles) {
  const command = require(path.join(commandsPath, file));
  if ('data' in command && 'execute' in command) {
    client.commands.set(command.data.name, command);
  }
}

const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter(f => f.endsWith('.js'));

for (const file of eventFiles) {
  const event = require(path.join(eventsPath, file));
  if (event.once) {
    client.once(event.name, (...args) => event.execute(...args));
  } else {
    client.on(event.name, (...args) => event.execute(...args));
  }
}

client.on('error', console.error);
process.on('unhandledRejection', (e) => console.error('Unhandled:', e));

client.once('ready', async () => {
  console.log(`✅ ${client.user.tag} está online!`);

  const commands = client.commands.map(cmd => cmd.data.toJSON());
  console.log('📦 Comandos a registrar:', commands.map(c => c.name).join(', '));
  const rest = new REST({ version: '10' }).setToken(config.token);

  try {
    if (config.guildId) {
      console.log(`🔄 Registrando en servidor ${config.guildId} (instantáneo)...`);
      await rest.put(Routes.applicationGuildCommands(client.user.id, config.guildId), { body: commands });
      console.log('✅ Comandos registrados en el servidor (aparecen ya).');
    } else {
      console.log('🔄 Registrando comandos globales (puede tardar hasta 1h)...');
      await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
      console.log('✅ Comandos slash registrados globalmente.');
    }
  } catch (error) {
    console.error('❌ Error registrando comandos:', error);
  }

  client.user.setPresence({
    activities: [{ name: '/help | Rox Security', type: 3 }],
    status: 'online',
  });

  updateStats(client);
  setInterval(() => updateStats(client), 5 * 60 * 1000);
});

client.login(config.token);

// --- API server ---
const express = require('express');
const cors = require('cors');
const apiApp = express();
apiApp.use(cors());
apiApp.use(express.json());

const OWNER_ID = '1133066682399739974';
const ADMIN_KEY = process.env.ADMIN_KEY || 'admin123';
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');

function readJSON(file) {
  try {
    const p = path.join(DATA_DIR, file);
    if (!fs.existsSync(p)) return [];
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch { return []; }
}
function writeJSON(file, data) {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(path.join(DATA_DIR, file), JSON.stringify(data, null, 2));
}

function getIP(req) {
  return (req.headers['x-forwarded-for'] || req.ip || 'unknown').split(',')[0].trim();
}

// --- Simple rate limiter ---
const rateLimitMap = new Map();
function rateLimit(ip, max = 5, windowMs = 60000) {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now - entry.start > windowMs) {
    rateLimitMap.set(ip, { start: now, count: 1 });
    return { allowed: true };
  }
  entry.count++;
  if (entry.count > max) {
    return { allowed: false, retryAfter: Math.ceil((windowMs - (now - entry.start)) / 1000) };
  }
  return { allowed: true };
}

function auth(req, res) {
  const key = (req.headers.authorization || '').replace('Bearer ', '') || req.query.key;
  if (key !== ADMIN_KEY) {
    res.status(401).json({ error: 'Unauthorized' });
    return false;
  }
  return true;
}

// --- Form submission ---
apiApp.post('/api/contact', async (req, res) => {
  const ip = getIP(req);
  const rl = rateLimit(ip, 3, 60000);
  if (!rl.allowed) return res.status(429).json({ error: 'Too many requests', retryAfter: rl.retryAfter });
  const { gmail, social, servicio, servicioTexto, contenido } = req.body;
  try {
    const blocked = readJSON('blocked.json');
    if (blocked.includes(ip)) return res.status(403).json({ error: 'Blocked' });

    const subs = readJSON('submissions.json');
    subs.push({
      id: Date.now(),
      gmail: gmail || '',
      social: social || '',
      servicio: servicio || '',
      servicioTexto: servicioTexto || '',
      contenido: contenido || '',
      ip,
      read: false,
      timestamp: new Date().toISOString()
    });
    writeJSON('submissions.json', subs);

    const user = await client.users.fetch(OWNER_ID);
    const embed = {
      color: 0x00ffc8,
      title: 'Nuevo servicio solicitado',
      fields: [
        { name: 'Contacto', value: gmail ? `Gmail: ${gmail}` : `Otra red: ${social || 'No especificado'}` },
        { name: 'Servicio', value: servicioTexto || `Servicio #${servicio}` || 'No especificado' },
        { name: 'Contenido', value: contenido || 'No especificado' },
      ],
      timestamp: new Date(),
    };
    await user.send({ embeds: [embed] });
    res.json({ ok: true });
  } catch (err) {
    console.error('Error sending DM:', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// --- View tracking ---
apiApp.post('/api/track-view', async (req, res) => {
  const ip = getIP(req);
  const rl = rateLimit(ip, 10, 60000);
  if (!rl.allowed) return res.status(429).json({ ok: false });
  const views = readJSON('views.json');
  let pais = 'Desconocido';
  try {
    if (ip && ip !== 'unknown') {
      const r = await fetch(`http://ip-api.com/json/${ip}?fields=country`);
      const d = await r.json();
      if (d.country) pais = d.country;
    }
  } catch {}
  views.push({
    id: Date.now(),
    pais,
    ip: ip.substring(0, 20),
    timestamp: new Date().toISOString()
  });
  writeJSON('views.json', views);
  res.json({ ok: true, total: views.length });
});

// --- Admin: submissions (with search) ---
apiApp.get('/api/admin/submissions', (req, res) => {
  if (!auth(req, res)) return;
  let subs = readJSON('submissions.json').reverse();
  const q = (req.query.search || '').toLowerCase();
  if (q) {
    subs = subs.filter(s =>
      (s.gmail || '').toLowerCase().includes(q) ||
      (s.social || '').toLowerCase().includes(q) ||
      (s.servicioTexto || '').toLowerCase().includes(q) ||
      (s.contenido || '').toLowerCase().includes(q)
    );
  }
  res.json(subs);
});

// --- Admin: delete submission ---
apiApp.delete('/api/admin/submissions/:id', (req, res) => {
  if (!auth(req, res)) return;
  let subs = readJSON('submissions.json');
  subs = subs.filter(s => s.id !== Number(req.params.id));
  writeJSON('submissions.json', subs);
  res.json({ ok: true });
});

// --- Admin: toggle read ---
apiApp.post('/api/admin/submissions/:id/read', (req, res) => {
  if (!auth(req, res)) return;
  const subs = readJSON('submissions.json');
  const s = subs.find(s => s.id === Number(req.params.id));
  if (!s) return res.status(404).json({ error: 'Not found' });
  s.read = !s.read;
  writeJSON('submissions.json', subs);
  res.json({ ok: true, read: s.read });
});

// --- Admin: views ---
apiApp.get('/api/admin/views', (req, res) => {
  if (!auth(req, res)) return;
  const views = readJSON('views.json');
  res.json(views.reverse());
});

// --- Admin: stats ---
apiApp.get('/api/admin/stats', (req, res) => {
  if (!auth(req, res)) return;
  const subs = readJSON('submissions.json');
  const views = readJSON('views.json');
  const unread = subs.filter(s => !s.read).length;
  res.json({ submissions: subs.length, unread, views: views.length, commands: client.commands.size });
});

// --- Admin: blocked IPs ---
apiApp.get('/api/admin/blocked', (req, res) => {
  if (!auth(req, res)) return;
  res.json(readJSON('blocked.json'));
});

// --- Admin: block IP ---
apiApp.post('/api/admin/block', (req, res) => {
  if (!auth(req, res)) return;
  const { ip } = req.body;
  if (!ip) return res.status(400).json({ error: 'IP required' });
  const blocked = readJSON('blocked.json');
  if (!blocked.includes(ip)) blocked.push(ip);
  writeJSON('blocked.json', blocked);
  res.json({ ok: true });
});

// --- Admin: unblock IP ---
apiApp.post('/api/admin/unblock', (req, res) => {
  if (!auth(req, res)) return;
  const { ip } = req.body;
  const blocked = readJSON('blocked.json').filter(b => b !== ip);
  writeJSON('blocked.json', blocked);
  res.json({ ok: true });
});

// --- Public: reviews ---
apiApp.get('/api/reviews', (req, res) => {
  const reviews = readJSON('reviews.json').reverse();
  res.json(reviews);
});

apiApp.post('/api/reviews', (req, res) => {
  const ip = getIP(req);
  const rl = rateLimit(ip, 3, 60000);
  if (!rl.allowed) return res.status(429).json({ error: 'Too many requests', retryAfter: rl.retryAfter });
  const { name, stars, text } = req.body;
  if (!name || !stars || stars < 1 || stars > 5) {
    return res.status(400).json({ error: 'Name and stars (1-5) required' });
  }
  const reviews = readJSON('reviews.json');
  reviews.push({
    id: Date.now(),
    name: name.trim().substring(0, 30),
    stars: Number(stars),
    text: (text || '').trim().substring(0, 500),
    timestamp: new Date().toISOString()
  });
  writeJSON('reviews.json', reviews);
  res.json({ ok: true });
});

// --- Admin: reviews ---
apiApp.get('/api/admin/reviews', (req, res) => {
  if (!auth(req, res)) return;
  res.json(readJSON('reviews.json').reverse());
});

apiApp.delete('/api/admin/reviews/:id', (req, res) => {
  if (!auth(req, res)) return;
  let reviews = readJSON('reviews.json');
  reviews = reviews.filter(r => r.id !== Number(req.params.id));
  writeJSON('reviews.json', reviews);
  res.json({ ok: true });
});

// --- Admin: passwords ---
apiApp.get('/api/admin/passwords', (req, res) => {
  if (!auth(req, res)) return;
  res.json(readJSON('passwords.json'));
});

apiApp.post('/api/admin/passwords', (req, res) => {
  if (!auth(req, res)) return;
  const { label, value } = req.body;
  if (!label || !value) return res.status(400).json({ error: 'label and value required' });
  const passwords = readJSON('passwords.json');
  passwords.push({ id: Date.now(), label: label.trim(), value: value.trim(), timestamp: new Date().toISOString() });
  writeJSON('passwords.json', passwords);
  res.json({ ok: true });
});

apiApp.delete('/api/admin/passwords/:id', (req, res) => {
  if (!auth(req, res)) return;
  let passwords = readJSON('passwords.json');
  passwords = passwords.filter(p => p.id !== Number(req.params.id));
  writeJSON('passwords.json', passwords);
  res.json({ ok: true });
});

const API_PORT = process.env.API_PORT || process.env.PORT || 3001;
apiApp.listen(API_PORT, () => console.log(`📨 API server on port ${API_PORT}`));

const STATS_PATH = path.join(__dirname, '..', 'Rox Forms', 'dashboard', 'stats.json');

async function updateStats(client) {
  try {
    const memberIds = new Set();

    for (const [, guild] of client.guilds.cache) {
      try {
        const members = await guild.members.fetch();
        for (const [, member] of members) {
          if (!member.user.bot) memberIds.add(member.id);
        }
      } catch {}
    }

    const existing = {};
    try { Object.assign(existing, JSON.parse(fs.readFileSync(STATS_PATH, 'utf8'))); } catch {}

    existing.roxSecurity = {
      servers: client.guilds.cache.size,
      memberIds: Array.from(memberIds),
      updatedAt: new Date().toISOString()
    };

    const allIds = new Set(memberIds);
    if (existing.roxForms) {
      for (const id of existing.roxForms.memberIds || []) allIds.add(id);
    }

    existing.combined = {
      servers: (existing.roxForms?.servers || 0) + (existing.roxSecurity?.servers || 0),
      members: allIds.size,
      updatedAt: new Date().toISOString()
    };

    if (!fs.existsSync(path.dirname(STATS_PATH))) fs.mkdirSync(path.dirname(STATS_PATH), { recursive: true });
    fs.writeFileSync(STATS_PATH, JSON.stringify(existing, null, 2));
  } catch (err) {
    console.error('Error actualizando stats:', err);
  }
}
