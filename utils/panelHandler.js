const db = require('./database');
const log = require('./logger');
const backupCmd = require('../commands/backup');
const antiRaidCmd = require('../commands/antiraid');
const ver = require('./verificationManager');
const { ActionRowBuilder, ButtonBuilder, ButtonStyle, UserSelectMenuBuilder, ChannelSelectMenuBuilder, RoleSelectMenuBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, MessageFlags, ChannelType } = require('discord.js');

const pending = new Map();

function sep() { return '━━━━━━━━━━━━━━━━━━━━━━━━'; }

function mainPanel(guild) {
  return {
    embeds: [{
      title: '🛡️ ROX SECURITY',
      description: `${sep()}\n**¡Bienvenido al panel de control!**\n${sep()}\n\nSelecciona una opción abajo para comenzar.`,
      color: 0x00d4ff,
      footer: { text: 'Rox Security v1.0' },
      timestamp: new Date().toISOString(),
    }],
    components: [
      new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('st').setLabel('📊 Estado').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('lg').setLabel('📋 Registros').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('stp').setLabel('⚙️ Configurar').setStyle(ButtonStyle.Secondary),
      ),
      new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('wl').setLabel('📜 Whitelist').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('pu').setLabel('🔨 Castigar').setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId('hp').setLabel('❓ Ayuda').setStyle(ButtonStyle.Secondary),
      ),
    ],
  };
}

// ===== MAIN HANDLER =====
async function handle(i) {
  try {
    const id = i.customId;
    if (id === 'main') await i.update(mainPanel(i.guild));
    else if (id === 'st' || id === 'st_r') await statusView(i);
    else if (id === 'lg' || id === 'lg_r') await logsView(i);
    else if (id === 'stp') await setupView(i);
    else if (id === 'stp_v') await toggle('verifyEnabled', !(db.get(i.guild.id)?.verifyEnabled ?? true), i);
    else if (id === 'stp_a') await toggle('action', db.get(i.guild.id)?.action === 'ban' ? 'kick' : 'ban', i);
    else if (id === 'stp_m_ch') await i.update({ components: [new ActionRowBuilder().addComponents(new ChannelSelectMenuBuilder().setCustomId('sel_stp_ch').setPlaceholder('Elige un canal...').addChannelTypes(ChannelType.GuildText)), new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('stp').setLabel('◀ Volver').setStyle(ButtonStyle.Secondary))] });
    else if (id === 'stp_m_rl') await i.update({ components: [new ActionRowBuilder().addComponents(new RoleSelectMenuBuilder().setCustomId('sel_stp_rl').setPlaceholder('Elige un rol...')), new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('stp').setLabel('◀ Volver').setStyle(ButtonStyle.Secondary))] });
    else if (id.startsWith('stp_m_')) await showModal(i);
    else if (id === 'wl') await showWlMenu(i);
    else if (id === 'wl_ul') await wlList(i);
    else if (id === 'wl_ua' || id === 'wl_ur') await pickUser(i, 'wl');
    else if (id === 'wl_ca' || id === 'wl_cr') await pickChannel(i, 'wl');
    else if (id === 'wl_cl') await wlChannelList(i);
    else if (id === 'pu') await puMenu(i);
    else if (id === 'pu_k' || id === 'pu_b') await pickUser(i, 'pu');
    else if (id === 'hp') await hpMenu(i);
    else if (id.startsWith('hp_') || id === 'help_menu') await hpCat(i);
    else if (id.startsWith('cmd_')) await i.update(mainPanel(i.guild));
    else if (id.startsWith('bk_sel_up')) await backupCmd.handleUpdateSelect(i);
    else if (id.startsWith('bk_sel')) await backupCmd.handleSelect(i);
    else if (id.startsWith('mod_bk')) await backupCmd.handleModal(i);
    else if (id.startsWith('bk')) await backupCmd.handleButton(i);
    else if (id.startsWith('ar_')) {
      if (i.isModalSubmit()) await antiRaidCmd.handleModal(i);
      else await antiRaidCmd.handleButton(i);
    }
    else if (id.startsWith('ver_')) await handleVerification(i);
    else if (id === 'verify_btn') await ver.handleVerifyButton(i);
    else if (id === 'verify_showmodal') await ver.showVerifyModal(i);
    else if (id === 'verify_modal') await ver.handleVerifyModal(i);
    else if (id.startsWith('sel_')) await handleSelect(i);
    else if (id.startsWith('mod_')) await handleModal(i);
  } catch (e) {
    console.error('Panel error:', e);
    try { if (!i.replied && !i.deferred) await i.reply({ content: 'Error al procesar', flags: MessageFlags.Ephemeral }); } catch {}
  }
}

// ===== ESTADO =====
async function statusView(i) {
  const c = db.get(i.guild.id) || {};
  const on = c.verifyEnabled !== false;
  await i.update({
    embeds: [{
      title: '📊 ESTADO DEL SERVIDOR',
      description: `${sep()}\nResumen actual de la protección.\n${sep()}`,
      color: on ? 0x00ff88 : 0xffaa00,
      fields: [
        { name: '👥 Miembros', value: `**${i.guild.memberCount}** personas`, inline: true },
        { name: '🛡️ Protección', value: on ? '✅ **Activada**' : '⛔ **En pausa**', inline: true },
        { name: '📋 Registros', value: `**${(c.logs||[]).length}** eventos`, inline: true },
        { name: '📜 Whitelist', value: `**${(c.whitelist||[]).length}** usuarios`, inline: true },
        { name: '⚡ Acción', value: `**${c.action||'kick'}** al detectar raid`, inline: false },
      ],
      footer: { text: 'Rox Security v1.0' },
      timestamp: new Date().toISOString(),
    }],
    components: [new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('st_r').setLabel('🔄 Actualizar').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId('main').setLabel('◀ Menú').setStyle(ButtonStyle.Secondary),
    )],
  });
}

// ===== REGISTROS =====
async function logsView(i) {
  const c = db.get(i.guild.id) || {};
  const logs = c.logs || [];
  const icons = { raid:'🚨', punish:'🔨', info:'📩', warn:'⚠️', error:'❌', success:'✅' };
  const desc = logs.length
    ? logs.slice(-10).reverse().map(l => `${icons[l.type]||'📋'} **${l.title}**`).join('\n')
    : `📭 No hay eventos registrados aún.\nCuando alguien entre o haya actividad, aquí aparecerá.`;

  await i.update({
    embeds: [{
      title: '📋 REGISTROS',
      description: `${sep()}\nEventos recientes del servidor.\n${sep()}\n\n${desc}`,
      color: 0x00d4ff,
      footer: { text: 'Rox Security v1.0' },
      timestamp: new Date().toISOString(),
    }],
    components: [new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('lg_r').setLabel('🔄 Actualizar').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('main').setLabel('◀ Menú').setStyle(ButtonStyle.Secondary),
    )],
  });
}

// ===== CONFIGURAR =====
async function setupView(i) {
  const c = db.get(i.guild.id) || {};
  await i.update({
    embeds: [{
      title: '⚙️ CONFIGURACIÓN',
      description: `${sep()}\nAjustes generales del servidor.\n${sep()}`,
      color: 0x00d4ff,
      fields: [
        { name: '⚡ Acción antiraid', value: `**${c.action||'kick'}** al detectar raid`, inline: true },
        { name: '✅ Verificación', value: (c.verifyEnabled!==false)?'**Activada**':'**Desactivada**', inline: true },
        { name: '📢 Canal de logs', value: c.logChannel ? `<#${c.logChannel}>` : '❌ No configurado', inline: false },
        { name: '🎖️ Rol verificado', value: c.verifiedRole ? `<@&${c.verifiedRole}>` : '❌ No configurado', inline: true },
      ],
      footer: { text: 'Rox Security v1.0' },
      timestamp: new Date().toISOString(),
    }],
    components: [
      new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('stp_a').setLabel('🔄 Cambiar acción').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('stp_v').setLabel('🔄 Verificación').setStyle(ButtonStyle.Secondary),
      ),
      new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('stp_m_ch').setLabel('📢 Canal logs').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('stp_m_rl').setLabel('🎖️ Rol verificado').setStyle(ButtonStyle.Secondary),
      ),
      new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('main').setLabel('◀ Menú').setStyle(ButtonStyle.Danger),
      ),
    ],
  });
}

async function toggle(key, val, i) {
  const c = db.get(i.guild.id) || {};
  c[key] = val;
  if (!c.guildName) c.guildName = i.guild.name;
  db.set(i.guild.id, c);
  const label = key === 'verifyEnabled' ? 'Verificación' : 'Acción';
  const display = key === 'verifyEnabled' ? (val ? '✅ Activada' : '⛔ Desactivada') : (val ? 'ban' : 'kick');
  await i.update({
    embeds: [{
      title: '✅ Cambiado',
      description: `${sep()}\n**${label}:** ${display}\n${sep()}`,
      color: 0x00ff88,
      footer: { text: 'Rox Security v1.0' },
    }],
    components: [new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('stp').setLabel('◀ Volver').setStyle(ButtonStyle.Secondary))],
  });
}

async function showModal(i) {
  // Ya no se usa para joins limits, se deja por compatibilidad
}

// ===== WHITELIST =====
function wlMenu(guild, client) {
  const c = db.get(guild.id) || {};
  const isUpdate = !!client;
  const data = {
    embeds: [{
      title: '📜 WHITELIST',
      description: `${sep()}\nUsuarios y canales que omiten la verificación.\n${sep()}\n\n👤 Usuarios: **${(c.whitelist||[]).length}**\n📢 Canales: **${(c.canalWhite||[]).length}**`,
      color: 0x00d4ff,
      footer: { text: 'Rox Security v1.0' },
      timestamp: new Date().toISOString(),
    }],
    components: [
      new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('wl_ul').setLabel('📋 Lista usuarios').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('wl_ua').setLabel('➕ Añadir usuario').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('wl_ur').setLabel('➖ Remover usuario').setStyle(ButtonStyle.Danger),
      ),
      new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('wl_ca').setLabel('📢 Añadir canal').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('wl_cr').setLabel('📢 Remover canal').setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId('wl_cl').setLabel('📋 Lista canales').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('main').setLabel('◀ Menú').setStyle(ButtonStyle.Secondary),
      ),
    ],
  };
  return data;
}

async function showWlMenu(i) {
  await i.update(wlMenu(i.guild));
}

async function wlList(i) {
  const c = db.get(i.guild.id) || {};
  const wl = c.whitelist || [];
  if (!wl.length) {
    return i.update({ embeds: [{ title:'📋 WHITELIST', description:`${sep()}\n📭 No hay usuarios en la lista.\n${sep()}`, color:0x00d4ff, footer:{text:'Rox Security v1.0'}, timestamp: new Date().toISOString() }], components: [backBtn('wl')] });
  }
  const users = (await Promise.all(wl.slice(0, 20).map(id => i.client.users.fetch(id).catch(() => null)))).filter(Boolean);
  await i.update({ embeds: [{
    title: '📋 WHITELIST — USUARIOS',
    description: `${sep()}\n**Total:** ${wl.length} usuarios\n${sep()}\n${users.map(u => `👤 <@${u.id}> ─ **${u.tag}**`).join('\n')}${wl.length > 20 ? `\n... y ${wl.length - 20} más` : ''}`,
    color: 0x00d4ff,
    footer: { text: 'Rox Security v1.0' },
    timestamp: new Date().toISOString(),
  }], components: [backBtn('wl')] });
}

async function wlChannelList(i) {
  const c = db.get(i.guild.id) || {};
  const canals = c.canalWhite || [];
  if (!canals.length) {
    return i.update({ embeds: [{ title:'📢 CANALES WHITELIST', description:`${sep()}\n📭 No hay canales en la lista.\n${sep()}`, color:0x00d4ff, footer:{text:'Rox Security v1.0'}, timestamp: new Date().toISOString() }], components: [backBtn('wl')] });
  }
  await i.update({ embeds: [{
    title: '📢 WHITELIST — CANALES',
    description: `${sep()}\n**Total:** ${canals.length} canales\n${sep()}\n${canals.map(id => `📌 <#${id}>`).join('\n')}`,
    color: 0x00d4ff,
    footer: { text: 'Rox Security v1.0' },
    timestamp: new Date().toISOString(),
  }], components: [backBtn('wl')] });
}

async function pickUser(i, prefix) {
  const id = i.customId;
  const action = id.length > 4 ? id.slice(-2) : id.slice(-1);
  const sel = new UserSelectMenuBuilder().setCustomId('sel_'+prefix+'_'+action).setPlaceholder('Elige un usuario...');
  await i.update({ components: [new ActionRowBuilder().addComponents(sel), new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId(prefix).setLabel('◀ Volver').setStyle(ButtonStyle.Secondary))] });
}

async function pickChannel(i, prefix) {
  const id = i.customId;
  const action = id.length > 4 ? id.slice(-2) : id.slice(-1);
  const sel = new ChannelSelectMenuBuilder().setCustomId('sel_'+prefix+'_'+action).setPlaceholder('Elige un canal...').addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement);
  await i.update({ components: [new ActionRowBuilder().addComponents(sel), new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId(prefix).setLabel('◀ Volver').setStyle(ButtonStyle.Secondary))] });
}

// ===== CASTIGAR =====
async function puMenu(i) {
  await i.update({
    embeds: [{
      title: '🔨 CASTIGAR',
      description: `${sep()}\nSelecciona una acción contra un usuario.\n${sep()}\n\n👢 Expulsar (Kick) — lo saca del servidor\n🔨 Bloquear (Ban) — lo banea permanentemente`,
      color: 0xff4444,
      footer: { text: 'Rox Security v1.0' },
      timestamp: new Date().toISOString(),
    }],
    components: [new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('pu_k').setLabel('👢 Expulsar (Kick)').setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId('pu_b').setLabel('🔨 Bloquear (Ban)').setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId('main').setLabel('◀ Menú').setStyle(ButtonStyle.Secondary),
    )],
  });
}

// ===== AYUDA =====
async function hpMenu(i) {
  await i.update({
    embeds: [{
      title: '❓ AYUDA',
      description: `${sep()}\nElige una categoría para ver los comandos.\n${sep()}`,
      color: 0x00d4ff,
      footer: { text: 'Rox Security v1.0' },
      timestamp: new Date().toISOString(),
    }],
    components: [
      new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('hp_sg').setLabel('🛡️ Seguridad').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('hp_md').setLabel('👮 Moderación').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('hp_vr').setLabel('✅ Verificación').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('hp_ut').setLabel('🔧 Utilidades').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('hp_td').setLabel('📋 Todos').setStyle(ButtonStyle.Secondary),
      ),
      new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('main').setLabel('◀ Menú Principal').setStyle(ButtonStyle.Secondary),
      ),
    ],
  });
}

async function hpCat(i) {
  let k;
  if (i.customId === 'help_menu') k = ({ seguridad:'sg', moderacion:'md', verificacion:'vr', todos:'td', utilidades:'ut' })[i.values[0]] || 'td';
  else k = i.customId.split('_')[1];
    const cats = {
    sg: { t:'🛡️ SEGURIDAD', c:0x00d4ff, d:`${sep()}\nProtege tu servidor contra raids y accesos no deseados.\n${sep()}`, f:[{n:'/setup', v:'Configurar la protección'},{n:'/antiraid', v:'Anti-raid con botones'},{n:'/settings', v:'Ver toda la configuración'},{n:'/check', v:'Estado de un usuario'},{n:'/status', v:'Estado de la protección'},{n:'/logs', v:'Ver eventos guardados'}] },
    md: { t:'👮 MODERACIÓN', c:0xff6600, d:`${sep()}\nMantén el orden con herramientas de moderación.\n${sep()}`, f:[{n:'/punish', v:'Expulsar o bloquear'},{n:'/idban', v:'Banear por ID'},{n:'/idunban', v:'Desbanear por ID'},{n:'/lock', v:'Bloquear canal'},{n:'/unlock', v:'Desbloquear canal'},{n:'/clear', v:'Borrar mensajes'},{n:'/nuke', v:'Resetear canal'}] },
    vr: { t:'✅ VERIFICACIÓN', c:0x00ff88, d:`${sep()}\nEvita bots y usuarios no deseados.\n${sep()}`, f:[{n:'/verificacion', v:'Configurar el sistema'},{n:'/whitelist', v:'Añadir/remover usuarios y canales en whitelist'}] },
    ut: { t:'🔧 UTILIDADES', c:0x3498db, d:`${sep()}\nInformación del servidor y herramientas útiles.\n${sep()}`, f:[{n:'/ping', v:'Latencia del bot'},{n:'/server', v:'Info del servidor'},{n:'/perfil', v:'Tu perfil de seguridad'},{n:'/invite', v:'Invitar el bot'},{n:'/backup', v:'Respaldar configuración'},{n:'/tutorial', v:'Guía rápida'}] },
    td: { t:'📋 TODOS LOS COMANDOS', c:0x00d4ff, d:`${sep()}\nTodos los comandos disponibles.\n${sep()}`, f:[{n:'🛡️ Seguridad', v:'/panel /setup /settings /check /status /logs'},{n:'👮 Moderación', v:'/punish /whitelist /idban /idunban /lock /unlock /clear /nuke'},{n:'✅ Verificación', v:'/verificacion'},{n:'🔧 Utilidades', v:'/ping /server /perfil /invite /backup /tutorial /help'}] },
  };
  const cat = cats[k];
  await i.update({
    embeds: [{ title: cat.t, description: cat.d, color: cat.c, fields: cat.f.map(x => ({ name: x.n, value: x.v, inline: true })), footer: { text: 'Rox Security v1.0' }, timestamp: new Date().toISOString() }],
    components: [new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('hp').setLabel('◀ Volver').setStyle(ButtonStyle.Secondary))],
  });
}

// ===== SELECT MENU =====
async function handleSelect(i) {
  const [_, prefix, action] = i.customId.split('_');
  const uid = i.values[0];
  const c = db.get(i.guild.id) || {};
  if (!c.whitelist) c.whitelist = [];

  if (prefix === 'wl') {
    if (action === 'ua' || action === 'ur') {
      const user = await i.client.users.fetch(uid).catch(() => null);
      if (!user) return i.update({ embeds: [{ title:'❌ Error', description:`${sep()}\nNo encontré a ese usuario.\n${sep()}`, color:0xff4444, footer:{text:'Rox Security v1.0'} }], components: [backBtn('wl')] });
      if (action === 'ua') {
        if (c.whitelist.includes(uid)) return i.update({ embeds: [{ title:'⚠️ Ya está', description:`${sep()}\n**${user.tag}** ya está en la whitelist.\n${sep()}`, color:0xffaa00, footer:{text:'Rox Security v1.0'} }], components: [backBtn('wl')] });
        c.whitelist.push(uid);
        db.set(i.guild.id, c);
        await log.sendLog(i.guild, 'success', '✅ Whitelist +', `**${user.tag}** agregado por ${i.user.tag}`);
        return i.update({ embeds: [{ title:'✅ Agregado', description:`${sep()}\n**${user.tag}** ya no necesita verificarse.\n${sep()}\n\n👥 Total: **${c.whitelist.length}** usuarios`, color:0x00ff88, footer:{text:'Rox Security v1.0'} }], components: [backBtn('wl')] });
      } else {
        if (!c.whitelist.includes(uid)) return i.update({ embeds: [{ title:'⚠️ No está', description:`${sep()}\n**${user.tag}** no está en la whitelist.\n${sep()}`, color:0xffaa00, footer:{text:'Rox Security v1.0'} }], components: [backBtn('wl')] });
        c.whitelist = c.whitelist.filter(id => id !== uid);
        db.set(i.guild.id, c);
        await log.sendLog(i.guild, 'warn', '🗑️ Whitelist -', `**${user.tag}** quitado por ${i.user.tag}`);
        return i.update({ embeds: [{ title:'🗑️ Quitado', description:`${sep()}\n**${user.tag}** ahora necesita verificarse.\n${sep()}\n\n👥 Total: **${c.whitelist.length}** usuarios`, color:0xff6644, footer:{text:'Rox Security v1.0'} }], components: [backBtn('wl')] });
      }
    } else {
      if (!c.canalWhite) c.canalWhite = [];
      const chName = i.guild.channels.cache.get(uid)?.name || uid;
      if (action === 'ca') {
        if (c.canalWhite.includes(uid)) return i.update({ embeds: [{ title:'⚠️ Ya está', description:`${sep()}\n#${chName} ya está en la whitelist.\n${sep()}`, color:0xffaa00, footer:{text:'Rox Security v1.0'} }], components: [backBtn('wl')] });
        c.canalWhite.push(uid);
        db.set(i.guild.id, c);
        await log.sendLog(i.guild, 'info', '📢 CanalWhite +', `#${chName} agregado por ${i.user.tag}`);
        return i.update({ embeds: [{ title:'✅ Canal agregado', description:`${sep()}\n<#${uid}> ya no tiene restricciones.\n${sep()}\n\n📢 Total: **${c.canalWhite.length}** canales`, color:0x00ff88, footer:{text:'Rox Security v1.0'} }], components: [backBtn('wl')] });
      } else {
        if (!c.canalWhite.includes(uid)) return i.update({ embeds: [{ title:'⚠️ No está', description:`${sep()}\n#${chName} no está en la whitelist.\n${sep()}`, color:0xffaa00, footer:{text:'Rox Security v1.0'} }], components: [backBtn('wl')] });
        c.canalWhite = c.canalWhite.filter(id => id !== uid);
        db.set(i.guild.id, c);
        await log.sendLog(i.guild, 'warn', '📢 CanalWhite -', `#${chName} quitado por ${i.user.tag}`);
        return i.update({ embeds: [{ title:'🗑️ Canal quitado', description:`${sep()}\n<#${uid}> ahora tiene restricciones.\n${sep()}\n\n📢 Total: **${c.canalWhite.length}** canales`, color:0xff6644, footer:{text:'Rox Security v1.0'} }], components: [backBtn('wl')] });
      }
    }
  }

  if (prefix === 'pu') {
    const member = await i.guild.members.fetch(uid).catch(() => null);
    if (!member || !member.moderatable) return i.update({ embeds: [{ title:'❌ Error', description:`${sep()}\nNo puedo castigar a ese usuario.\nMi rol debe estar **arriba** del suyo en la jerarquía.\n${sep()}`, color:0xff4444, footer:{text:'Rox Security v1.0'} }], components: [backBtn('pu')] });
    const act = action === 'k' ? 'kick' : 'ban';
    pending.set(i.user.id, { action: act, userId: uid });
    const modal = new ModalBuilder().setCustomId('mod_rs').setTitle(`✏️ Motivo para ${act==='kick'?'expulsar':'bloquear'}`);
    modal.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('razon').setLabel('¿Por qué? (opcional)').setStyle(TextInputStyle.Short).setRequired(false).setMaxLength(200)));
    await i.showModal(modal);
  }

  if (prefix === 'stp') {
    const key = action === 'ch' ? 'logChannel' : 'verifiedRole';
    const c = db.get(i.guild.id) || {};
    c[key] = uid;
    db.set(i.guild.id, c);
    const label = key === 'logChannel' ? '📢 Canal de logs' : '🎖️ Rol verificado';
    await i.update({ embeds: [{ title:'✅ Guardado', description:`${sep()}\n**${label}** configurado correctamente.\n${sep()}`, color:0x00ff88, footer:{text:'Rox Security v1.0'} }], components: [backBtn('stp')] });
  }
}

// ===== MODAL =====
async function handleModal(i) {
  const field = i.customId.split('_')[1];
  const val = i.fields.getTextInputValue('val');

  if (field === 'rs') {
    const data = pending.get(i.user.id);
    if (!data) return i.reply({ embeds: [{ title:'❌ Expirado', description:`${sep()}\nEsto expiró. Intenta de nuevo desde el menú.\n${sep()}`, color:0xff4444, footer:{text:'Rox Security v1.0'} }], flags: MessageFlags.Ephemeral });
    pending.delete(i.user.id);
    const razon = i.fields.getTextInputValue('razon') || 'Sin motivo';
    const member = await i.guild.members.fetch(data.userId).catch(() => null);
    if (!member || !member.moderatable) return i.reply({ embeds: [{ title:'❌ Error', description:`${sep()}\nNo se puede castigar a ese usuario.\n${sep()}`, color:0xff4444, footer:{text:'Rox Security v1.0'} }], flags: MessageFlags.Ephemeral });
    try {
      if (data.action === 'ban') await member.ban({ reason: `[Rox Security] ${razon}` });
      else await member.kick(`[Rox Security] ${razon}`);
      await log.sendLog(i.guild, 'punish', '🔨 Castigo', `**${member.user.tag}** ${data.action} por ${i.user.tag}\n**Motivo:** ${razon}`);
      const actionLabel = data.action === 'ban' ? '🔨 Bloqueado' : '👢 Expulsado';
      await i.reply({ embeds: [{ title: actionLabel, description: `${sep()}\n**${member.user.tag}** fue ${data.action === 'ban' ? 'bloqueado' : 'expulsado'}.\n${sep()}\n\n📝 **Motivo:** ${razon}`, color: data.action === 'ban' ? 0xff4444 : 0xff6600, footer: { text: 'Rox Security v1.0' } }], flags: MessageFlags.Ephemeral });
    } catch (err) {
      await i.reply({ embeds: [{ title:'❌ Error', description:`${sep()}\n${err.message}\n${sep()}`, color:0xff4444, footer:{text:'Rox Security v1.0'} }], flags: MessageFlags.Ephemeral });
    }
  }
}

function backBtn(dest) {
  return new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId(dest).setLabel('◀ Volver').setStyle(ButtonStyle.Secondary));
}

// ===== VERIFICACIÓN =====
async function handleVerification(i) {
  const id = i.customId;
  if (id === 'ver_main') await ver.showVerPanel(i);
  else if (id === 'ver_activate') await ver.showActivateMenu(i);
  else if (id === 'ver_settime') await ver.showTimeMenu(i);
  else if (id === 'ver_time_modal') await ver.handleTimeModal(i);
  else if (id === 'ver_setaction') await ver.toggleAction(i);
  else if (id === 'ver_setrole') await ver.showRoleSelector(i);
  else if (id === 'ver_selrole') await ver.handleRoleSelect(i);
  else if (id === 'ver_setnoverified') await ver.showNoVerifiedMenu(i);
  else if (id === 'ver_dosave') await ver.activateVerification(i);
  else if (id === 'ver_channel') await ver.showChannelMenu(i);
  else if (id === 'ver_selchannel') await ver.handleChannelSelect(i);
  else if (id === 'ver_createchannel') await ver.createChannel(i);
  else if (id === 'ver_savechannel') await ver.saveChannelConfig(i);
  else if (id === 'ver_deactivate') await ver.deactivateVerification(i);
  else if (id === 'ver_changerol') await ver.showChangeRoleMenu(i);
  else if (id === 'ver_selnewrole') await ver.handleNewRoleSelect(i);
  else if (id === 'ver_createrole') await ver.createNewRole(i);
  else if (id === 'ver_noverified') await ver.showNoVerifiedMenu(i);
  else if (id === 'ver_selnoverified') await ver.handleNoVerifiedRoleSelect(i);
  else if (id === 'ver_createnoverified') await ver.createNoVerifiedRole(i);
  else if (id === 'ver_embed') await ver.showEmbedEditor(i);
  else if (id === 'ver_saveembed') await ver.saveEmbed(i);
  else if (id === 'ver_sendembed') await ver.sendEmbedToChannel(i);
}

module.exports = { handle, mainPanel, wlMenu };
