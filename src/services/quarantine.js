const { ChannelType, PermissionFlagsBits } = require('discord.js');
const { queries } = require('../database');
const { NAME_MODES } = require('../utils/nameValidation');
const { getNameMode } = require('./verification');
const auditlog = require('./auditlog');

const SWEEP_INTERVAL_MS = 60 * 60 * 1000; // hourly
const DEFAULT_MAX_AGE_HOURS = 168;
const STAFF_PERMS = [
  PermissionFlagsBits.ViewChannel,
  PermissionFlagsBits.SendMessages,
  PermissionFlagsBits.ReadMessageHistory,
];
const TARGET_PERMS = [
  PermissionFlagsBits.ViewChannel,
  PermissionFlagsBits.SendMessages,
  PermissionFlagsBits.ReadMessageHistory,
];
const BOT_PERMS = [
  PermissionFlagsBits.ViewChannel,
  PermissionFlagsBits.SendMessages,
  PermissionFlagsBits.ReadMessageHistory,
  PermissionFlagsBits.ManageMessages,
  PermissionFlagsBits.ManageChannels,
  PermissionFlagsBits.EmbedLinks,
];

let sweepTimer = null;

function sanitizeChannelName(username) {
  const base = username
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  const slug = base || 'member';
  return `verify-${slug}`.slice(0, 90);
}

/**
 * Build the permission overwrites array for a quarantine channel.
 * Includes: deny @everyone, allow bot, allow target, allow every admin role,
 * allow configured verifier roles, and allow individual admins not covered by a role.
 */
async function buildOverwrites(guild, target, client) {
  const overwrites = [
    { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
    { id: client.user.id, allow: BOT_PERMS },
    { id: target.id, allow: TARGET_PERMS },
  ];

  const adminRoleIds = new Set();
  for (const role of guild.roles.cache.values()) {
    if (role.id === guild.id) continue;
    if (role.permissions.has(PermissionFlagsBits.Administrator)) {
      adminRoleIds.add(role.id);
      overwrites.push({ id: role.id, allow: STAFF_PERMS });
    }
  }

  const settings = queries.getGuildSettings().get(guild.id);
  if (settings?.verifier_role_ids) {
    const extraRoleIds = settings.verifier_role_ids.split(',').map((s) => s.trim()).filter(Boolean);
    for (const roleId of extraRoleIds) {
      if (adminRoleIds.has(roleId)) continue;
      if (!guild.roles.cache.has(roleId)) continue;
      overwrites.push({ id: roleId, allow: STAFF_PERMS });
    }
  }

  // Individual admins not covered by an admin role (server owner, manually-permissioned users)
  const members = await guild.members.fetch();
  const seenUserIds = new Set([client.user.id, target.id]);
  for (const member of members.values()) {
    if (member.user.bot) continue;
    if (seenUserIds.has(member.id)) continue;
    if (!member.permissions.has(PermissionFlagsBits.Administrator)) continue;
    const coveredByRole = member.roles.cache.some((r) => adminRoleIds.has(r.id));
    if (coveredByRole) continue;
    overwrites.push({ id: member.id, allow: STAFF_PERMS });
    seenUserIds.add(member.id);
  }

  return overwrites;
}

/**
 * Create a quarantine channel for a target member.
 * Returns { channel, alreadyExisted }.
 */
async function createQuarantine(guild, target, admin, client) {
  const existing = queries.getQuarantineByUser().get(guild.id, target.id);
  if (existing) {
    try {
      const channel = await client.channels.fetch(existing.channel_id);
      if (channel) return { channel, alreadyExisted: true };
    } catch (_) {
      // Channel was deleted out of band; clean up the stale row and continue
    }
    queries.deleteQuarantine().run(guild.id, target.id);
  }

  const settings = queries.getGuildSettings().get(guild.id);
  const overwrites = await buildOverwrites(guild, target.user, client);

  const channelOptions = {
    name: sanitizeChannelName(target.user.username),
    type: ChannelType.GuildText,
    permissionOverwrites: overwrites,
    reason: `Nameplate: quarantine for ${target.user.tag} (by ${admin.tag})`,
  };

  if (settings?.quarantine_category_id) {
    const category = guild.channels.cache.get(settings.quarantine_category_id);
    if (category && category.type === ChannelType.GuildCategory) {
      channelOptions.parent = category.id;
    }
  }

  const channel = await guild.channels.create(channelOptions);

  queries.insertQuarantine().run(guild.id, target.id, channel.id, admin.id);

  const mode = getNameMode(guild.id);
  const modeInfo = NAME_MODES[mode];

  const embed = {
    color: 0x9b59b6,
    title: 'Verification needed',
    description:
      `Hi <@${target.id}>, an admin has set up this private channel so we can get your real name on file.\n\n` +
      `Please reply here with your **real name**.\n` +
      `**Format:** ${modeInfo.format}\n` +
      `**Examples:** ${modeInfo.examples}\n\n` +
      `Once you reply, your nickname will be set and you'll get full access to the server.`,
    footer: { text: `Server: ${guild.name}` },
  };

  await channel.send({ content: `<@${target.id}>`, embeds: [embed] });

  await auditlog.quarantineCreated(client, guild.id, target.user, admin, channel);

  return { channel, alreadyExisted: false };
}

/**
 * Schedule a quarantine channel for deletion after a delay. Removes the DB row immediately
 * so subsequent commands/messages don't double-fire.
 */
function deleteQuarantineChannel(client, row, delayMs = 60_000) {
  queries.deleteQuarantine().run(row.guild_id, row.user_id);

  setTimeout(async () => {
    try {
      const channel = await client.channels.fetch(row.channel_id);
      if (channel) {
        await channel.delete('Nameplate: quarantine resolved');
      }
    } catch (err) {
      console.error(`Failed to delete quarantine channel ${row.channel_id}: ${err.message}`);
    }
  }, delayMs);
}

/**
 * Sweep all quarantine channels: drop rows for missing channels, close channels for members
 * who left, and auto-close channels older than the guild's max age.
 */
async function runQuarantineSweep(client) {
  const rows = queries.getAllQuarantines().all();
  const now = Date.now();

  for (const row of rows) {
    let guild;
    try {
      guild = await client.guilds.fetch(row.guild_id);
    } catch (_) {
      queries.deleteQuarantine().run(row.guild_id, row.user_id);
      continue;
    }

    let channel;
    try {
      channel = await client.channels.fetch(row.channel_id);
    } catch (_) {
      queries.deleteQuarantine().run(row.guild_id, row.user_id);
      continue;
    }
    if (!channel) {
      queries.deleteQuarantine().run(row.guild_id, row.user_id);
      continue;
    }

    let member;
    try {
      member = await guild.members.fetch(row.user_id);
    } catch (_) {
      member = null;
    }

    if (!member) {
      try {
        await channel.delete('Nameplate: quarantine target left guild');
      } catch (_) {}
      queries.deleteQuarantine().run(row.guild_id, row.user_id);
      continue;
    }

    const settings = queries.getGuildSettings().get(row.guild_id);
    const maxAgeHours = settings?.quarantine_max_age_hours ?? DEFAULT_MAX_AGE_HOURS;
    const createdAt = new Date(row.created_at + 'Z').getTime();
    const ageHours = (now - createdAt) / (1000 * 60 * 60);

    if (ageHours >= maxAgeHours) {
      try {
        await channel.send({
          content: `This quarantine channel has been open for over ${maxAgeHours} hours and is being auto-closed. Re-run \`/quarantine\` to start over.`,
        });
      } catch (_) {}
      try {
        await channel.delete('Nameplate: quarantine max age reached');
      } catch (_) {}
      queries.deleteQuarantine().run(row.guild_id, row.user_id);
      await auditlog.quarantineAbandoned(client, row.guild_id, member.user, null);
    }
  }
}

function startQuarantineSweep(client) {
  // Run once shortly after startup to reconcile state
  setTimeout(() => runQuarantineSweep(client).catch((err) => console.error('Quarantine startup sweep failed:', err)), 45_000);

  sweepTimer = setInterval(() => {
    runQuarantineSweep(client).catch((err) => console.error('Quarantine sweep failed:', err));
  }, SWEEP_INTERVAL_MS);
  console.log('Quarantine sweep loop started (hourly)');
}

function stopQuarantineSweep() {
  if (sweepTimer) {
    clearInterval(sweepTimer);
    sweepTimer = null;
  }
}

module.exports = {
  createQuarantine,
  deleteQuarantineChannel,
  runQuarantineSweep,
  startQuarantineSweep,
  stopQuarantineSweep,
  sanitizeChannelName,
};
