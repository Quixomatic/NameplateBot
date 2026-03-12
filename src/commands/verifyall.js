const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { verifyExistingMembers, ensureVerifiedRole } = require('../services/verification');
const { queries } = require('../database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('verifyall')
    .setDescription('Send verification DMs to all unverified members in this server')
    .addBooleanOption((option) =>
      option
        .setName('dryrun')
        .setDescription('Preview how many members would be messaged without actually sending DMs')
        .setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const dryrun = interaction.options.getBoolean('dryrun') ?? false;

    if (dryrun) {
      const role = await ensureVerifiedRole(interaction.guild);
      const members = await interaction.guild.members.fetch();
      let unverifiedCount = 0;

      for (const [, member] of members) {
        if (member.user.bot) continue;
        if (member.roles.cache.has(role.id)) continue;
        const verified = queries.isVerified().get(interaction.guild.id, member.user.id);
        if (verified) continue;
        const pending = queries.getPending().get(interaction.guild.id, member.user.id);
        if (pending) continue;
        unverifiedCount++;
      }

      await interaction.editReply(
        unverifiedCount > 0
          ? `**Dry run:** ${unverifiedCount} unverified member${unverifiedCount === 1 ? '' : 's'} would receive a verification DM.`
          : 'All members are already verified or have pending verification requests.'
      );
    } else {
      const count = await verifyExistingMembers(interaction.guild);

      await interaction.editReply(
        count > 0
          ? `Sent verification DMs to **${count}** unverified member${count === 1 ? '' : 's'}.`
          : 'All members are already verified or have pending verification requests.'
      );
    }
  },
};
