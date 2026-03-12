const { ContextMenuCommandBuilder, ApplicationCommandType, PermissionFlagsBits } = require('discord.js');
const { ensureVerifiedRole } = require('../services/verification');
const { queries } = require('../database');

module.exports = {
  data: new ContextMenuCommandBuilder()
    .setName('Admin Verify')
    .setType(ApplicationCommandType.User)
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    const target = interaction.targetMember;

    if (!target) {
      return interaction.reply({ content: 'Could not find that member.', ephemeral: true });
    }

    if (target.user.bot) {
      return interaction.reply({ content: 'Cannot verify bots.', ephemeral: true });
    }

    const role = await ensureVerifiedRole(interaction.guild);
    await target.roles.add(role, 'Nameplate: admin-verified');

    queries.removePending().run(interaction.guild.id, target.user.id);
    const displayName = target.nickname || target.user.displayName;
    queries.upsertVerified().run(interaction.guild.id, target.user.id, displayName);

    await interaction.reply({
      content: `**${target.user.tag}** has been verified as **${displayName}**.`,
      ephemeral: true,
    });
  },
};
