const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { createQuarantine } = require('../services/quarantine');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('quarantine')
    .setDescription('Open a private channel with the member and admins to collect their name')
    .addUserOption((option) =>
      option.setName('member').setDescription('The member to quarantine').setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction, client) {
    await interaction.deferReply({ ephemeral: true });

    const target = interaction.options.getMember('member');

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
      console.error(`/quarantine failed for ${target.user.tag}:`, err);
      await interaction.editReply({
        content: `Could not create quarantine channel: \`${err.message}\``,
      });
    }
  },
};
