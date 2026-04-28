const { ContextMenuCommandBuilder, ApplicationCommandType, PermissionFlagsBits } = require('discord.js');
const { createQuarantine } = require('../services/quarantine');

module.exports = {
  data: new ContextMenuCommandBuilder()
    .setName('Quarantine')
    .setType(ApplicationCommandType.User)
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction, client) {
    await interaction.deferReply({ ephemeral: true });

    const target = interaction.targetMember;

    if (!target) {
      return interaction.editReply({ content: 'Could not find that member.' });
    }

    if (target.user.bot) {
      return interaction.editReply({ content: 'Cannot quarantine bots.' });
    }

    try {
      const { channel, alreadyExisted } = await createQuarantine(
        interaction.guild,
        target,
        interaction.user,
        client
      );

      await interaction.editReply({
        content: alreadyExisted
          ? `**${target.user.tag}** already has a quarantine channel: <#${channel.id}>`
          : `Quarantine channel created for **${target.user.tag}**: <#${channel.id}>`,
      });
    } catch (err) {
      console.error(`Quarantine context menu failed for ${target.user.tag}:`, err);
      await interaction.editReply({
        content: `Could not create quarantine channel: \`${err.message}\``,
      });
    }
  },
};
