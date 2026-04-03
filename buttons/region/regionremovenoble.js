const { StringSelectMenuOptionBuilder, StringSelectMenuBuilder, ContainerBuilder, TextDisplayBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require("discord.js");
const { Players } = require('../../dbObjects');

module.exports = {
  customId: 'region-remove-noble-button',
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
      where: { socialClassName: 'Noble' },
      include: { model: Players, required: true, as: 'player' }
    });

    if (characters.length === 0) {
      const noNoblesContainer = new ContainerBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `# No Noble Characters\n` +
            `There are currently no Noble characters in your region to remove nobility from.`
          )
        )
      return interaction.followUp({ components: [noNoblesContainer], flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] });
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
      .setCustomId(`region-remove-noble-select`)
      .setPlaceholder('Select the character whose nobility you want to remove')
      .addOptions(options);

    // Create the container with the select menu and pagination buttons
    const container = new ContainerBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `# Remove Nobility\n` +
          `Select a character from the dropdown menu below to remove their nobility. Any charactors whose nobility are removed are made Notable.\n\n` +
          `-# Showing ${currentPage * charactersPerPage + 1} to ${Math.min((currentPage + 1) * charactersPerPage, characters.length)} of ${characters.length} characters`
        )
      )
      .addActionRowComponents(
        new ActionRowBuilder().addComponents(selectMenu)
      )
      .addActionRowComponents(
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(`region-remove-noble-button:${currentPage - 1}`)
            .setEmoji('⬅️')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(currentPage === 0),
          new ButtonBuilder()
            .setCustomId(`region-remove-noble-button:${currentPage + 1}`)
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