const { ContainerBuilder, MessageFlags, ButtonBuilder, ButtonStyle, inlineCode } = require('discord.js');
const { PlayableChildren } = require('../dbObjects.js');
const { askForConfirmation } = require('../helpers/confirmations.js');
const { assignCharacterToPlayer } = require('../misc.js');

async function characterPlayOwnOffspringConfirm(interaction, character) {
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
   * Assign the character to the player
   */
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
    const playableChildInfo = await playableChild.formattedInfo;

    // Ask for confirmation to play as the selected offspring character, showing character info in the confirmation message
    return askForConfirmation(
      interaction,
      `Confirm Playing as Offspring Character: ${inlineCode(character.name)}`,
      `You are about to play as the offspring character **${inlineCode(character.name)}**, with the following details:\n\n` +
      playableChildInfo,
      (interaction) => characterPlayOwnOffspringConfirm(interaction, character)
    )
  }
}