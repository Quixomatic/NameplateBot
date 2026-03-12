const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const { queries } = require('../database');
const { NAME_MODES } = require('../utils/nameValidation');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('config')
    .setDescription('Configure Nameplate settings for this server')
    .addSubcommand((sub) =>
      sub
        .setName('namemode')
        .setDescription('Set the name format requirement')
        .addStringOption((option) =>
          option
            .setName('mode')
            .setDescription('How strict the name requirement should be')
            .setRequired(true)
            .addChoices(
              { name: 'First name only', value: 'first_only' },
              { name: 'First name + last initial (default)', value: 'first_initial' },
              { name: 'Full first and last name', value: 'full_name' }
            )
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('logchannel')
        .setDescription('Set the channel for verification logs')
        .addChannelOption((option) =>
          option
            .setName('channel')
            .setDescription('The channel to post logs to (leave empty to disable)')
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(false)
        )
    )
    .addSubcommand((sub) =>
      sub.setName('view').setDescription('View current server settings')
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'namemode') {
      const mode = interaction.options.getString('mode');
      queries.upsertGuildSettings().run(interaction.guild.id, mode);
      const modeInfo = NAME_MODES[mode];

      await interaction.reply({
        content: `Name mode set to **${modeInfo.label}**.\nMembers will need to provide: ${modeInfo.format}\nExamples: ${modeInfo.examples}`,
        ephemeral: true,
      });
    } else if (subcommand === 'logchannel') {
      const channel = interaction.options.getChannel('channel');

      if (channel) {
        queries.setLogChannel().run(interaction.guild.id, channel.id);
        await interaction.reply({
          content: `Verification logs will be posted to ${channel}.`,
          ephemeral: true,
        });
      } else {
        queries.setLogChannel().run(interaction.guild.id, null);
        await interaction.reply({
          content: 'Verification logging has been disabled.',
          ephemeral: true,
        });
      }
    } else if (subcommand === 'view') {
      const settings = queries.getGuildSettings().get(interaction.guild.id);
      const mode = settings?.name_mode || 'first_initial';
      const modeInfo = NAME_MODES[mode];
      const logChannel = settings?.log_channel_id ? `<#${settings.log_channel_id}>` : 'Not set';

      await interaction.reply({
        content: `**Current settings:**\nName mode: **${modeInfo.label}**\nFormat: ${modeInfo.format}\nExamples: ${modeInfo.examples}\nLog channel: ${logChannel}`,
        ephemeral: true,
      });
    }
  },
};
