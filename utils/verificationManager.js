const db = require('./database');
const log = require('./logger');
const captcha = require('./captcha');
const { ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, ChannelSelectMenuBuilder, RoleSelectMenuBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, MessageFlags, ChannelType, PermissionFlagsBits } = require('discord.js');

function sep() { return '━━━━━━━━━━━━━━━━━━━━━━━━'; }
const timers = new Map();

const TIME_OPTIONS = [
  { label: '1 minuto', value: '60000', emoji: '⏱️' },
  { label: '5 minutos', value: '300000', emoji: '⏱️' },
  { label: '10 minutos', value: '600000', emoji: '⏱️' },
  { label: '30 minutos', value: '1800000', emoji: '⏱️' },
  { label: '1 hora', value: '3600000', emoji: '⏰' },
  { label: '6 horas', value: '21600000', emoji: '⏰' },
  { label: '12 horas', value: '43200000', emoji: '⏰' },
  { label: '1 día', value: '86400000', emoji: '📅' },
  { label: '3 días', value: '259200000', emoji: '📅' },
  { label: '7 días', value: '604800000', emoji: '📅' },
  { label: '30 días', value: '2592000000', emoji: '📅' },
  { label: '1 año', value: '31536000000', emoji: '📅' },
];

function formatTime(ms) {
  if (ms < 60000) return `${ms/1000} segundos`;
  if (ms < 3600000) return `${ms/60000} minutos`;
  if (ms < 86400000) return `${ms/3600000} horas`;
  return `${ms/86400000} días`;
}

function buildMainEmbed(guild) {
  const c = db.get(guild.id) || {};
  const active = c.verifyEnabled === true;
  return {
    embeds: [{
      title: '🛡️ SISTEMA DE VERIFICACIÓN',
      description: active
        ? '✅ **Verificación activada**\nLos nuevos miembros deben verificarse.'
        : '❌ **Verificación desactivada**\nLos miembros entran sin verificación.',
      color: active ? 0x00ff88 : 0xff4444,
      fields: [
        { name: '⏱️ Tiempo límite', value: c.verifyTime ? formatTime(c.verifyTime) : '5 minutos', inline: true },
        { name: '⚡ Acción al expirar', value: c.verifyAction ? `**${c.verifyAction}**` : '**kick**', inline: true },
        { name: '🎖️ Rol verificado', value: c.verifiedRole ? `<@&${c.verifiedRole}>` : '❌ No configurado', inline: true },
        { name: '🔵 Rol No Verificado', value: c.noVerifiedRole ? `<@&${c.noVerifiedRole}>` : '❌ No creado', inline: true },
        { name: '📢 Canal verificación', value: c.verifyChannel ? `<#${c.verifyChannel}>` : '❌ No configurado', inline: true },
      ],
      footer: { text: 'Rox Security v1.0' },
      timestamp: new Date().toISOString(),
    }],
    components: [
      new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('ver_changerol').setLabel('🎖️ Rol Verificado').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('ver_noverified').setLabel('🔵 Rol No Verificado').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('ver_channel').setLabel('📢 Canal').setStyle(ButtonStyle.Primary).setDisabled(!active),
      ),
      new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('ver_activate').setLabel('✅ Activar').setStyle(ButtonStyle.Success).setDisabled(active),
        new ButtonBuilder().setCustomId('ver_settime').setLabel('⏱️ Tiempo').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('ver_deactivate').setLabel('⛔ Desactivar').setStyle(ButtonStyle.Danger).setDisabled(!active),
      ),
      new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('ver_embed').setLabel('✏️ Editar Embed').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('ver_sendembed').setLabel('📤 Enviar Embed').setStyle(ButtonStyle.Primary).setDisabled(!c.verifyChannel),
        new ButtonBuilder().setCustomId('main').setLabel('◀ Menú Principal').setStyle(ButtonStyle.Secondary),
      ),
    ],
  };
}

async function showVerPanel(interaction) {
  const data = buildMainEmbed(interaction.guild);
  if (interaction.isChatInputCommand?.()) {
    await interaction.reply({ ...data, flags: MessageFlags.Ephemeral });
  } else {
    await interaction.update(data);
  }
}

async function showActivateMenu(i) {
  const c = db.get(i.guild.id) || {};
  await i.update({
    embeds: [{
      title: '✅ ACTIVAR VERIFICACIÓN',
      description: `${sep()}\nRevisa los ajustes antes de activar.\nUsa los botones para cambiarlos.\n${sep()}`,
      color: 0x00d4ff,
      fields: [
        { name: '⏱️ Tiempo límite', value: c.verifyTime ? formatTime(c.verifyTime) : '5 minutos', inline: true },
        { name: '⚡ Acción al expirar', value: c.verifyAction ? `**${c.verifyAction}**` : '**kick**', inline: true },
        { name: '🎖️ Rol verificado', value: c.verifiedRole ? `<@&${c.verifiedRole}>` : '❌ No configurado', inline: true },
        { name: '🔵 Rol No Verificado', value: c.noVerifiedRole && i.guild.roles.cache.has(c.noVerifiedRole) ? `<@&${c.noVerifiedRole}>` : '❌ No configurado', inline: true },
      ],
      footer: { text: 'Rox Security v1.0' },
      timestamp: new Date().toISOString(),
    }],
    components: [
      new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('ver_settime').setLabel('⏱️ Tiempo').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('ver_setaction').setLabel('⚡ Cambiar Acción').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('ver_setrole').setLabel('🎖️ Rol').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('ver_setnoverified').setLabel('🔵 No Verificado').setStyle(ButtonStyle.Secondary),
      ),
      new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('ver_dosave').setLabel('💾 Guardar y Activar').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('ver_main').setLabel('◀ Volver').setStyle(ButtonStyle.Secondary),
      ),
    ],
  });
}

async function handleTimeSelect(i) {
  const val = i.values[0];
  const c = db.get(i.guild.id) || {};
  c.verifyTime = parseInt(val);
  db.set(i.guild.id, c);
  await i.update({
    embeds: [{
      title: '✅ Tiempo guardado',
      description: `${sep()}\n⏱️ **${formatTime(parseInt(val))}**\n${sep()}`,
      color: 0x00ff88,
      footer: { text: 'Rox Security v1.0' },
    }],
    components: [new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('ver_activate').setLabel('◀ Volver').setStyle(ButtonStyle.Secondary))],
  });
}

async function showTimeMenu(i) {
  const modal = new ModalBuilder().setCustomId('ver_time_modal').setTitle('⏱️ Tiempo límite');
  modal.addComponents(
    new ActionRowBuilder().addComponents(
      new TextInputBuilder().setCustomId('ver_time_input').setLabel('Tiempo (ej: 5m, 2h, 3d, 1a)').setStyle(TextInputStyle.Short).setPlaceholder('5m, 2h, 3d, 1a').setRequired(true).setMaxLength(4),
    ),
  );
  await i.showModal(modal);
}

async function handleTimeModal(i) {
  const raw = i.fields.getTextInputValue('ver_time_input').trim().toLowerCase();
  const match = raw.match(/^(\d+)\s*([mhda])$/);
  if (!match) {
    await i.reply({ content: '❌ Formato inválido. Usá: `5m` (minutos), `2h` (horas), `3d` (días) o `1a` (año)', flags: MessageFlags.Ephemeral });
    return;
  }
  const num = parseInt(match[1]);
  const unit = match[2];
  if (num < 1) {
    await i.reply({ content: '❌ El número debe ser mayor a 0', flags: MessageFlags.Ephemeral });
    return;
  }
  let ms;
  const label = { m: 'minuto(s)', h: 'hora(s)', d: 'día(s)', a: 'año(s)' };
  if (unit === 'm') ms = num * 60000;
  else if (unit === 'h') ms = num * 3600000;
  else if (unit === 'd') ms = num * 86400000;
  else if (unit === 'a') ms = num * 31536000000;
  if (ms > 31536000000) {
    await i.reply({ content: '❌ El máximo es 1 año (1a)', flags: MessageFlags.Ephemeral });
    return;
  }
  const c = db.get(i.guild.id) || {};
  c.verifyTime = ms;
  db.set(i.guild.id, c);
  await i.reply({
    embeds: [{
      title: '✅ Tiempo guardado',
      description: `${sep()}\n⏱️ **${num} ${label[unit]}**\n${sep()}`,
      color: 0x00ff88,
      footer: { text: 'Rox Security v1.0' },
    }],
    flags: MessageFlags.Ephemeral,
  });
}

async function toggleAction(i) {
  const c = db.get(i.guild.id) || {};
  const current = c.verifyAction || 'kick';
  c.verifyAction = current === 'kick' ? 'ban' : 'kick';
  db.set(i.guild.id, c);
  await i.update({
    embeds: [{
      title: '✅ Acción cambiada',
      description: `${sep()}\nAl expirar el tiempo, los usuarios serán **${c.verifyAction === 'kick' ? 'expulsados (kick)' : 'bloqueados (ban)'}**.\n${sep()}`,
      color: 0x00ff88,
      footer: { text: 'Rox Security v1.0' },
    }],
    components: [new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('ver_activate').setLabel('◀ Volver').setStyle(ButtonStyle.Secondary))],
  });
}

async function showRoleSelector(i) {
  await i.update({
    components: [
      new ActionRowBuilder().addComponents(
        new RoleSelectMenuBuilder().setCustomId('ver_selrole').setPlaceholder('Elige el rol de verificado...'),
      ),
      new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('ver_activate').setLabel('◀ Volver').setStyle(ButtonStyle.Secondary)),
    ],
  });
}

async function handleRoleSelect(i) {
  const c = db.get(i.guild.id) || {};
  c.verifiedRole = i.values[0];
  db.set(i.guild.id, c);
  await i.update({
    embeds: [{
      title: '✅ Rol guardado',
      description: `${sep()}\n🎖️ Rol verificado: <@&${i.values[0]}>\n${sep()}`,
      color: 0x00ff88,
      footer: { text: 'Rox Security v1.0' },
    }],
    components: [new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('ver_activate').setLabel('◀ Volver').setStyle(ButtonStyle.Secondary))],
  });
}

async function activateVerification(i) {
  const c = db.get(i.guild.id) || {};

  if (!c.verifiedRole) {
    return i.update({
      embeds: [{
        title: '❌ Error',
        description: `${sep()}\nDebes configurar un **rol de verificado** primero.\nUsa el botón "🎖️ Rol" para elegir uno.\n${sep()}`,
        color: 0xff4444,
        footer: { text: 'Rox Security v1.0' },
      }],
      components: [new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('ver_activate').setLabel('◀ Volver').setStyle(ButtonStyle.Secondary))],
    });
  }

  if (!c.verifyTime) c.verifyTime = 300000;
  if (!c.verifyAction) c.verifyAction = 'kick';

  const botMember = await i.guild.members.fetch(i.client.user.id);
  const botRole = botMember.roles.highest;

  try {
    let noVerified = i.guild.roles.cache.get(c.noVerifiedRole);

    if (!noVerified) {
      noVerified = await i.guild.roles.create({
        name: '🔵 No Verificado',
        color: 0x666666,
        permissions: [],
        reason: 'Rox Security - Rol para usuarios no verificados',
      });
    }

    if (botRole.position <= noVerified.position) {
      return i.update({
        embeds: [{
          title: '❌ Error de permisos',
          description: `${sep()}\nMi rol debe estar **arriba** del rol "${noVerified.name}" en la jerarquía.\n\nArrastra mi rol por encima en:\nAjustes del servidor > Roles\n${sep()}`,
          color: 0xff4444,
          footer: { text: 'Rox Security v1.0' },
        }],
        components: [new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('ver_main').setLabel('◀ Volver').setStyle(ButtonStyle.Secondary))],
      });
    }

    await i.deferUpdate();

    for (const [, channel] of i.guild.channels.cache) {
      try {
        await channel.permissionOverwrites.create(noVerified, {
          ViewChannel: false,
          SendMessages: false,
          ReadMessageHistory: false,
        });
      } catch {}
    }

    if (c.verifyChannel) {
      try {
        const vc = i.guild.channels.cache.get(c.verifyChannel);
        if (vc) {
          await vc.permissionOverwrites.create(noVerified, {
            ViewChannel: true,
            SendMessages: false,
            ReadMessageHistory: true,
          });
        }
      } catch {}
    }

    c.noVerifiedRole = noVerified.id;
    c.verifyEnabled = true;
    db.set(i.guild.id, c);

    await log.sendLog(i.guild, 'success', '✅ Verificación activada', `Tiempo: ${formatTime(c.verifyTime)}\nAcción: ${c.verifyAction}\nRol: <@&${c.verifiedRole}>`);

    await i.editReply({
      embeds: [{
        title: '✅ Verificación Activada',
        description: `${sep()}\nEl sistema de verificación está funcionando.\n${sep()}\n\n⏱️ **Tiempo:** ${formatTime(c.verifyTime)}\n⚡ **Acción:** ${c.verifyAction}\n🎖️ **Rol verificado:** <@&${c.verifiedRole}>\n🔵 **Rol No Verificado:** ${noVerified.toString()}`,
        color: 0x00ff88,
        footer: { text: 'Rox Security v1.0' },
        timestamp: new Date().toISOString(),
      }],
      components: [new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('ver_main').setLabel('◀ Volver').setStyle(ButtonStyle.Secondary))],
    });
  } catch (e) {
    await i.editReply({
      embeds: [{ title: '❌ Error', description: `${sep()}\nNo pude activar la verificación:\n**${e.message}**\n${sep()}`, color: 0xff4444, footer: { text: 'Rox Security v1.0' } }],
      components: [new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('ver_main').setLabel('◀ Volver').setStyle(ButtonStyle.Secondary))],
    });
  }
}

async function showChannelMenu(i) {
  const c = db.get(i.guild.id) || {};
  await i.update({
    embeds: [{
      title: '📢 Canal de Verificación',
      description: `${sep()}\nElige un canal existente o crea uno nuevo.\n${sep()}\n\n${c.verifyChannel ? `📍 Actual: <#${c.verifyChannel}>` : '📍 No hay canal configurado.'}`,
      color: 0x00d4ff,
      footer: { text: 'Rox Security v1.0' },
      timestamp: new Date().toISOString(),
    }],
    components: [
      new ActionRowBuilder().addComponents(
        new ChannelSelectMenuBuilder().setCustomId('ver_selchannel').setPlaceholder('Selecciona un canal...').addChannelTypes(ChannelType.GuildText),
      ),
      new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('ver_createchannel').setLabel('➕ Crear canal nuevo').setStyle(ButtonStyle.Success),
      ),
      new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('ver_savechannel').setLabel('💾 Guardar').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('ver_main').setLabel('◀ Volver').setStyle(ButtonStyle.Secondary),
      ),
    ],
  });
}

async function handleChannelSelect(i) {
  const c = db.get(i.guild.id) || {};
  const oldChannel = c.verifyChannel;
  c.verifyChannel = i.values[0];
  db.set(i.guild.id, c);
  if (c.noVerifiedRole) {
    try {
      const role = i.guild.roles.cache.get(c.noVerifiedRole);
      if (role) {
        if (oldChannel) {
          const oldCh = i.guild.channels.cache.get(oldChannel);
          if (oldCh) await oldCh.permissionOverwrites.create(role, {
            ViewChannel: false,
            SendMessages: false,
            ReadMessageHistory: false,
          }).catch(() => {});
        }
        const newCh = i.guild.channels.cache.get(c.verifyChannel);
        if (newCh) {
          await newCh.permissionOverwrites.create(role, {
            ViewChannel: true,
            SendMessages: false,
            ReadMessageHistory: true,
          });
        }
      }
    } catch {}
  }
  await i.update({
    embeds: [{ title: '✅ Canal seleccionado', description: `${sep()}\n📢 <#${i.values[0]}>\n${sep()}`, color: 0x00ff88, footer: { text: 'Rox Security v1.0' } }],
    components: [new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('ver_channel').setLabel('◀ Volver').setStyle(ButtonStyle.Secondary))],
  });
}

async function createChannel(i) {
  const c = db.get(i.guild.id) || {};
  const oldChannel = c.verifyChannel;

  try {
    const botMember = await i.guild.members.fetch(i.client.user.id);
    const channel = await i.guild.channels.create({
      name: 'verificate',
      type: ChannelType.GuildText,
      topic: 'Verificate para acceder al servidor',
      permissionOverwrites: [
        { id: i.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
        { id: botMember.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] },
      ],
      reason: 'Rox Security - Canal de verificación',
    });

    const noVerifiedRole = c.noVerifiedRole ? i.guild.roles.cache.get(c.noVerifiedRole) : null;
    if (noVerifiedRole) {
      await channel.permissionOverwrites.create(noVerifiedRole, {
        ViewChannel: true,
        SendMessages: false,
        ReadMessageHistory: true,
      });
    }

    c.verifyChannel = channel.id;
    db.set(i.guild.id, c);

    if (oldChannel && noVerifiedRole) {
      const oldCh = i.guild.channels.cache.get(oldChannel);
      if (oldCh) await oldCh.permissionOverwrites.create(noVerifiedRole, {
        ViewChannel: false,
        SendMessages: false,
        ReadMessageHistory: false,
      }).catch(() => {});
    }

    await sendVerifyEmbed(i.guild, channel);

    await i.update({
      embeds: [{ title: '✅ Canal creado', description: `${sep()}\n📢 <#${channel.id}> creado y listo.\n${sep()}`, color: 0x00ff88, footer: { text: 'Rox Security v1.0' } }],
      components: [new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('ver_channel').setLabel('◀ Volver').setStyle(ButtonStyle.Secondary))],
    });
  } catch (e) {
    await i.update({
      embeds: [{ title: '❌ Error', description: `${sep()}\nNo pude crear el canal:\n**${e.message}**\n${sep()}`, color: 0xff4444, footer: { text: 'Rox Security v1.0' } }],
      components: [new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('ver_channel').setLabel('◀ Volver').setStyle(ButtonStyle.Secondary))],
    });
  }
}

async function saveChannelConfig(i) {
  const c = db.get(i.guild.id) || {};
  if (!c.verifyChannel) {
    return i.update({
      embeds: [{ title: '❌ Error', description: `${sep()}\nSelecciona o crea un canal primero.\n${sep()}`, color: 0xff4444, footer: { text: 'Rox Security v1.0' } }],
      components: [new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('ver_channel').setLabel('◀ Volver').setStyle(ButtonStyle.Secondary))],
    });
  }
  await i.update({
    embeds: [{ title: '✅ Canal guardado', description: `${sep()}\n📢 <#${c.verifyChannel}> configurado.\n${sep()}`, color: 0x00ff88, footer: { text: 'Rox Security v1.0' } }],
    components: [new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('ver_main').setLabel('◀ Volver').setStyle(ButtonStyle.Secondary))],
  });
}

async function deactivateVerification(i) {
  const c = db.get(i.guild.id) || {};

  try {
    if (c.noVerifiedRole) {
      const role = i.guild.roles.cache.get(c.noVerifiedRole);
      if (role) await role.delete('Rox Security - Verificación desactivada').catch(() => {});
    }

    const keys = [...timers.keys()].filter(k => k.startsWith(i.guild.id));
    for (const key of keys) {
      clearTimeout(timers.get(key));
      timers.delete(key);
    }

    c.verifyEnabled = false;
    c.noVerifiedRole = null;
    c.verifyTime = null;
    c.verifyAction = null;
    c.verifyChannel = null;
    c.verifyEmbed = null;
    db.set(i.guild.id, c);

    await log.sendLog(i.guild, 'warn', '⛔ Verificación desactivada', `Desactivada por ${i.user.tag}`);

    await i.update({
      embeds: [{
        title: '⛔ Verificación Desactivada',
        description: `${sep()}\nEl sistema de verificación ha sido desactivado.\n${sep()}\n\n🗑️ Rol "No Verificado" eliminado\n🔓 Permisos restaurados\n⏱️ Temporizadores cancelados`,
        color: 0xffaa00,
        footer: { text: 'Rox Security v1.0' },
        timestamp: new Date().toISOString(),
      }],
      components: [new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('ver_main').setLabel('◀ Volver').setStyle(ButtonStyle.Secondary))],
    });
  } catch (e) {
    await i.update({
      embeds: [{ title: '❌ Error', description: `${sep()}\n${e.message}\n${sep()}`, color: 0xff4444, footer: { text: 'Rox Security v1.0' } }],
      components: [new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('ver_main').setLabel('◀ Volver').setStyle(ButtonStyle.Secondary))],
    });
  }
}

async function showChangeRoleMenu(i) {
  const c = db.get(i.guild.id) || {};
  await i.update({
    embeds: [{
      title: '🎖️ Cambiar Rol Verificado',
      description: `${sep()}\nSelecciona un rol existente o crea uno nuevo.\n${sep()}\n\n${c.verifiedRole ? `🎖️ Actual: <@&${c.verifiedRole}>` : '🎖️ No hay rol configurado.'}`,
      color: 0x00d4ff,
      footer: { text: 'Rox Security v1.0' },
    }],
    components: [
      new ActionRowBuilder().addComponents(
        new RoleSelectMenuBuilder().setCustomId('ver_selnewrole').setPlaceholder('Selecciona un rol existente...'),
      ),
      new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('ver_createrole').setLabel('➕ Crear rol nuevo').setStyle(ButtonStyle.Success),
      ),
      new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('ver_main').setLabel('◀ Volver').setStyle(ButtonStyle.Secondary),
      ),
    ],
  });
}

async function applyVerifiedPerms(guild, roleId) {
  const c = db.get(guild.id) || {};
  if (!c.verifyEnabled) return;
  const role = guild.roles.cache.get(roleId);
  if (!role) return;
  for (const [, ch] of guild.channels.cache) {
    try {
      await ch.permissionOverwrites.create(role, {
        ViewChannel: true,
        SendMessages: true,
        ReadMessageHistory: true,
      });
    } catch {}
  }
}

async function handleNewRoleSelect(i) {
  const c = db.get(i.guild.id) || {};
  c.verifiedRole = i.values[0];
  db.set(i.guild.id, c);
  if (c.verifyEnabled) {
    await i.deferUpdate();
    await applyVerifiedPerms(i.guild, i.values[0]);
    await i.editReply({
      embeds: [{ title: '✅ Rol Verificado cambiado', description: `${sep()}\n🎖️ <@&${i.values[0]}>\nAhora puede ver todos los canales.\n${sep()}`, color: 0x00ff88, footer: { text: 'Rox Security v1.0' } }],
      components: [new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('ver_main').setLabel('◀ Volver').setStyle(ButtonStyle.Secondary))],
    });
  } else {
    await i.update({
      embeds: [{ title: '✅ Rol guardado', description: `${sep()}\n🎖️ Nuevo rol verificado: <@&${i.values[0]}>\n${sep()}`, color: 0x00ff88, footer: { text: 'Rox Security v1.0' } }],
      components: [new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('ver_main').setLabel('◀ Volver').setStyle(ButtonStyle.Secondary))],
    });
  }
}

async function showNoVerifiedMenu(i) {
  const c = db.get(i.guild.id) || {};
  await i.update({
    embeds: [{
      title: '🔵 Rol No Verificado',
      description: `${sep()}\nLos nuevos miembros recibirán este rol al entrar.\n${sep()}\n\n${c.noVerifiedRole && i.guild.roles.cache.has(c.noVerifiedRole) ? `🔵 Actual: <@&${c.noVerifiedRole}>` : '🔵 No hay rol configurado.'}`,
      color: 0x666666,
      footer: { text: 'Rox Security v1.0' },
    }],
    components: [
      new ActionRowBuilder().addComponents(
        new RoleSelectMenuBuilder().setCustomId('ver_selnoverified').setPlaceholder('Selecciona un rol existente...'),
      ),
      new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('ver_createnoverified').setLabel('➕ Crear rol "No Verificado"').setStyle(ButtonStyle.Success),
      ),
      new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('ver_main').setLabel('◀ Volver').setStyle(ButtonStyle.Secondary),
      ),
    ],
  });
}

function randomColor() {
  const colors = [0xe74c3c, 0x3498db, 0x2ecc71, 0xf1c40f, 0x9b59b6, 0x1abc9c, 0xe67e22, 0x34495e, 0xfd79a8, 0x00cec9];
  return colors[Math.floor(Math.random() * colors.length)];
}

async function applyNoVerifiedPerms(guild, roleId) {
  const c = db.get(guild.id) || {};
  if (!c.verifyEnabled) return;
  const role = guild.roles.cache.get(roleId);
  if (!role) return;
  for (const [, ch] of guild.channels.cache) {
    try {
      await ch.permissionOverwrites.create(role, {
        ViewChannel: false,
        SendMessages: false,
        ReadMessageHistory: false,
      });
    } catch {}
  }
  if (c.verifyChannel) {
    const vc = guild.channels.cache.get(c.verifyChannel);
    if (vc) {
      try {
        await vc.permissionOverwrites.create(role, {
          ViewChannel: true,
          SendMessages: false,
          ReadMessageHistory: true,
        });
      } catch {}
    }
  }
}

async function handleNoVerifiedRoleSelect(i) {
  const c = db.get(i.guild.id) || {};
  const oldRole = c.noVerifiedRole;
  c.noVerifiedRole = i.values[0];
  db.set(i.guild.id, c);
  if (oldRole !== i.values[0] && c.verifyEnabled) {
    await i.deferUpdate();
    await applyNoVerifiedPerms(i.guild, i.values[0]);
    await i.editReply({
      embeds: [{ title: '✅ Rol No Verificado cambiado', description: `${sep()}\n🔵 <@&${i.values[0]}>\nAhora tiene los permisos de No Verificado.\n${sep()}`, color: 0x00ff88, footer: { text: 'Rox Security v1.0' } }],
      components: [new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('ver_main').setLabel('◀ Volver').setStyle(ButtonStyle.Secondary))],
    });
  } else {
    await i.update({
      embeds: [{ title: '✅ Rol No Verificado guardado', description: `${sep()}\n🔵 <@&${i.values[0]}>\n${sep()}`, color: 0x00ff88, footer: { text: 'Rox Security v1.0' } }],
      components: [new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('ver_main').setLabel('◀ Volver').setStyle(ButtonStyle.Secondary))],
    });
  }
}

async function createNoVerifiedRole(i) {
  try {
    const c = db.get(i.guild.id) || {};
    const oldRole = c.noVerifiedRole;
    const role = await i.guild.roles.create({
      name: '🔵 No Verificado',
      color: randomColor(),
      permissions: [],
      reason: 'Rox Security - Rol No Verificado',
    });
    c.noVerifiedRole = role.id;
    db.set(i.guild.id, c);
    if (c.verifyEnabled) {
      await i.deferUpdate();
      await applyNoVerifiedPerms(i.guild, role.id);
      await i.editReply({
        embeds: [{ title: '✅ Rol No Verificado creado', description: `${sep()}\n🔵 ${role.toString()} creado.\nAhora tiene los permisos de No Verificado.\n${sep()}`, color: 0x00ff88, footer: { text: 'Rox Security v1.0' } }],
        components: [new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('ver_main').setLabel('◀ Volver').setStyle(ButtonStyle.Secondary))],
      });
    } else {
      await i.update({
        embeds: [{ title: '✅ Rol creado', description: `${sep()}\n🔵 ${role.toString()} creado como "No Verificado".\n${sep()}`, color: 0x00ff88, footer: { text: 'Rox Security v1.0' } }],
        components: [new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('ver_main').setLabel('◀ Volver').setStyle(ButtonStyle.Secondary))],
      });
    }
  } catch (e) {
    await i.update({
      embeds: [{ title: '❌ Error', description: `${sep()}\nNo pude crear el rol:\n**${e.message}**\n${sep()}`, color: 0xff4444, footer: { text: 'Rox Security v1.0' } }],
      components: [new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('ver_main').setLabel('◀ Volver').setStyle(ButtonStyle.Secondary))],
    });
  }
}

async function createNewRole(i) {
  try {
    const c = db.get(i.guild.id) || {};

    if (c.verifiedRole) {
      const oldRole = i.guild.roles.cache.get(c.verifiedRole);
      if (oldRole) await oldRole.delete('Rox Security - Reemplazado por nuevo rol Verificado').catch(() => {});
    }

    const role = await i.guild.roles.create({
      name: '🟢 Verificado',
      color: 0x2ecc71,
      reason: 'Rox Security - Rol de verificado',
    });

    c.verifiedRole = role.id;
    db.set(i.guild.id, c);

    if (c.verifyEnabled) {
      await i.deferUpdate();
      await applyVerifiedPerms(i.guild, role.id);
      await i.editReply({
        embeds: [{ title: '✅ Rol Verificado creado', description: `${sep()}\n🎖️ ${role.toString()} creado.\nAhora puede ver todos los canales.\n${sep()}`, color: 0x00ff88, footer: { text: 'Rox Security v1.0' } }],
        components: [new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('ver_main').setLabel('◀ Volver').setStyle(ButtonStyle.Secondary))],
      });
    } else {
      await i.update({
        embeds: [{ title: '✅ Rol creado', description: `${sep()}\n🎖️ ${role.toString()} creado.\n${sep()}`, color: 0x00ff88, footer: { text: 'Rox Security v1.0' } }],
        components: [new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('ver_main').setLabel('◀ Volver').setStyle(ButtonStyle.Secondary))],
      });
    }
  } catch (e) {
    await i.update({
      embeds: [{ title: '❌ Error', description: `${sep()}\nNo pude crear el rol:\n**${e.message}**\n${sep()}`, color: 0xff4444, footer: { text: 'Rox Security v1.0' } }],
      components: [new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('ver_changerol').setLabel('◀ Volver').setStyle(ButtonStyle.Secondary))],
    });
  }
}

async function showEmbedEditor(i) {
  const c = db.get(i.guild.id) || {};
  const em = c.verifyEmbed || {};
  const modal = new ModalBuilder().setCustomId('ver_saveembed').setTitle('✏️ Editar Embed de Verificación');
  modal.addComponents(
    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('ver_embed_title').setLabel('Título').setStyle(TextInputStyle.Short).setRequired(false).setMaxLength(100).setValue(em.title || '')),
    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('ver_embed_desc').setLabel('Descripción').setStyle(TextInputStyle.Paragraph).setRequired(false).setMaxLength(2000).setValue(em.desc || '')),
    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('ver_embed_color').setLabel('Color (hex, ej: #00d4ff)').setStyle(TextInputStyle.Short).setRequired(false).setMaxLength(7).setValue(em.color || '')),
  );
  await i.showModal(modal);
}

async function saveEmbed(i) {
  const c = db.get(i.guild.id) || {};
  const title = i.fields.getTextInputValue('ver_embed_title');
  const desc = i.fields.getTextInputValue('ver_embed_desc');
  const color = i.fields.getTextInputValue('ver_embed_color');

  c.verifyEmbed = {};
  if (title) c.verifyEmbed.title = title;
  if (desc) c.verifyEmbed.desc = desc;
  if (color) c.verifyEmbed.color = color;
  db.set(i.guild.id, c);

  await i.reply({
    embeds: [{
      title: '✅ Embed guardado',
      description: `${sep()}\nEl mensaje de verificación ha sido personalizado.\n${sep()}`,
      color: 0x00ff88,
      footer: { text: 'Rox Security v1.0' },
    }],
    flags: MessageFlags.Ephemeral,
  });

  if (c.verifyChannel) {
    const ch = i.guild.channels.cache.get(c.verifyChannel);
    if (ch) await sendVerifyEmbed(i.guild, ch);
  }
}

async function sendVerifyEmbed(guild, channel) {
  const c = db.get(guild.id) || {};
  const em = c.verifyEmbed || {};
  const embed = {
    title: em.title || '🔐 VERIFICACIÓN',
    description: em.desc
      || '━━━━━━━━━━━━━━━━━━━━━━━━\n'
      + 'Presiona el botón **✅ Verificar** para acceder al servidor.\n'
      + '━━━━━━━━━━━━━━━━━━━━━━━━\n\n'
      + '📌 Recibirás un código por mensaje directo.\n'
      + '📌 Escríbelo exactamente como aparece.\n'
      + '📌 Tienes **5 minutos** y **3 intentos**.',
    color: em.color ? parseInt(em.color.replace('#', ''), 16) : 0x00d4ff,
    footer: { text: 'Rox Security v1.0' },
  };

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('verify_btn').setLabel('✅ Verificar').setStyle(ButtonStyle.Success),
  );

  try {
    const messages = await channel.messages.fetch({ limit: 10 });
    const botMsg = messages.find(m => m.author.id === guild.client.user.id && m.embeds.length > 0);
    if (botMsg) {
      await botMsg.edit({ embeds: [embed], components: [row] });
    } else {
      await channel.send({ embeds: [embed], components: [row] });
    }
  } catch {
    try { await channel.send({ embeds: [embed], components: [row] }); } catch {}
  }
}

async function handleVerifyButton(i) {
  const config = db.get(i.guild.id);
  if (!config || !config.verifyEnabled) {
    await i.reply({ content: '❌ La verificación no está activada en este servidor.', flags: MessageFlags.Ephemeral });
    return;
  }

  const pendingCode = captcha.getCode(i.user.id, i.guild.id);
  if (!pendingCode) {
    await i.reply({ content: '❌ No tienes una verificación pendiente. Sal y vuelve a entrar al servidor.', flags: MessageFlags.Ephemeral });
    return;
  }

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('verify_showmodal').setLabel('🔑 Poner Código').setStyle(ButtonStyle.Primary),
  );

  let sentDm = false;
  try {
    await i.user.send({
      embeds: [{
        title: `🔐 ${i.guild.name} — Código de Verificación`,
        description: '━━━━━━━━━━━━━━━━━━━━━━━━\n'
          + 'Tu código de verificación es:\n\n'
          + `\`\`\`${pendingCode}\`\`\`\n\n`
          + '━━━━━━━━━━━━━━━━━━━━━━━━\n\n'
          + '📌 Presiona **🔑 Poner Código** en el servidor.\n'
          + '📌 Escribe el código **exactamente como aparece**.\n'
          + '📌 ⏰ Expira en **5 minutos** — 🔒 Tienes **3 intentos**.',
        color: 0x00d4ff,
        footer: { text: 'Rox Security v1.0' },
      }],
    });
    sentDm = true;
    await log.sendLog(i.guild, 'info', '📩 Código enviado', `Se envió verificación a **${i.user.tag}**`);
  } catch {}

  await i.reply({
    embeds: [{
      title: sentDm ? '📩 Código Enviado' : '🔐 Tu Código de Verificación',
      description: sentDm
        ? '━━━━━━━━━━━━━━━━━━━━━━━━\n'
        + 'El código fue enviado a tus **mensajes directos**.\n'
        + '━━━━━━━━━━━━━━━━━━━━━━━━\n\n'
        + 'Presiona **🔑 Poner Código** para ingresarlo.\n\n'
        + '⚠️ **Respeta mayúsculas y minúsculas.**'
        : '━━━━━━━━━━━━━━━━━━━━━━━━\n'
        + 'No pude enviarte un mensaje directo.\n'
        + '━━━━━━━━━━━━━━━━━━━━━━━━\n\n'
        + `\`\`\`${pendingCode}\`\`\`\n\n`
        + 'Presiona **🔑 Poner Código** para ingresarlo.\n\n'
        + '⚠️ **Respeta mayúsculas y minúsculas.**\n'
        + '⏰ Expira en **5 minutos** · 🔒 **3 intentos**',
      color: sentDm ? 0x00d4ff : 0xf1c40f,
      footer: { text: 'Rox Security v1.0' },
    }],
    components: [row],
    flags: MessageFlags.Ephemeral,
  });
}

async function showVerifyModal(i) {
  const modal = new ModalBuilder().setCustomId('verify_modal').setTitle('🔐 Ingresa tu código');
  modal.addComponents(
    new ActionRowBuilder().addComponents(
      new TextInputBuilder().setCustomId('verify_code').setLabel('Código de 6 caracteres').setStyle(TextInputStyle.Short).setPlaceholder('Ej: aB3xX2').setRequired(true).setMinLength(6).setMaxLength(6),
    ),
  );
  await i.showModal(modal);
}

async function handleVerifyModal(i) {
  const code = i.fields.getTextInputValue('verify_code');
  const config = db.get(i.guild.id);
  if (!config || !config.verifyEnabled) {
    await i.reply({ content: '❌ La verificación no está activada en este servidor.', flags: MessageFlags.Ephemeral });
    return;
  }

  const result = captcha.verifyCode(i.user.id, i.guild.id, code);

  if (!result.success) {
    const err = result.reason || '';
    let title, desc, color;
    if (err.includes('expirado')) {
      title = '⏰ Código Expirado';
      desc = 'El código de verificación ya expiró.\n\n📌 Sal del servidor y vuelve a entrar para recibir uno nuevo.';
      color = 0xf1c40f;
    } else if (err.includes('intentos')) {
      title = '🔒 Demasiados Intentos';
      desc = 'Agotaste los **3 intentos** permitidos.\n\n📌 Sal del servidor y vuelve a entrar para intentar de nuevo.';
      color = 0xe74c3c;
    } else {
      title = '❌ Código Incorrecto';
      desc = 'El código que ingresaste no es válido.\n\n📌 **Respeta mayúsculas y minúsculas.**\n📌 Te quedan intentos. Revisa tu MD y vuelve a intentar.';
      color = 0xe74c3c;
    }
    await i.reply({
      embeds: [{
        title,
        description: '━━━━━━━━━━━━━━━━━━━━━━━━\n' + desc + '\n━━━━━━━━━━━━━━━━━━━━━━━━',
        color,
        footer: { text: 'Rox Security v1.0' },
      }],
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  try {
    const member = await i.guild.members.fetch(i.user.id);
    if (config.verifiedRole) await member.roles.add(config.verifiedRole).catch(() => {});
    if (config.noVerifiedRole) await member.roles.remove(config.noVerifiedRole).catch(() => {});
  } catch {}

  cancelTimer(i.guild.id, i.user.id);

  await log.sendLog(i.guild, 'success', '✅ Verificado', `**${i.user.tag}** se verificó correctamente.`);

  await i.reply({
    embeds: [{
      title: '✅ Verificación Exitosa',
      description: '━━━━━━━━━━━━━━━━━━━━━━━━\n'
        + `¡Bienvenido a **${i.guild.name}**!\n`
        + '━━━━━━━━━━━━━━━━━━━━━━━━\n\n'
        + 'Ya puedes acceder a todos los canales. Disfruta tu estancia.',
      color: 0x2ecc71,
      footer: { text: 'Rox Security v1.0' },
    }],
    flags: MessageFlags.Ephemeral,
  });
}

function startTimer(guildId, memberId, time) {
  const key = `${guildId}-${memberId}`;
  const existing = timers.get(key);
  if (existing) clearTimeout(existing);

  const timeout = setTimeout(async () => {
    timers.delete(key);
    try {
      const { REST } = require('discord.js');
      const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

      const member = await rest.get(`/guilds/${guildId}/members/${memberId}`).catch(() => null);
      if (!member) return;

      const config = db.get(guildId);
      if (!config || !config.verifyEnabled) return;

      const hasNoVerifiedRole = member.roles?.includes(config.noVerifiedRole);
      if (!hasNoVerifiedRole) return;

      const action = config.verifyAction || 'kick';
      const reason = `[Rox Security] No se verificó a tiempo`;

      if (action === 'ban') {
        await rest.put(`/guilds/${guildId}/bans/${memberId}`, { body: { reason } });
      } else {
        await rest.delete(`/guilds/${guildId}/members/${memberId}`, { reason });
      }

      if (config.logChannel) {
        try {
          const embed = { title: '🔨 Tiempo de verificación expirado', description: `<@${memberId}> no se verificó a tiempo → **${action}**`, color: 0x9b59b6, timestamp: new Date().toISOString() };
          await rest.post(`/channels/${config.logChannel}/messages`, { body: { embeds: [embed] } });
        } catch {}
      }
    } catch {}
  }, time);

  timers.set(key, timeout);
}

function cancelTimer(guildId, memberId) {
  const key = `${guildId}-${memberId}`;
  const existing = timers.get(key);
  if (existing) {
    clearTimeout(existing);
    timers.delete(key);
  }
}

async function sendEmbedToChannel(i) {
  const c = db.get(i.guild.id) || {};
  if (!c.verifyChannel) {
    return i.reply({ content: '❌ Configura un canal primero.', flags: MessageFlags.Ephemeral });
  }
  const ch = i.guild.channels.cache.get(c.verifyChannel);
  if (!ch) {
    return i.reply({ content: '❌ El canal configurado ya no existe.', flags: MessageFlags.Ephemeral });
  }
  await sendVerifyEmbed(i.guild, ch);
  await i.reply({
    embeds: [{
      title: '✅ Embed enviado',
      description: `${sep()}\nMensaje de verificación enviado a <#${c.verifyChannel}>\n${sep()}`,
      color: 0x00ff88,
      footer: { text: 'Rox Security v1.0' },
    }],
    flags: MessageFlags.Ephemeral,
  });
}

module.exports = {
  showVerPanel, showActivateMenu, showTimeMenu, handleTimeModal, toggleAction,
  showRoleSelector, handleRoleSelect, activateVerification,
  showChannelMenu, handleChannelSelect, createChannel, saveChannelConfig,
  deactivateVerification,
  showChangeRoleMenu, handleNewRoleSelect, createNewRole,
  showNoVerifiedMenu, handleNoVerifiedRoleSelect, createNoVerifiedRole,
  showEmbedEditor, saveEmbed, sendVerifyEmbed,
  startTimer, cancelTimer, formatTime, buildMainEmbed,
  handleVerifyButton, showVerifyModal, handleVerifyModal,
  sendEmbedToChannel,
};
