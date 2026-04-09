const { Op } = require("sequelize");
const { Players, Steelbearers } = require("../../dbObjects");
const { StringSelectMenuOptionBuilder, StringSelectMenuBuilder, ContainerBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags, TextDisplayBuilder } = require("discord.js");

module.exports = {
  customId: 'region-add-steelbearer-button',
  async execute(interaction) {
    await interaction.deferUpdate();

    // Get the page number from the customId, split by :
    const [_, page] = interaction.customId.split(':');

    /**
     * Create a select menu where the user can select any characters from the
     * region that are not Commoner (so Notable, Noble and Ruler)
     */
    // First, get the region by getting the region of the character of the user
    const player = await Players.findByPk(interaction.user.id);
    const character = await player.getCharacter();
    const region = await character.getRegion();

    // Get the characters of the region that are not Commoner and that do not
    // exist in the Steelbearers table
    const characters = await region.getCharacters({
      where: {
        socialClassName: { [Op.not]: 'Commoner' },
        '$steelbearer.id$': null
      },
      include: [
        { model: Players, required: true, as: 'player' },
        { model: Steelbearers, required: false, as: 'steelbearer' }
      ]
    });

    // If there are no characters that can be made steelbearers, show a message saying so
    if (characters.length === 0) {
      const noEligibleCharactersContainer = new ContainerBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `# No Eligible Characters\n` +
            `There are currently no characters in this region that are eligible to be made steelbearers. Only Notable, Noble and Ruler characters that are not already steelbearers can be made steelbearers. If you want to make a character a steelbearer, they must first opt in to become notable.`
          )
        )
      return interaction.followUp({ components: [noEligibleCharactersContainer], flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] });
    }

    // Split up into pages of 25 characters each
    const charactersPerPage = 25;
    const totalPages = Math.ceil(characters.length / charactersPerPage);
    const currentPage = parseInt(page) || 0;
    const charactersForPage = characters.slice(currentPage * charactersPerPage, (currentPage + 1) * charactersPerPage);

    // Create the select menu options
    const options = charactersForPage.map(character => {
      return new StringSelectMenuOptionBuilder()
        .setLabel(character.name)
        .setValue(character.id)
    })

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId('region-add-steelbearer-select')
      .setPlaceholder('Select the character you wish to grant steelbearer status to')
      .addOptions(options);

    // Create the container with the select menu and pagination buttons
    const container = new ContainerBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `# Add Steelbearer\n` +
          `Select a character from the dropdown menu below to grant them steelbearer status. Only Notable, Noble and Ruler characters can be made steelbearers - if you want to make a commoner a steelbearer, they must first opt in to become notable.\n\n` +
          `-# Showing ${currentPage * charactersPerPage + 1} to ${Math.min((currentPage + 1) * charactersPerPage, characters.length)} of ${characters.length} characters`
        )
      )
      .addActionRowComponents(
        new ActionRowBuilder().addComponents(selectMenu),
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(`region-add-steelbearer-button:${currentPage - 1}`)
            .setEmoji('⬅️')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(currentPage === 0),
          new ButtonBuilder()
            .setCustomId(`region-add-steelbearer-button:${currentPage + 1}`)
            .setEmoji('➡️')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(currentPage === totalPages - 1),
          new ButtonBuilder()
            .setCustomId('region-manager-return-button')
            .setLabel('Cancel')
            .setStyle(ButtonStyle.Danger)
        )
      )

    // Edit the original message to show the container
    await interaction.editReply({ components: [container], flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] });
  }
}