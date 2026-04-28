const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { queries } = require('../database');
const { validateName } = require('../utils/nameValidation');
const { finalizeVerification, getNameMode } = require('../services/verification');
const { deleteQuarantineChannel } = require('../services/quarantine');
const auditlog = require('../services/auditlog');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('resolve')
    .setDescription('Resolve a quarantine channel (in-channel only)')
    .addStringOption((option) =>
      option
        .setName('name')
        .setDescription("Optional: set the member's nickname to this. Omit to keep their current nickname.")
        .setRequired(false)
    )
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

    let target;
    try {
      target = await interaction.guild.members.fetch(row.user_id);
    } catch (_) {
      queries.deleteQuarantine().run(row.guild_id, row.user_id);
      return interaction.editReply({
        content: 'The quarantined member is no longer in the server. Closing channel.',
      });
    }

    const providedName = interaction.options.getString('name');
    let displayName;
    let setNickname;

    if (providedName) {
      const mode = getNameMode(interaction.guild.id);
      const result = validateName(providedName, mode);
      if (!result.valid) {
        return interaction.editReply({ content: result.reason });
      }
      displayName = result.displayName;
      setNickname = true;
    } else {
      displayName = target.nickname || target.user.displayName;
      setNickname = false;
    }

    try {
      await finalizeVerification(target, displayName, {
        setNickname,
        reason: `Nameplate: quarantine resolved by ${interaction.user.tag}`,
      });
    } catch (err) {
      console.error(`/resolve failed for ${target.user.tag}:`, err);
      return interaction.editReply({
        content: `Could not finalize verification: \`${err.message}\``,
      });
    }

    await auditlog.quarantineResolvedByAdmin(
      client,
      interaction.guild.id,
      target.user,
      displayName,
      interaction.user
    );

    await interaction.editReply({
      content: `Resolved as **${displayName}** by ${interaction.user}. This channel will be deleted in 60 seconds.`,
    });

    deleteQuarantineChannel(client, row, 60_000);
  },
};
