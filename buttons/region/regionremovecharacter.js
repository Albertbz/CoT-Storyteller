const { Op } = require("sequelize");
const { Players } = require("../../dbObjects");
const { StringSelectMenuOptionBuilder, StringSelectMenuBuilder, TextDisplayBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags, ContainerBuilder } = require("discord.js");

module.exports = {
  customId: 'region-remove-character-button',
  async execute(interaction) {
    // Defer update to allow time to process
    await interaction.deferUpdate();

    // Get page number from the customId, split my a :
    const [_, page] = interaction.customId.split(':');

    // Get player, character, and region
    const player = await Players.findByPk(interaction.user.id);
    const character = await player.getCharacter();
    const region = await character.getRegion();

    /**
     * Create a new container with all characters in the region except for the
     * user's character, and split into pages of 25 characters per page to be
     * displayed in a select menu
     */
    // Get all characters in the region except for the user's character. Ensure
    // that only characters that have have a player associated with them are
    // included, as they are the ones that are being played
    const characters = await region.getCharacters({
      where: { id: { [Op.not]: character.id } },
      include: { model: Players, required: true, as: 'player' }
    });

    // If there are no characters in the region except for the user's character,
    // show a message saying so
    if (characters.length === 0) {
      const noCharactersContainer = new ContainerBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `# No Characters in Region\n` +
            `There are currently no other characters in this region to remove.`
          )
        )
      return interaction.followUp({ components: [noCharactersContainer], flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] });
    }

    // Sort characters by name alphabetically
    characters.sort((a, b) => a.name.localeCompare(b.name));
    const charactersPerPage = 25;
    const totalPages = Math.floor(characters.length / charactersPerPage);
    const currentPage = parseInt(page) || 0;

    // Get the characters for the current page
    const startIndex = currentPage * charactersPerPage;
    const endIndex = startIndex + charactersPerPage;
    const charactersForPage = characters.slice(startIndex, endIndex);

    // Create the select menu options
    const options = charactersForPage.map(character => {
      const description = `${character.socialClassName}`;
      return new StringSelectMenuOptionBuilder()
        .setLabel(character.name)
        .setValue(character.id)
        .setDescription(description);
    });

    // Create the select menu
    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId(`region-remove-character-select`)
      .setPlaceholder('Select a character to remove from the region')
      .addOptions(options);

    // Create the container with the select menu and pagination buttons
    const container = new ContainerBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `# Remove Character from ${region.name}\n` +
          `Select a character from the dropdown menu below to remove them from the region. They can join again later if they wish, but this will remove them and send them a notification that they have been removed from the region.\n\n` +
          `-# Showing ${currentPage * charactersPerPage + 1} to ${Math.min((currentPage + 1) * charactersPerPage, characters.length)} of ${characters.length} characters\n`
        )
      )
      .addActionRowComponents(
        new ActionRowBuilder().addComponents(selectMenu)
      )
      .addActionRowComponents(
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(`region-remove-character-button:${currentPage - 1}`)
            .setEmoji('⬅️')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(currentPage <= 0),
          new ButtonBuilder()
            .setCustomId(`region-remove-character-button:${currentPage + 1}`)
            .setEmoji('➡️')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(currentPage >= totalPages),
          new ButtonBuilder()
            .setCustomId(`region-manager-return-button`)
            .setLabel(`Cancel`)
            .setStyle(ButtonStyle.Danger)
        )
      );

    // Show the container
    return interaction.editReply({ components: [container], flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] });
  }
}