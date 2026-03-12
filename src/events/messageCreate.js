const { Events } = require('discord.js');
const { processNameReply } = require('../services/verification');

module.exports = {
  name: Events.MessageCreate,
  async execute(message, client) {
    // Only process DMs from non-bots
    if (message.author.bot) return;
    if (message.guild) return; // Ignore messages in servers

    await processNameReply(message, client);
  },
};
