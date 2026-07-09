const fs = require('fs');
const path = require('path');
const database = require('./database');
const logger = require('./logger');

const BACKUP_FILE = path.join(__dirname, '..', 'data', 'backups.json');
const DATA_DIR = path.join(__dirname, '..', 'data');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

let cache = {};
if (fs.existsSync(BACKUP_FILE)) {
  try { cache = JSON.parse(fs.readFileSync(BACKUP_FILE, 'utf8')); } catch { cache = {}; }
}

function save() {
  fs.writeFileSync(BACKUP_FILE, JSON.stringify(cache, null, 2));
}

function generateId() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let id;
  do {
    id = '';
    for (let i = 0; i < 8; i++) id += chars.charAt(Math.floor(Math.random() * chars.length));
  } while (cache[id]);
  return id;
}

async function createBackup(guild, options) {
  const tStart = Date.now();
  const data = {};
  const guildData = database.get(guild.id) || {};

  if (options.roles) {
    console.time('backup:roles');
    data.roles = guild.roles.cache
      .filter(r => r.id !== guild.id)
      .map(r => ({
        id: r.id,
        name: r.name,
        color: r.color,
        hoist: r.hoist,
        mentionable: r.mentionable,
        permissions: r.permissions.bitfield.toString(),
        position: r.position,
        icon: r.icon ? r.icon : null,
        unicodeEmoji: r.unicodeEmoji || null,
      }));
    console.timeEnd('backup:roles');
  }

  if (options.channels) {
    console.time('backup:channels');
    data.channels = guild.channels.cache
      .map(c => ({
        id: c.id,
        name: c.name,
        type: c.type,
        topic: c.topic || null,
        nsfw: c.nsfw || false,
        bitrate: c.bitrate || null,
        userLimit: c.userLimit || 0,
        parentId: c.parentId,
        position: c.position,
        slowMode: c.rateLimitPerUser || 0,
        permissionOverwrites: c.permissionOverwrites.cache.map(o => ({
          id: o.id,
          type: o.type,
          allow: o.allow.bitfield.toString(),
          deny: o.deny.bitfield.toString(),
        })),
      }));
    console.timeEnd('backup:channels');
  }

  if (options.server) {
    console.time('backup:server');
    const iconUrl = guild.iconURL({ size: 256 });
    let iconBase64 = null;
    if (iconUrl) {
      try {
        const ctrl = new AbortController();
        setTimeout(() => ctrl.abort(), 5000);
        const res = await fetch(iconUrl, { signal: ctrl.signal });
        const buf = Buffer.from(await res.arrayBuffer());
        iconBase64 = buf.toString('base64');
      } catch {}
    }
    data.server = {
      name: guild.name,
      iconBase64,
      description: guild.description || null,
    };
    console.timeEnd('backup:server');
  }

  if (options.members) {
    console.time('backup:members');
    data.members = {};
    for (const [, member] of guild.members.cache) {
      if (member.user.bot) continue;
      const roles = member.roles.cache.filter(r => r.id !== guild.id).map(r => r.id);
      if (roles.length > 0) data.members[member.id] = roles;
    }
    console.timeEnd('backup:members');
  }

  if (options.botConfig) {
    const clean = { ...guildData };
    delete clean.logs;

    // Resolve names for role/channel IDs so restore can find them in another server
    if (clean.verifiedRole) {
      const r = guild.roles.cache.get(clean.verifiedRole);
      clean._verifiedRoleName = r ? r.name : null;
    }
    if (clean.noVerifiedRole) {
      const r = guild.roles.cache.get(clean.noVerifiedRole);
      clean._noVerifiedRoleName = r ? r.name : null;
    }
    if (clean.verifyChannel) {
      const ch = guild.channels.cache.get(clean.verifyChannel);
      clean._verifyChannelName = ch ? ch.name : null;
    }
    if (clean.logChannel) {
      const ch = guild.channels.cache.get(clean.logChannel);
      clean._logChannelName = ch ? ch.name : null;
    }

    data.botConfig = clean;
  }

  console.log(`⏱️ Backup creado en ${Date.now() - tStart}ms (roles:${data.roles?.length||0}, canales:${data.channels?.length||0}, miembros:${Object.keys(data.members||{}).length})`);
  const id = generateId();
  cache[id] = {
    id,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    creatorId: guild.ownerId || 'unknown',
    creatorTag: guild.members.cache.get(guild.ownerId)?.user?.tag || 'Desconocido',
    sourceGuildId: guild.id,
    sourceGuildName: guild.name,
    data,
    options,
  };
  save();
  return id;
}

async function deleteBackup(backupId) {
  if (!cache[backupId]) return false;
  delete cache[backupId];
  save();
  return true;
}

async function updateBackup(backupId, guild, options) {
  if (!cache[backupId]) return null;
  const newId = await createBackup(guild, options);
  cache[backupId].data = cache[newId].data;
  cache[backupId].options = options;
  cache[backupId].updatedAt = Date.now();
  delete cache[newId];
  save();
  return backupId;
}

async function loadBackup(backupId, guild) {
  const backup = cache[backupId];
  if (!backup) return { success: false, error: '❌ ID no existe' };

  const data = backup.data;
  const results = [];
  const botMember = await guild.members.fetch(guild.client.user.id).catch(() => null);
  const botRole = botMember ? botMember.roles.highest : null;

  const roleMap = new Map();
  roleMap.set(backup.sourceGuildId, guild.id);

  // ============ ROLES ============
  if (data.roles) {
    console.time('restore:roles');
    try {
      const deletable = guild.roles.cache.filter(r => !r.managed && r.id !== guild.id && botRole && r.position < botRole.position);
      await Promise.all(Array.from(deletable.values(), role =>
        role.delete('Rox Security - Backup restore').catch(() => {})
      ));

      const sorted = data.roles.sort((a, b) => a.position - b.position);
      const BATCH = 10;
      for (let i = 0; i < sorted.length; i += BATCH) {
        const batch = sorted.slice(i, i + BATCH);
        await Promise.allSettled(batch.map(r =>
          guild.roles.create({
            name: r.name,
            color: r.color || 0x808080,
            hoist: r.hoist || false,
            mentionable: r.mentionable || false,
            permissions: BigInt(r.permissions || '0'),
            reason: 'Rox Security - Backup restore',
          }).then(created => { if (r.id) roleMap.set(r.id, created.id); })
        ));
      }

      results.push('✅ Roles restaurados');
    } catch (e) { results.push('❌ Roles: ' + e.message); }
    console.timeEnd('restore:roles');
  }

  // ============ CANALES ============
  if (data.channels) {
    console.time('restore:channels');
    try {
      const chans = Array.from(guild.channels.cache.values());
      await Promise.all(chans.map(c =>
        c.delete('Rox Security - Backup restore').catch(() => {})
      ));

      const guildId = guild.id;
      const validRoles = new Set(guild.roles.cache.keys());

      function filterPerms(ow) {
        return ow
          .filter(o => {
            if (o.type === 1) return false; // skip member overwrites
            const resolved = roleMap.get(o.id) || o.id;
            return resolved === guildId || validRoles.has(resolved);
          })
          .map(o => {
            const id = roleMap.get(o.id) || o.id;
            return { id, type: o.type, allow: BigInt(o.allow || '0'), deny: BigInt(o.deny || '0') };
          });
      }

      const categories = data.channels.filter(ch => ch.type === 4).sort((a, b) => a.position - b.position);
      const others = data.channels.filter(ch => ch.type !== 4).sort((a, b) => a.position - b.position);
      const catMap = new Map();

      const BATCH = 10;
      for (let i = 0; i < categories.length; i += BATCH) {
        const batch = categories.slice(i, i + BATCH);
        await Promise.allSettled(batch.map(cat =>
          guild.channels.create({
            name: cat.name, type: 4,
            permissionOverwrites: filterPerms(cat.permissionOverwrites || []),
            reason: 'Rox Security - Backup restore',
          }).then(created => { if (cat.id) catMap.set(cat.id, created.id); })
            .catch(e => { results.push('⚠️ Categoría "' + cat.name + '": ' + e.message); })
        ));
      }

      for (let i = 0; i < others.length; i += BATCH) {
        const batch = others.slice(i, i + BATCH);
        await Promise.allSettled(batch.map(ch =>
          guild.channels.create({
            name: ch.name, type: ch.type, topic: ch.topic, nsfw: ch.nsfw || false,
            bitrate: ch.bitrate || null, userLimit: ch.userLimit || 0,
            parent: catMap.get(ch.parentId) || null,
            rateLimitPerUser: ch.slowMode || 0,
            permissionOverwrites: filterPerms(ch.permissionOverwrites || []),
            reason: 'Rox Security - Backup restore',
          }).catch(e => { results.push('⚠️ Canal "' + ch.name + '": ' + e.message); })
        ));
      }
      results.push('✅ Canales restaurados');
    } catch (e) { results.push('❌ Canales: ' + e.message); }
    console.timeEnd('restore:channels');
  }

  // ============ SERVER ============
  if (data.server) {
    try {
      const opts = {};
      if (data.server.name) opts.name = data.server.name;
      if (data.server.description) opts.description = data.server.description;
      if (data.server.iconBase64) {
        try { opts.icon = Buffer.from(data.server.iconBase64, 'base64'); } catch {}
      }
      await guild.edit(opts);
      results.push('✅ Configuración del servidor restaurada');
    } catch (e) { results.push('❌ Servidor: ' + e.message); }
  }

  // ============ BOT CONFIG ============
  if (data.botConfig) {
    try {
      const cfg = { ...data.botConfig };
      cfg.guildName = guild.name;

      // Resolve role/channel IDs by name in the new server
      const resolveId = (name) => {
        if (!name) return null;
        const role = guild.roles.cache.find(r => r.name === name);
        if (role) return role.id;
        const ch = guild.channels.cache.find(c => c.name === name);
        if (ch) return ch.id;
        return null;
      };

      cfg.verifiedRole = cfg._verifiedRoleName ? resolveId(cfg._verifiedRoleName) : null;
      cfg.noVerifiedRole = cfg._noVerifiedRoleName ? resolveId(cfg._noVerifiedRoleName) : null;
      cfg.verifyChannel = cfg._verifyChannelName ? resolveId(cfg._verifyChannelName) : null;
      cfg.logChannel = cfg._logChannelName ? resolveId(cfg._logChannelName) : null;

      // Canal whitelist: map old channel IDs to new ones by name
      if (cfg.canalWhite && Array.isArray(cfg.canalWhite)) {
        const oldIds = [...cfg.canalWhite];
        cfg.canalWhite = oldIds.map(id => {
          const ch = guild.channels.cache.find(c => c.id === id || c.name === data.channels?.find(dc => dc.id === id)?.name);
          return ch ? ch.id : null;
        }).filter(Boolean);
      }

      // Clean up internal fields
      delete cfg._verifiedRoleName;
      delete cfg._noVerifiedRoleName;
      delete cfg._verifyChannelName;
      delete cfg._logChannelName;

      database.set(guild.id, cfg);
      results.push('✅ Configuración del bot restaurada');
    } catch (e) { results.push('❌ Bot config: ' + e.message); }
  }

  // ============ MIEMBROS ============
  if (data.members) {
    try {
      const entries = Object.entries(data.members);
      let attempted = 0;
      const memberTasks = [];
      for (const [userId, oldRoleIds] of entries) {
        const member = guild.members.cache.get(userId);
        if (!member) continue;
        const newRoles = oldRoleIds.map(id => roleMap.get(id)).filter(Boolean);
        if (newRoles.length > 0) {
          memberTasks.push(member.roles.add(newRoles, 'Rox Security - Backup restore').catch(() => {}));
          attempted++;
        }
      }
      const restored = (await Promise.allSettled(memberTasks)).filter(r => r.status === 'fulfilled').length;
      const skipped = Object.keys(data.members).length - attempted;
      results.push(`✅ Roles de ${restored} miembros restaurados` + (skipped > 0 ? ` (${skipped} no están en el servidor)` : ''));
    } catch (e) { results.push('❌ Miembros: ' + e.message); }
  }

  await logger.sendLog(guild, 'success', '💾 Backup cargado', `Backup **${backupId}** cargado por ${guild.members.cache.get(guild.ownerId)?.user?.tag || 'Desconocido'}\n${results.join('\n')}`);

  return { success: true, results };
}

async function getBackup(backupId) {
  return cache[backupId] || null;
}

async function listBackups() {
  return Object.values(cache).map(b => ({
    id: b.id,
    sourceGuildName: b.sourceGuildName,
    createdAt: b.createdAt,
    updatedAt: b.updatedAt,
    options: b.options,
    creatorTag: b.creatorTag,
  }));
}

module.exports = { createBackup, deleteBackup, updateBackup, loadBackup, getBackup, listBackups };
