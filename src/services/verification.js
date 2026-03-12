const { queries } = require('../database');
const { validateName } = require('../utils/nameValidation');

const VERIFIED_ROLE_NAME = process.env.VERIFIED_ROLE_NAME || 'Verified';

/**
 * Ensure the Verified role exists in a guild, creating it if necessary.
 */
async function ensureVerifiedRole(guild) {
  let role = guild.roles.cache.find((r) => r.name === VERIFIED_ROLE_NAME);
  if (!role) {
    const roleOptions = {
      name: VERIFIED_ROLE_NAME,
      reason: 'Nameplate: auto-created verified role',
    };

    // Set a checkmark emoji as the role icon if the server supports it (Boost Level 2+)
    if (guild.features.includes('ROLE_ICONS')) {
      roleOptions.unicodeEmoji = '\u2705';
    }

    role = await guild.roles.create(roleOptions);
    console.log(`Created "${VERIFIED_ROLE_NAME}" role in ${guild.name}${guild.features.includes('ROLE_ICONS') ? ' (with icon)' : ''}`);
  }
  return role;
}

/**
 * Send the initial verification DM to a user.
 */
async function sendVerificationDM(member) {
  const embed = {
    color: 0x5865f2,
    title: `Welcome to ${member.guild.name}!`,
    description:
      `To get access to the server, please reply to this message with your **real name**.\n\n` +
      `**Format:** First name and at least your last initial\n` +
      `**Examples:** \`James S\`, \`James Smith\`, \`Mary Jane W.\`\n\n` +
      `Your name will be set as your server nickname.`,
    footer: { text: `Server: ${member.guild.name}` },
  };

  try {
    await member.user.send({ embeds: [embed] });
    console.log(`Sent verification DM to ${member.user.tag} for guild ${member.guild.name}`);
    return true;
  } catch (err) {
    console.error(`Could not DM ${member.user.tag}: ${err.message}`);
    return false;
  }
}

/**
 * Start the verification flow for a member.
 */
async function startVerification(member) {
  // Skip bots
  if (member.user.bot) return;

  // Check if already verified
  const existing = queries.isVerified().get(member.guild.id, member.user.id);
  if (existing) return;

  // Check if already pending
  const pending = queries.getPending().get(member.guild.id, member.user.id);
  if (pending) return;

  // Record as pending
  queries.upsertPending().run(member.guild.id, member.user.id);

  // Send the DM
  await sendVerificationDM(member);
}

/**
 * Process a DM reply from a user attempting to verify.
 */
async function processNameReply(message, client) {
  // Find which guilds this user is pending in
  const allPending = queries.getAllPending().all();
  const userPending = allPending.filter((row) => row.user_id === message.author.id);

  if (userPending.length === 0) return false;

  const result = validateName(message.content);

  if (!result.valid) {
    await message.reply(result.reason);
    return true;
  }

  let successCount = 0;
  const errors = [];

  for (const row of userPending) {
    try {
      const guild = await client.guilds.fetch(row.guild_id);
      const member = await guild.members.fetch(message.author.id);

      // Set nickname
      await member.setNickname(result.displayName, 'Nameplate: verified name');

      // Assign verified role
      const role = await ensureVerifiedRole(guild);
      await member.roles.add(role, 'Nameplate: member verified');

      // Update database
      queries.removePending().run(row.guild_id, message.author.id);
      queries.upsertVerified().run(row.guild_id, message.author.id, result.displayName);

      successCount++;
      console.log(`Verified ${message.author.tag} as "${result.displayName}" in ${guild.name}`);
    } catch (err) {
      console.error(`Failed to verify in guild ${row.guild_id}: ${err.message}`);
      errors.push(err.message);
    }
  }

  if (successCount > 0) {
    await message.reply(
      `You're all set! Your nickname has been set to **${result.displayName}**. You now have full access to the server.`
    );
  } else {
    await message.reply(
      `Something went wrong setting your nickname. This might be a permissions issue. Please contact a server admin.\n\`${errors[0]}\``
    );
  }

  return true;
}

/**
 * Initiate verification for all unverified members in a guild.
 */
async function verifyExistingMembers(guild) {
  const role = await ensureVerifiedRole(guild);
  const members = await guild.members.fetch();
  let count = 0;

  for (const [, member] of members) {
    if (member.user.bot) continue;

    // Skip if they already have the verified role
    if (member.roles.cache.has(role.id)) continue;

    // Skip if already verified in DB
    const verified = queries.isVerified().get(guild.id, member.user.id);
    if (verified) continue;

    // Skip if already pending
    const pending = queries.getPending().get(guild.id, member.user.id);
    if (pending) continue;

    queries.upsertPending().run(guild.id, member.user.id);
    await sendVerificationDM(member);
    count++;

    // Rate limit: small delay between DMs to avoid hitting Discord limits
    await new Promise((resolve) => setTimeout(resolve, 1500));
  }

  return count;
}

module.exports = {
  ensureVerifiedRole,
  sendVerificationDM,
  startVerification,
  processNameReply,
  verifyExistingMembers,
};
