const { ContainerBuilder, MessageFlags, ButtonBuilder, ButtonStyle, inlineCode } = require('discord.js');
const { PlayableChildren } = require('../dbObjects.js');

module.exports = {
  customId: 'character-play-own-offspring-select',
  async execute(interaction) {
    // Defer the update to allow time to process
    await interaction.deferUpdate();

    /**
     * Get the selected offspring character and create confirmation message.
     */
    // Get the selected offspring ID from the select menu
    const selectedOffspringId = interaction.values[0];
    // Find the playable child record for the selected offspring ID
    const playableChild = await PlayableChildren.findByPk(selectedOffspringId);
    const character = await playableChild.getCharacter();

    /**
     * Create a confirmation message for playing the selected offspring character.
     * Add info about the character, and a button to confirm and a button to cancel.
     */
    const playableChildInfo = await playableChild.formattedInfo;
    const container = new ContainerBuilder()
      .addTextDisplayComponents((textDisplay) =>
        textDisplay.setContent(
          `# Confirm Playing as Offspring Character: **${inlineCode(character.name)}**\n` +
          `${playableChildInfo}`
        )
      )
      .addSeparatorComponents((separator) => separator)
      .addTextDisplayComponents((textDisplay) =>
        textDisplay.setContent(
          `Please confirm that you wish to play as this character by clicking the **Confirm** button below.`
        )
      )
      .addActionRowComponents((actionRow) =>
        actionRow.setComponents(
          new ButtonBuilder()
            .setCustomId(`confirm-play-own-offspring:${playableChild.id}`)
            .setLabel('Confirm')
            .setStyle(ButtonStyle.Success),
          new ButtonBuilder()
            .setCustomId('character-manager-return-button')
            .setLabel('Cancel')
            .setStyle(ButtonStyle.Danger)
        )
      );

    return interaction.editReply({ components: [container], flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] });
  }
}