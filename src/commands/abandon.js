const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { queries, getDb } = require('../database');
const { deleteQuarantineChannel } = require('../services/quarantine');
const auditlog = require('../services/auditlog');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('abandon')
    .setDescription('Abandon a quarantine channel without verifying the member (in-channel only)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction, client) {
    const row = queries.getQuarantineByChannel().get(interaction.channel.id);
    if (!row) {
      return interaction.reply({
        content: 'This command can only be used inside a quarantine channel.',
        ephemeral: true,
      });
    }

    await interaction.deferReply();

    let targetUser;
    try {
      const member = await interaction.guild.members.fetch(row.user_id);
      targetUser = member.user;
    } catch (_) {
      try {
        targetUser = await client.users.fetch(row.user_id);
      } catch (_) {
        targetUser = null;
      }
    }

    // Mark the user as maxed_out so they don't get further reminders
    getDb()
      .prepare(
        `INSERT INTO pending_members (guild_id, user_id, status)
         VALUES (?, ?, 'maxed_out')
         ON CONFLICT (guild_id, user_id) DO UPDATE SET
           status = 'maxed_out',
           updated_at = datetime('now')`
      )
      .run(row.guild_id, row.user_id);

    if (targetUser) {
      await auditlog.quarantineAbandoned(client, row.guild_id, targetUser, interaction.user);
    }

    await interaction.editReply({
      content: `Quarantine abandoned by ${interaction.user}. This channel will be deleted in 30 seconds.`,
    });

    deleteQuarantineChannel(client, row, 30_000);
  },
};
