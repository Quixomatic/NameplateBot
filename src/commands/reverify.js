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
    await interaction.deferReply({ ephemeral: true });

    const target = interaction.options.getMember('member');

    if (!target) {
      return interaction.editReply({ content: 'Could not find that member.' });
    }

    if (target.user.bot) {
      return interaction.editReply({ content: 'Cannot verify bots.' });
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

    await interaction.editReply({
      content: `Verification DM sent to **${target.user.tag}**.`,
    });
  },
};
