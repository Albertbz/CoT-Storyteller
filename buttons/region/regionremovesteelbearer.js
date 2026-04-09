const { ContainerBuilder, TextDisplayBuilder, MessageFlags, StringSelectMenuOptionBuilder, StringSelectMenuBuilder, ActionRowBuilder, ButtonStyle, ButtonBuilder } = require("discord.js");
const { Players, Steelbearers, Characters } = require("../../dbObjects");

module.exports = {
  customId: 'region-remove-steelbearer-button',
  async execute(interaction) {
    await interaction.deferUpdate();

    // First, get the region by getting the region of the character of the user
    const player = await Players.findByPk(interaction.user.id);
    const character = await player.getCharacter();
    const region = await character.getRegion();

    // Then, get all the steelbearers of the region
    const steelbearers = await Steelbearers.findAll({
      where: { regionId: region.id },
      include: { model: Characters, as: 'character', required: true }
    });

    // If there are no steelbearers, reply with an error message
    if (steelbearers.length === 0) {
      const noSteelbearersContainer = new ContainerBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `# No Steelbearers\n` +
            `There are currently no steelbearers in this region to remove.`
          )
        )
      return interaction.followUp({ components: [noSteelbearersContainer], flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] });
    }

    // Otherwise, create a select menu to select which steelbearer to remove
    // The steelbearers should be sorted by type (Ruler, General-purpose, Duchy, 
    // Vassal, Liege) and then alphabetically within each type, and the option 
    // description should show the type of steelbearer they are
    const typeOrder = ['Ruler', 'General-purpose', 'Duchy', 'Vassal', 'Liege'];
    steelbearers.sort((a, b) => {
      if (a.type !== b.type) {
        return typeOrder.indexOf(a.type) - typeOrder.indexOf(b.type);
      }
      return a.character.name.localeCompare(b.character.name);
    });
    const options = []
    for (const steelbearer of steelbearers) {
      options.push(
        new StringSelectMenuOptionBuilder()
          .setLabel(steelbearer.character.name)
          .setValue(steelbearer.id)
          .setDescription(await steelbearer.fullType)
      )
    }

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId('region-remove-steelbearer-select')
      .setPlaceholder('Select the steelbearer you wish to remove')
      .addOptions(options);

    const container = new ContainerBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `# Remove Steelbearer\n` +
          `Select a steelbearer from the dropdown menu below to remove their steelbearer status. This will notify the player of the character that they have been removed as a steelbearer.`
        )
      )
      .addActionRowComponents(
        new ActionRowBuilder().addComponents(selectMenu),
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('region-manager-return-button')
            .setLabel('Cancel')
            .setStyle(ButtonStyle.Danger)
        )
      )

    return interaction.editReply({ components: [container], flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] });
  }
}