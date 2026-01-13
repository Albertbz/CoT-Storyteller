const { SlashCommandBuilder, InteractionContextType, MessageFlags, userMention, EmbedBuilder } = require("discord.js");
const { Players } = require("../../dbObjects");
const { unassignCharacterFromPlayer, COLORS } = require("../../misc");

module.exports = {
  data: new SlashCommandBuilder()
    .setName('unassign')
    .setDescription('Unassign something from someone.')
    .setContexts(InteractionContextType.Guild)
    .setDefaultMemberPermissions(0)
    .addSubcommand(subcommand =>
      subcommand
        .setName('character')
        .setDescription('Unassign a character from a player.')
        .addUserOption(option =>
          option
            .setName('player')
            .setDescription('The player to unassign the character from.')
            .setRequired(true)
        )
    ),
  async autocomplete(interaction) {
    // No autocomplete needed for unassign command
  },
  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'character') {
      const playerUser = interaction.options.getUser('player');
      const player = await Players.findByPk(playerUser.id);

      if (!player) {
        return interaction.reply({ content: `The specified user ${userMention(playerUser.id)} is not a registered player.`, flags: MessageFlags.Ephemeral });
      }

      try {
        const { embed } = await unassignCharacterFromPlayer(interaction.user, player);
        return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
      }
      catch (error) {
        console.log(error);
        const errorEmbed = new EmbedBuilder()
          .setTitle('Character Not Unassigned')
          .setDescription(`An error occurred while trying to unassign the character: ${error.message}`)
          .setColor(COLORS.RED);
        return interaction.reply({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
      }
    }
  }
};