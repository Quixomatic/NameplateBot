const { queries } = require('../database');

const COLORS = {
  verified: 0x57f287,
  admin_verified: 0x5865f2,
  dm_failed: 0xed4245,
  maxed_out: 0xfe7543,
  reverify: 0xfee75c,
  reminder: 0x99aab5,
  quarantine: 0x9b59b6,
  quarantine_abandoned: 0xfe7543,
};

/**
 * Send a log message to the guild's configured log channel.
 * Silently no-ops if no log channel is configured.
 */
async function log(client, guildId, { title, description, color, user }) {
  const settings = queries.getGuildSettings().get(guildId);
  if (!settings?.log_channel_id) return;

  try {
    const channel = await client.channels.fetch(settings.log_channel_id);
    if (!channel) return;

    const embed = {
      color,
      title,
      description,
      timestamp: new Date().toISOString(),
    };

    if (user) {
      embed.thumbnail = { url: user.displayAvatarURL({ size: 64 }) };
      embed.footer = { text: `User ID: ${user.id}` };
    }

    await channel.send({ embeds: [embed] });
  } catch (err) {
    console.error(`Failed to send audit log in guild ${guildId}: ${err.message}`);
  }
}

const auditlog = {
  verified(client, guildId, user, displayName) {
    return log(client, guildId, {
      title: 'Member Verified',
      description: `**${user.tag}** verified as **${displayName}**`,
      color: COLORS.verified,
      user,
    });
  },

  adminVerified(client, guildId, user, displayName, admin) {
    return log(client, guildId, {
      title: 'Admin Verified',
      description: `**${user.tag}** verified as **${displayName}** by ${admin.tag}`,
      color: COLORS.admin_verified,
      user,
    });
  },

  dmFailed(client, guildId, user) {
    return log(client, guildId, {
      title: 'DM Failed',
      description: `Could not send verification DM to **${user.tag}** (DMs may be disabled)`,
      color: COLORS.dm_failed,
      user,
    });
  },

  maxedOut(client, guildId, user) {
    return log(client, guildId, {
      title: 'Max Reminders Reached',
      description: `**${user.tag}** did not respond after maximum reminders`,
      color: COLORS.maxed_out,
      user,
    });
  },

  reverify(client, guildId, user, admin) {
    return log(client, guildId, {
      title: 'Re-verification Sent',
      description: `**${user.tag}** sent re-verification by ${admin.tag}`,
      color: COLORS.reverify,
      user,
    });
  },

  quarantineCreated(client, guildId, user, admin, channel) {
    return log(client, guildId, {
      title: 'Quarantine Channel Created',
      description: `**${user.tag}** quarantined by ${admin.tag} → <#${channel.id}>`,
      color: COLORS.quarantine,
      user,
    });
  },

  quarantineResolvedByUser(client, guildId, user, displayName) {
    return log(client, guildId, {
      title: 'Quarantine Resolved (by user)',
      description: `**${user.tag}** resolved quarantine as **${displayName}**`,
      color: COLORS.verified,
      user,
    });
  },

  quarantineResolvedByAdmin(client, guildId, user, displayName, admin) {
    return log(client, guildId, {
      title: 'Quarantine Resolved (by admin)',
      description: `**${user.tag}** resolved as **${displayName}** by ${admin.tag}`,
      color: COLORS.admin_verified,
      user,
    });
  },

  quarantineAbandoned(client, guildId, user, admin) {
    const by = admin ? `by ${admin.tag}` : 'automatically (max age reached)';
    return log(client, guildId, {
      title: 'Quarantine Abandoned',
      description: `**${user.tag}** quarantine abandoned ${by}`,
      color: COLORS.quarantine_abandoned,
      user,
    });
  },
};

module.exports = auditlog;
