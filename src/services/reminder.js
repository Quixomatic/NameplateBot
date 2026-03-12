const { queries } = require('../database');
const { NAME_MODES } = require('../utils/nameValidation');
const auditlog = require('./auditlog');

const REMINDER_INTERVAL_HOURS = parseInt(process.env.REMINDER_INTERVAL_HOURS || '24', 10);
const MAX_REMINDERS = parseInt(process.env.MAX_REMINDERS || '3', 10);

let reminderTimer = null;

/**
 * Check all pending members and send reminders where due.
 */
async function runReminderCycle(client) {
  const pending = queries.getAllPending().all();
  const now = Date.now();

  for (const row of pending) {
    // Check if enough time has passed since last reminder
    const lastReminder = row.last_reminder_at
      ? new Date(row.last_reminder_at + 'Z').getTime()
      : new Date(row.created_at + 'Z').getTime();

    const hoursSince = (now - lastReminder) / (1000 * 60 * 60);
    if (hoursSince < REMINDER_INTERVAL_HOURS) continue;

    // Check if max reminders reached
    if (MAX_REMINDERS > 0 && row.reminder_count >= MAX_REMINDERS) {
      queries.markMaxedOut().run(row.guild_id, row.user_id);
      console.log(`Max reminders reached for user ${row.user_id} in guild ${row.guild_id}`);
      try {
        const guild = await client.guilds.fetch(row.guild_id);
        const member = await guild.members.fetch(row.user_id);
        await auditlog.maxedOut(client, row.guild_id, member.user);
      } catch (_) {}
      continue;
    }

    try {
      const guild = await client.guilds.fetch(row.guild_id);
      const member = await guild.members.fetch(row.user_id);

      const settings = queries.getGuildSettings().get(row.guild_id);
      const mode = settings?.name_mode || 'first_initial';
      const modeInfo = NAME_MODES[mode];

      const embed = {
        color: 0xfee75c,
        title: 'Reminder: Name Verification Needed',
        description:
          `You still need to verify your name to access **${guild.name}**.\n\n` +
          `Please reply here with your **real name**.\n` +
          `**Format:** ${modeInfo.format}\n` +
          `**Examples:** ${modeInfo.examples}`,
        footer: {
          text: `Reminder ${row.reminder_count + 1}${MAX_REMINDERS > 0 ? ` of ${MAX_REMINDERS}` : ''}`,
        },
      };

      await member.user.send({ embeds: [embed] });
      queries.updateReminderCount().run(row.guild_id, row.user_id);
      console.log(`Sent reminder #${row.reminder_count + 1} to ${member.user.tag} for ${guild.name}`);
    } catch (err) {
      console.error(`Reminder failed for user ${row.user_id} in guild ${row.guild_id}: ${err.message}`);
    }

    // Rate limit
    await new Promise((resolve) => setTimeout(resolve, 1500));
  }
}

/**
 * Start the periodic reminder loop.
 */
function startReminderLoop(client) {
  // Run every hour to check for due reminders
  const INTERVAL_MS = 60 * 60 * 1000;

  // Run once shortly after startup
  setTimeout(() => runReminderCycle(client), 30_000);

  reminderTimer = setInterval(() => runReminderCycle(client), INTERVAL_MS);
  console.log(`Reminder loop started (checking every hour, reminding every ${REMINDER_INTERVAL_HOURS}h, max ${MAX_REMINDERS} reminders)`);
}

function stopReminderLoop() {
  if (reminderTimer) {
    clearInterval(reminderTimer);
    reminderTimer = null;
  }
}

module.exports = { startReminderLoop, stopReminderLoop, runReminderCycle };
