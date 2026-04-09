const { StringSelectMenuOptionBuilder, StringSelectMenuBuilder, ContainerBuilder, TextDisplayBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require("discord.js");
const { Players } = require('../../dbObjects');

module.exports = {
  customId: 'region-add-noble-button',
  async execute(interaction) {
    // Defer update to allow time to process
    await interaction.deferUpdate();

    // Get page number
    const [_, page] = interaction.customId.split(':');

    // Make a select menu of all characters in the region that are Notable
    const player = await Players.findByPk(interaction.user.id);
    const character = await player.getCharacter();
    const region = await character.getRegion();
    const characters = await region.getCharacters({
      where: { socialClassName: 'Notable' },
      include: { model: Players, required: true, as: 'player' }
    });

    if (characters.length === 0) {
      const noNotablesContainer = new ContainerBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `# No Notable Characters\n` +
            `There are currently no Notable characters in your region to grant nobility to. Only Notable characters can be made nobles - if you want to make a commoner a noble, they must first opt in to become notable.`
          )
        )
      return interaction.followUp({ components: [noNotablesContainer], flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] });
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
      .setCustomId(`region-add-noble-select`)
      .setPlaceholder('Select the character you wish to grant nobility to')
      .addOptions(options);

    // Create the container with the select menu and pagination buttons
    const container = new ContainerBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `# Grant Nobility\n` +
          `Select a character from the dropdown menu below to grant them nobility. Only Notable characters can be granted nobility - if you want to make a commoner a noble, they must first opt in to become notable.\n\n` +
          `-# Showing ${currentPage * charactersPerPage + 1} to ${Math.min((currentPage + 1) * charactersPerPage, characters.length)} of ${characters.length} characters`
        )
      )
      .addActionRowComponents(
        new ActionRowBuilder().addComponents(selectMenu)
      )
      .addActionRowComponents(
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(`region-add-noble-button:${currentPage - 1}`)
            .setEmoji('⬅️')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(currentPage === 0),
          new ButtonBuilder()
            .setCustomId(`region-add-noble-button:${currentPage + 1}`)
            .setEmoji('➡️')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(currentPage === totalPages - 1),
          new ButtonBuilder()
            .setCustomId('region-manager-return-button')
            .setLabel('Cancel')
            .setStyle(ButtonStyle.Danger)
        )
      )

    return interaction.editReply({ components: [container], flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] });
  }
}