const { ContainerBuilder, TextDisplayBuilder, MessageFlags, StringSelectMenuOptionBuilder, StringSelectMenuBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const { Players, Characters } = require("../../dbObjects");

module.exports = {
  customId: 'region-remove-manager-button',
  async execute(interaction) {
    // Defer update to allow time to process
    await interaction.deferUpdate();

    // Get page number
    const [_, page] = interaction.customId.split(':');

    // Get the region to get the managers to remove
    const player = await Players.findByPk(interaction.user.id);
    const character = await player.getCharacter();
    const region = await character.getRegion();

    // Get all region managers in the region
    const regionManagers = await region.getRegionManagers({
      include: { model: Characters, as: 'character' }
    });

    if (regionManagers.length === 0) {
      const noManagersContainer = new ContainerBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `# No Region Managers\n` +
            `There are currently no region managers in your region to remove. Region managers are responsible for managing the region in various ways, and have access to all of the same buttons that you do. If you want to remove a region manager, there must first be a region manager to remove.`
          )
        )
      return interaction.followUp({ components: [noManagersContainer], flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] });
    }

    // Sort managers alphabetically by character name
    regionManagers.sort((a, b) => a.character.name.localeCompare(b.character.name));

    // Split managers into pages of 25 managers each
    const managersPerPage = 25;
    const totalPages = Math.ceil(regionManagers.length / managersPerPage);
    const currentPage = parseInt(page) || 0;
    const managersForPage = regionManagers.slice(currentPage * managersPerPage, (currentPage + 1) * managersPerPage);

    // Create the select menu options
    const options = managersForPage.map(manager => {
      return new StringSelectMenuOptionBuilder()
        .setLabel(manager.character.name)
        .setValue(manager.id)
    });

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId(`region-remove-manager-select`)
      .setPlaceholder('Select the character you wish to remove as a region manager')
      .addOptions(options);

    // Create the container with the select menu and pagination buttons
    const container = new ContainerBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `# Remove Region Manager\n` +
          `Select a character from the dropdown menu below to remove them as a region manager. Region managers are responsible for managing the region in various ways, and have access to all of the same buttons that you do. If you want to remove a region manager, there must first be a region manager to remove.\n\n` +
          `-# Showing ${currentPage * managersPerPage + 1} to ${Math.min((currentPage + 1) * managersPerPage, regionManagers.length)} of ${regionManagers.length} region managers`
        )
      )
      .addActionRowComponents(
        new ActionRowBuilder().addComponents(selectMenu),
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(`region-remove-manager-button:${currentPage - 1}`)
            .setEmoji('⬅️')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(currentPage === 0),
          new ButtonBuilder()
            .setCustomId(`region-remove-manager-button:${currentPage + 1}`)
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