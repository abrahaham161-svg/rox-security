# ROX SECURITY — Proyecto

## Estructura
- `index.js` — Entry point, login, command registration, presence
- `config.js` — Config from `.env`
- `.env` — Token, Client ID, Guild ID
- `commands/` — 23 slash commands
- `events/` — guildMemberAdd, interactionCreate
- `utils/` — database, logger, captcha, antiRaid, panelHandler, backupManager
- `data/` — guilds.json, backups.json

## Comandos (23)

### 🛡️ Seguridad
- `/setup` — Configurar acción, canal logs, rol verificado
- `/settings` — Ver toda la configuración
- `/autosetup` — Configuración anti-raid automática
- `/check` — Estado de un usuario en el servidor
- `/status` — Estado de la protección
- `/logs` — Últimos eventos
- `/panel` — Panel interactivo con botones

### 👮 Moderación
- `/punish` — Expulsar o bloquear un usuario
- `/whitelist` — Menú con botones: añadir/remover usuario, añadir/remover canal, listas
- `/idban` — Banear por ID (aunque no esté en el server)
- `/idunban` — Desbanear por ID
- `/lock` — Bloquear canal
- `/unlock` — Desbloquear canal
- `/clear` — Borrar mensajes (1-100)
- `/nuke` — Clonar y eliminar canal (lo deja como nuevo)

### ✅ Verificación
- `/verify` — Verificarse con código por MD

### 🔧 Utilidades
- `/ping` — Latencia del bot (websocket)
- `/server` — Información del servidor
- `/perfil` — Perfil de seguridad del usuario
- `/invite` — Invitar el bot a otros servidores
- `/backup` — Sistema de respaldo global con botones
- `/tutorial` — Guía rápida
- `/help` — Ayuda con categorías

## Panel Interactivo (`/panel`)
- 📊 Estado
- 📋 Registros
- ⚙️ Configurar
- 📜 Whitelist
- 🔨 Castigar
- ❓ Ayuda

## Sistema de Backup (`/backup`)
- **Global**: el ID funciona en cualquier servidor
- 💾 Crear — Selector múltiple (roles, canales, config server, config bot) → genera ID único
- 📂 Cargar — Pide ID, restaura todo exactamente igual
- 🔄 Actualizar — Actualiza datos del mismo ID
- ❌ Eliminar — Borra backup por ID

## Anti-Raid
- Detecta: cuentas < 1 minuto, sin avatar, bots verificados
- Acción configurable: kick o ban

## Estilo Visual
- Color: `#00d4ff` (neon cyan)
- Footer: "Rox Security v1.0"
- Timestamp en todos los embeds
- Bot status: online, "Viendo /help | Rox Security"
- Texto en español simple, para niños

## Estado Discord
- Badge (1<<23): ✅ true
- Active (1<<24): ❌ false (esperar 24-48h de uso)

## To-Do
- [ ] Premium / Dashboard
- [ ] Más comandos de RB3 si faltan
