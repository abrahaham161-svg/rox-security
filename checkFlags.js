const { REST, Routes } = require('discord.js');
require('dotenv').config();

async function run() {
  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
  const appId = process.env.CLIENT_ID;

  const app = await rest.get(Routes.applicationCommands(appId));
  
  const me = await rest.get(`/applications/@me`);
  console.log(`App: ${me.name}`);
  console.log(`Flags: ${me.flags} (${me.flags?.toString(2)})`);
  console.log(`Badge (1<<23): ${Boolean(me.flags & (1 << 23))}`);
  console.log(`Active (1<<24): ${Boolean(me.flags & (1 << 24))}`);
  console.log(`Popular commands:`, me.popular_application_command_ids || 'none');
}

run().catch(e => console.log('Error:', e.message));
