const { ContextMenuCommandBuilder, ApplicationCommandType, PermissionFlagsBits } = require('discord.js');
const { queries, getDb } = require('../database');
const { startVerification } = require('../services/verification');
const auditlog = require('../services/auditlog');

module.exports = {
  data: new ContextMenuCommandBuilder()
    .setName('Re-verify')
    .setType(ApplicationCommandType.User)
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction, client) {
    await interaction.deferReply({ ephemeral: true });

    const target = interaction.targetMember;

    if (!target) {
      return interaction.editReply({ content: 'Could not find that member.' });
    }

    if (target.user.bot) {
      return interaction.editReply({ content: 'Cannot verify bots.' });
    }

    queries.removePending().run(interaction.guild.id, target.user.id);
    getDb().prepare('DELETE FROM verified_members WHERE guild_id = ? AND user_id = ?').run(
      interaction.guild.id,
      target.user.id
    );

    await startVerification(target, client);
    await auditlog.reverify(client, interaction.guild.id, target.user, interaction.user);

    await interaction.editReply({
      content: `Verification DM sent to **${target.user.tag}**.`,
    });
  },
};
