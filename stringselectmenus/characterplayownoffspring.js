const { ContainerBuilder, MessageFlags, ButtonBuilder, ButtonStyle, inlineCode, TextDisplayBuilder } = require('discord.js');
const { PlayableChildren } = require('../dbObjects.js');
const { askForConfirmation } = require('../helpers/confirmations.js');
const { assignCharacterToPlayer } = require('../misc.js');
const { showMessageThenReturnToContainer } = require('../helpers/messageSender.js');
const { getCharacterManagerContainer } = require('../helpers/containerCreator.js');
const { formatCharacterName } = require('../helpers/formatters.js');

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
      [
        new TextDisplayBuilder().setContent(
          `# Confirm Playing as Offspring Character\n` +
          `You are about to play as the offspring character ${formatCharacterName(character.name)}, with the following details:\n\n` +
          playableChildInfo
        )
      ],
      'character-manager-return-button',
      (interaction) => characterPlayOwnOffspringConfirm(interaction, character)
    )
  }
}

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
  const { success } = await assignCharacterToPlayer(character.id, interaction.user.id, interaction.user);
  if (!success) {
    const assignFailedContainer = new ContainerBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `# Character Assignment Failed\n` +
          `There was an error assigning the offspring character ${formatCharacterName(character.name)} to you. Please contact a storyteller for assistance.`
        )
      );

    return interaction.editReply({ components: [assignFailedContainer], flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] });
  }

  /**
   * Notify the player of successful character assignment
   */
  return showMessageThenReturnToContainer(
    interaction,
    `# Offspring Character Assigned\n` +
    `You are now playing as the offspring character ${formatCharacterName(character.name)}.`,
    10000,
    `Character Dashboard`,
    async () => getCharacterManagerContainer(interaction.user.id)
  )
}