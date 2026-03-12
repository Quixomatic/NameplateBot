const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { queries } = require('../database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('whois')
    .setDescription('Check a member\'s verified name')
    .addUserOption((option) =>
      option.setName('member').setDescription('The member to look up').setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async execute(interaction) {
    const target = interaction.options.getUser('member');
    const verified = queries.getVerified().get(interaction.guild.id, target.id);
    const pending = queries.getPending().get(interaction.guild.id, target.id);

    if (verified) {
      await interaction.reply({
        content: `**${target.tag}** is verified as **${verified.display_name}** (since ${verified.verified_at} UTC).`,
        ephemeral: true,
      });
    } else if (pending) {
      await interaction.reply({
        content: `**${target.tag}** has a pending verification (${pending.reminder_count} reminder${pending.reminder_count === 1 ? '' : 's'} sent).`,
        ephemeral: true,
      });
    } else {
      await interaction.reply({
        content: `**${target.tag}** has no verification record.`,
        ephemeral: true,
      });
    }
  },
};
