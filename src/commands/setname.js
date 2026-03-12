const { SlashCommandBuilder } = require('discord.js');
const { validateName } = require('../utils/nameValidation');
const { ensureVerifiedRole } = require('../services/verification');
const { queries } = require('../database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setname')
    .setDescription('Set or update your verified name')
    .addStringOption((option) =>
      option
        .setName('name')
        .setDescription('Your real name (first name + at least last initial)')
        .setRequired(true)
    ),

  async execute(interaction) {
    const input = interaction.options.getString('name');
    const result = validateName(input);

    if (!result.valid) {
      return interaction.reply({ content: result.reason, ephemeral: true });
    }

    try {
      await interaction.member.setNickname(result.displayName, 'Nameplate: /setname');

      const role = await ensureVerifiedRole(interaction.guild);
      await interaction.member.roles.add(role, 'Nameplate: /setname verification');

      // Update DB
      queries.removePending().run(interaction.guild.id, interaction.user.id);
      queries.upsertVerified().run(interaction.guild.id, interaction.user.id, result.displayName);

      await interaction.reply({
        content: `Your nickname has been set to **${result.displayName}**.`,
        ephemeral: true,
      });
    } catch (err) {
      console.error(`/setname error for ${interaction.user.tag}:`, err);
      await interaction.reply({
        content: `Could not set your nickname. Make sure the bot's role is higher than yours in the role hierarchy.\n\`${err.message}\``,
        ephemeral: true,
      });
    }
  },
};
