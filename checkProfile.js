const { REST, Routes } = require('discord.js');
require('dotenv').config();

async function run() {
  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
  const appId = process.env.CLIENT_ID;

  const commands = await rest.get(Routes.applicationCommands(appId));
  console.log(`📋 Comandos globales: ${commands.length}`);
  commands.forEach(c => console.log(`   /${c.name}`));

  const cmdIds = commands.slice(0, 5).map(c => c.id);
  console.log('\n📋 Intentando establecer destacados...');
  try {
    await rest.patch(`/applications/${appId}`, {
      body: { popular_application_command_ids: cmdIds }
    });
    console.log('✅ Comandos destacados configurados!');
  } catch (e) {
    console.log(`❌ API dice: ${e.rawError?.message || e.message}`);
  }

  const app = await rest.get(`/applications/${appId}/profile`);
  console.log(`\n📋 Perfil de la app:`);
  if (app.popular_application_command_ids) {
    console.log(`   Comandos destacados: ${app.popular_application_command_ids.length}`);
  } else {
    console.log('   No hay comandos destacados aun');
  }
}

run().catch(console.error);
