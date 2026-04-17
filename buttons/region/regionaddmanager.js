const { MessageFlags, ContainerBuilder, TextDisplayBuilder, StringSelectMenuOptionBuilder, StringSelectMenuBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const { Players, RegionManagers } = require("../../dbObjects");

module.exports = {
  customId: 'region-add-manager-button',
  async execute(interaction) {
    // Defer update to allow time to process
    await interaction.deferUpdate();

    // Get page number
    const [_, page] = interaction.customId.split(':');

    // Get the region to get the characters to add as managers
    const player = await Players.findByPk(interaction.user.id);
    const character = await player.getCharacter();
    const region = await character.getRegion();

    // Get all characters in the region that are not already region managers
    const characters = await region.getCharacters({
      include: [
        { model: Players, required: true, as: 'player' },
        { model: RegionManagers, required: false, as: 'regionManager' }
      ],
      where: { '$regionManager.id$': null }
    });

    if (characters.length === 0) {
      const noCharactersContainer = new ContainerBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `# No Characters\n` +
            `There are currently no characters in your region to add as managers. Only characters in the region can be made managers - if you want to make a character a manager, they must first move to the region.`
          )
        )
      return interaction.followUp({ components: [noCharactersContainer], flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] });
    }

    characters.sort((a, b) => a.name.localeCompare(b.name));

    // Split characters into pages of 25 characters each
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
      .setCustomId(`region-add-manager-select`)
      .setPlaceholder('Select the character you wish to add as a region manager')
      .addOptions(options);

    // Create the container with the select menu and pagination buttons
    const container = new ContainerBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `# Add Region Manager\n` +
          `Select the character you wish to add as a region manager from the list below.\n\n` +
          `-# Showing ${currentPage * charactersPerPage + 1} to ${Math.min((currentPage + 1) * charactersPerPage, characters.length)} of ${characters.length} characters`
        )
      )
      .addActionRowComponents(
        new ActionRowBuilder().addComponents(selectMenu),
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(`region-add-manager-button:${currentPage - 1}`)
            .setEmoji('⬅️')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(currentPage === 0),
          new ButtonBuilder()
            .setCustomId(`region-add-manager-button:${currentPage + 1}`)
            .setEmoji('➡️')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(currentPage === totalPages - 1),
          new ButtonBuilder()
            .setCustomId(`region-manager-return-button`)
            .setLabel(`Cancel`)
            .setStyle(ButtonStyle.Danger)
        )
      )

    return interaction.editReply({ components: [container], flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] });
  }
}