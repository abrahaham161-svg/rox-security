const { REST, Routes } = require('discord.js');
require('dotenv').config();

async function run() {
  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

  const commands = await rest.get(Routes.applicationCommands(process.env.CLIENT_ID));
  console.log('✅ Comandos registrados:', commands.length);

  commands.forEach(cmd => console.log(`  /${cmd.name} → ${cmd.id}`));

  const featuredIds = commands.slice(0, 5).map(c => c.id);

  console.log('\n✅ Estableciendo comandos destacados...');
  await rest.patch(Routes.application(process.env.CLIENT_ID), {
    body: { ...featuredIds.length ? {} : {} },
  });

  const app = await rest.get(Routes.application(process.env.CLIENT_ID));
}

run().catch(console.error);
