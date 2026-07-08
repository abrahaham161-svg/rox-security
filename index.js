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

client.once('clientReady', async () => {
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
});

client.login(config.token);

// --- API server para recibir formularios ---
const express = require('express');
const cors = require('cors');
const apiApp = express();
apiApp.use(cors());
apiApp.use(express.json());

const OWNER_ID = '1133066682399739974';

apiApp.post('/api/contact', async (req, res) => {
  const { gmail, social, servicio, servicioTexto, contenido } = req.body;
  try {
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

const API_PORT = process.env.API_PORT || process.env.PORT || 3001;
apiApp.listen(API_PORT, () => console.log(`📨 API server on port ${API_PORT}`));
