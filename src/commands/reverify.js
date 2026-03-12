const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { queries } = require('../database');
const { startVerification } = require('../services/verification');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('reverify')
    .setDescription('Re-send verification to a specific member')
    .addUserOption((option) =>
      option.setName('member').setDescription('The member to re-verify').setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    const target = interaction.options.getMember('member');

    if (!target) {
      return interaction.reply({ content: 'Could not find that member.', ephemeral: true });
    }

    if (target.user.bot) {
      return interaction.reply({ content: 'Cannot verify bots.', ephemeral: true });
    }

    // Remove existing records so they can re-verify
    queries.removePending().run(interaction.guild.id, target.user.id);

    // Remove from verified so startVerification doesn't skip them
    const db = require('../database').getDb();
    db.prepare('DELETE FROM verified_members WHERE guild_id = ? AND user_id = ?').run(
      interaction.guild.id,
      target.user.id
    );

    await startVerification(target);

    await interaction.reply({
      content: `Verification DM sent to **${target.user.tag}**.`,
      ephemeral: true,
    });
  },
};
