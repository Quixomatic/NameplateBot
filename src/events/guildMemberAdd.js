const { Events } = require('discord.js');
const { startVerification } = require('../services/verification');

module.exports = {
  name: Events.GuildMemberAdd,
  async execute(member, client) {
    console.log(`New member joined: ${member.user.tag} in ${member.guild.name}`);
    await startVerification(member, client);
  },
};
