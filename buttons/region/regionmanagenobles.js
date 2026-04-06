const { ContainerBuilder, TextDisplayBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags, SeparatorBuilder } = require("discord.js");
const { Players } = require("../../dbObjects");

module.exports = {
  customId: 'region-manage-nobles-button',
  async execute(interaction) {
    // Defer update to allow time to process
    await interaction.deferUpdate();

    // Get the region to get the nobles
    const player = await Players.findByPk(interaction.user.id);
    const character = await player.getCharacter();
    const region = await character.getRegion();
    const nobleCharacters = await region.getCharacters({
      where: { socialClassName: 'Noble' },
      include: { model: Players, required: true, as: 'player' }
    });
    nobleCharacters.sort((a, b) => a.name.localeCompare(b.name));

    // Show the user the noble management menu:
    // - A button to make a character a noble
    // - A button to remove noble status from a character
    // - A button to return to the region management menu

    const disableRemoveButton = nobleCharacters.length === 0;

    const container = new ContainerBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `# Manage Nobles\n` +
          `In this menu, you can manage the nobles in your region, **${region.name}**. You can grant nobility only to Notable characters - commoners cannot be made nobles.\n\n` +
          `${nobleCharacters.length > 0 ? `Currently, the following characters in your region are nobles:\n${nobleCharacters.map(character => `- ${character.name}`).join('\n')}\n` : `There are currently no nobles in your region.\n`}`
        )
      )
      .addSeparatorComponents(
        new SeparatorBuilder()
      )
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `Select an option below to manage nobles in your region.`
        )
      )
      .addActionRowComponents(
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(`region-add-noble-button`)
            .setLabel(`Grant Nobility`)
            .setEmoji('📜')
            .setStyle(ButtonStyle.Secondary),
          new ButtonBuilder()
            .setCustomId(`region-remove-noble-button`)
            .setLabel(`Remove Nobility`)
            .setEmoji('🥀')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(disableRemoveButton),
          new ButtonBuilder()
            .setCustomId(`region-manager-return-button`)
            .setLabel(`Cancel`)
            .setStyle(ButtonStyle.Danger)
        ),
      );

    await interaction.editReply({ components: [container], flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] });
  }
}