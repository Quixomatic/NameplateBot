const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { getDb } = require('../database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('stats')
    .setDescription('View verification statistics for this server')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async execute(interaction) {
    const db = getDb();
    const guildId = interaction.guild.id;

    const verified = db.prepare('SELECT COUNT(*) as count FROM verified_members WHERE guild_id = ?').get(guildId).count;
    const pending = db.prepare("SELECT COUNT(*) as count FROM pending_members WHERE guild_id = ? AND status = 'pending'").get(guildId).count;
    const maxedOut = db.prepare("SELECT COUNT(*) as count FROM pending_members WHERE guild_id = ? AND status = 'maxed_out'").get(guildId).count;
    const totalMembers = interaction.guild.memberCount;
    const botCount = interaction.guild.members.cache.filter((m) => m.user.bot).size;

    const embed = {
      color: 0x5865f2,
      title: 'Verification Stats',
      fields: [
        { name: 'Total Members', value: `${totalMembers - botCount}`, inline: true },
        { name: 'Verified', value: `${verified}`, inline: true },
        { name: 'Pending', value: `${pending}`, inline: true },
        { name: 'Maxed Out', value: `${maxedOut}`, inline: true },
      ],
      footer: { text: `${interaction.guild.name}` },
    };

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};
