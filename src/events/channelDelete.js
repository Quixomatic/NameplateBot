const { Events } = require('discord.js');
const { queries } = require('../database');

module.exports = {
  name: Events.ChannelDelete,
  async execute(channel) {
    if (!channel?.id) return;
    const row = queries.getQuarantineByChannel().get(channel.id);
    if (!row) return;
    queries.deleteQuarantineByChannel().run(channel.id);
    console.log(`Quarantine channel ${channel.id} deleted out of band; cleaned up DB row.`);
  },
};
