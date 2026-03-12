const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { verifyExistingMembers } = require('../services/verification');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('verifyall')
    .setDescription('Send verification DMs to all unverified members in this server')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const count = await verifyExistingMembers(interaction.guild);

    await interaction.editReply(
      count > 0
        ? `Sent verification DMs to **${count}** unverified member${count === 1 ? '' : 's'}.`
        : 'All members are already verified or have pending verification requests.'
    );
  },
};
