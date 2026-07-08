# ROX SECURITY — Historial del Chat

## Inicio
- Bot antiraid "Rox Security" para Discord
- Debe parecerse a RB3 Guard pero en español y con panel de botones
- Tecnología: Discord.js v14, JSON database, Node.js

## Decisiones Clave
- PanelHandler.js como interacción principal
- Botones + Select Menus + Modals para todo
- Comandos slash como alternativa

## Comandos Añadidos (en orden)
1. **check** — Ver estado de un usuario
2. **ping** — Latencia (websocket)
3. **lock/unlock** — Bloquear/desbloquear canal
4. **clear** — Borrar mensajes
5. **nuke** — Clonar y eliminar canal
6. **idban/idunban** — Banear por ID
7. **canalwhite/delcanalwhite/listcanalwhite** — Integrados en whitelist después
8. **settings** — Ver configuración completa
9. **invite** — Invitar bot
10. **server** — Info del servidor
11. **perfil** — Perfil de seguridad
12. **backup** — Sistema de respaldo global
13. **tutorial** — Guía rápida
14. **autosetup** — Configuración automática

## Cambios Importantes

### ❌ Límites de joins eliminados
- `/setup` limpiado (solo acción, canal logs, rol verificado)
- `antiRaid.js` simplificado (solo cuentas <1min, sin avatar, bots)
- `status.js`, `settings.js`, `panelHandler.js` actualizados
- `config.js` defaults limpiados

### 🔄 CanalWhite integrado en /whitelist
- `/canalwhite`, `/delcanalwhite`, `/listcanalwhite` eliminados
- `/whitelist` ahora tiene 6 botones: añadir/remover usuario, añadir/remover canal, listas
- Botón wl abre menú con todo

### 💾 Backup completo
- `backupManager.js` con guardar/cargar/actualizar/eliminar
- 4 botones en `/backup`
- Selector múltiple para elegir qué guardar
- Backups globales (funcionan entre servidores)
- Restaura roles, canales, config server, config bot

### ✅ "◀ Volver" en todos lados
- pickUser, pickChannel, stp_m_ch, stp_m_rl
- Todas las vistas tienen back button
- Resultados de acciones tienen ◀ Volver

### 🔧 Fixes
- ping: cambiado a websocket (más real)
- invite: "protegerme" → "protegerte"
- help: "Botón en el panel" → comandos reales
- pickUser/pickChannel: fix action 2 chars

## Bugs Conocidos
- Active (1<<24): false — esperar 24-48h de uso para flags de Discord

## Pendiente
- Premium / Dashboard
- Verificar si faltan comandos de RB3
