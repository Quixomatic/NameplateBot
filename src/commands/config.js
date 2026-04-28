const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const { queries } = require('../database');
const { NAME_MODES } = require('../utils/nameValidation');

function parseRoleIds(csv) {
  if (!csv) return [];
  return csv.split(',').map((s) => s.trim()).filter(Boolean);
}

function formatRoleIds(ids) {
  return ids.length ? ids.join(',') : null;
}

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
      sub
        .setName('quarantinecategory')
        .setDescription('Set the category that quarantine channels are created under')
        .addChannelOption((option) =>
          option
            .setName('category')
            .setDescription('Category to nest quarantine channels under (leave empty to clear)')
            .addChannelTypes(ChannelType.GuildCategory)
            .setRequired(false)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('quarantinemaxage')
        .setDescription('How long (in hours) before a quarantine channel auto-closes')
        .addIntegerOption((option) =>
          option
            .setName('hours')
            .setDescription('Hours before auto-close (1–720). Default 168 (7 days).')
            .setMinValue(1)
            .setMaxValue(720)
            .setRequired(true)
        )
    )
    .addSubcommandGroup((group) =>
      group
        .setName('verifierroles')
        .setDescription('Roles (besides admins) that get access to quarantine channels')
        .addSubcommand((sub) =>
          sub
            .setName('add')
            .setDescription('Add a role to the verifier list')
            .addRoleOption((option) =>
              option.setName('role').setDescription('The role to add').setRequired(true)
            )
        )
        .addSubcommand((sub) =>
          sub
            .setName('remove')
            .setDescription('Remove a role from the verifier list')
            .addRoleOption((option) =>
              option.setName('role').setDescription('The role to remove').setRequired(true)
            )
        )
    )
    .addSubcommand((sub) =>
      sub.setName('view').setDescription('View current server settings')
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    const group = interaction.options.getSubcommandGroup(false);
    const subcommand = interaction.options.getSubcommand();

    if (group === 'verifierroles') {
      const role = interaction.options.getRole('role');
      const settings = queries.getGuildSettings().get(interaction.guild.id);
      const current = parseRoleIds(settings?.verifier_role_ids);

      if (subcommand === 'add') {
        if (current.includes(role.id)) {
          return interaction.reply({
            content: `${role} is already in the verifier list.`,
            ephemeral: true,
          });
        }
        current.push(role.id);
        queries.setVerifierRoles().run(interaction.guild.id, formatRoleIds(current));
        return interaction.reply({
          content: `Added ${role} to the verifier list. Members with this role will be added to quarantine channels.`,
          ephemeral: true,
        });
      }

      if (subcommand === 'remove') {
        if (!current.includes(role.id)) {
          return interaction.reply({
            content: `${role} is not in the verifier list.`,
            ephemeral: true,
          });
        }
        const filtered = current.filter((id) => id !== role.id);
        queries.setVerifierRoles().run(interaction.guild.id, formatRoleIds(filtered));
        return interaction.reply({
          content: `Removed ${role} from the verifier list.`,
          ephemeral: true,
        });
      }
    }

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
    } else if (subcommand === 'quarantinecategory') {
      const category = interaction.options.getChannel('category');

      if (category) {
        queries.setQuarantineCategory().run(interaction.guild.id, category.id);
        await interaction.reply({
          content: `Quarantine channels will be created under **${category.name}**.`,
          ephemeral: true,
        });
      } else {
        queries.setQuarantineCategory().run(interaction.guild.id, null);
        await interaction.reply({
          content: 'Quarantine channels will now be created at the server root.',
          ephemeral: true,
        });
      }
    } else if (subcommand === 'quarantinemaxage') {
      const hours = interaction.options.getInteger('hours');
      queries.setQuarantineMaxAge().run(interaction.guild.id, hours);
      await interaction.reply({
        content: `Quarantine channels will auto-close after **${hours} hour${hours === 1 ? '' : 's'}** of inactivity.`,
        ephemeral: true,
      });
    } else if (subcommand === 'view') {
      const settings = queries.getGuildSettings().get(interaction.guild.id);
      const mode = settings?.name_mode || 'first_initial';
      const modeInfo = NAME_MODES[mode];
      const logChannel = settings?.log_channel_id ? `<#${settings.log_channel_id}>` : 'Not set';
      const quarantineCategory = settings?.quarantine_category_id
        ? `<#${settings.quarantine_category_id}>`
        : 'Not set (created at server root)';
      const maxAge = settings?.quarantine_max_age_hours ?? 168;
      const verifierRoleIds = parseRoleIds(settings?.verifier_role_ids);
      const verifierRoles = verifierRoleIds.length
        ? verifierRoleIds.map((id) => `<@&${id}>`).join(', ')
        : 'None (admins only)';

      await interaction.reply({
        content:
          `**Current settings:**\n` +
          `Name mode: **${modeInfo.label}**\n` +
          `Format: ${modeInfo.format}\n` +
          `Examples: ${modeInfo.examples}\n` +
          `Log channel: ${logChannel}\n` +
          `Quarantine category: ${quarantineCategory}\n` +
          `Quarantine max age: **${maxAge}h**\n` +
          `Verifier roles: ${verifierRoles}`,
        ephemeral: true,
      });
    }
  },
};
