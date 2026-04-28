const { Events } = require('discord.js');
const { queries } = require('../database');
const {
  processNameReply,
  finalizeVerification,
  getNameMode,
} = require('../services/verification');
const { validateName } = require('../utils/nameValidation');
const { deleteQuarantineChannel } = require('../services/quarantine');
const auditlog = require('../services/auditlog');

async function processQuarantineMessage(message, row, client) {
  const mode = getNameMode(message.guild.id);
  const result = validateName(message.content, mode);

  if (!result.valid) {
    await message.reply(result.reason);
    return;
  }

  let target;
  try {
    target = await message.guild.members.fetch(message.author.id);
  } catch (err) {
    console.error(`Quarantine: failed to fetch member ${message.author.id}: ${err.message}`);
    return;
  }

  try {
    await finalizeVerification(target, result.displayName, {
      reason: 'Nameplate: quarantine self-resolved',
    });
  } catch (err) {
    console.error(`Quarantine self-resolve failed for ${target.user.tag}:`, err);
    await message.reply(
      `Something went wrong setting your nickname. Please contact an admin.\n\`${err.message}\``
    );
    return;
  }

  await auditlog.quarantineResolvedByUser(client, message.guild.id, message.author, result.displayName);

  await message.reply(
    `Thanks, **${result.displayName}**! You now have full access to the server. This channel will be deleted in 60 seconds.`
  );

  deleteQuarantineChannel(client, row, 60_000);
}

module.exports = {
  name: Events.MessageCreate,
  async execute(message, client) {
    if (message.author.bot) return;

    if (message.guild) {
      const row = queries.getQuarantineByChannel().get(message.channel.id);
      if (!row) return;
      if (message.author.id !== row.user_id) return; // ignore admin chatter
      await processQuarantineMessage(message, row, client);
      return;
    }

    await processNameReply(message, client);
  },
};
