const { ContainerBuilder, MessageFlags, inlineCode } = require('discord.js');
const { PlayableChildren } = require('../dbObjects.js');
const { assignCharacterToPlayer } = require('../misc.js');

module.exports = {
  customId: 'confirm-play-own-offspring',
  async execute(interaction) {
    // Defer the update to allow time to process
    await interaction.deferUpdate();

    /**
     * Notify the player of character assignment in progress
     */
    const container = new ContainerBuilder()
      .addTextDisplayComponents((textDisplay) =>
        textDisplay.setContent(
          `# Assigning Offspring Character...\n` +
          `The chosen offspring character is being assigned to you. This may take a few moments...`
        )
      );

    await interaction.editReply({ components: [container], flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] });


    /**
     * Get the selected offspring character and assign it to the player
     */
    // Get the selected offspring ID from the button customId
    const [, selectedOffspringId] = interaction.customId.split(':');
    // Find the playable child record for the selected offspring ID
    const playableChild = await PlayableChildren.findByPk(selectedOffspringId);
    const character = await playableChild.getCharacter();

    await assignCharacterToPlayer(character.id, interaction.user.id, interaction.user);

    /**
     * Notify the player of successful character assignment
     */
    container.spliceComponents(0, container.components.length); // Clear container components

    container
      .addTextDisplayComponents((textDisplay) =>
        textDisplay.setContent(
          `# Offspring Character Assigned\n` +
          `You are now playing as the offspring character **${inlineCode(character.name)}**. You can manage your character using the Character Manager GUI above.`
        )
      );

    return interaction.editReply({ components: [container], flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] });
  }
}