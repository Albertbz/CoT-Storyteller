const { ContainerBuilder, MessageFlags, inlineCode, TextDisplayBuilder } = require('discord.js');
const { askForConfirmation } = require('../../helpers/confirmations');
const { changeCharacterInDatabase } = require('../../misc');
const { Players } = require('../../dbObjects');
const { showMessageThenReturnToContainer } = require('../../helpers/messageSender');
const { getCharacterManagerContainer } = require('../../helpers/containerCreator');
const { formatCharacterName } = require('../../helpers/formatters');

module.exports = {
  customId: 'character-notability-button',
  async execute(interaction) {
    // Defer the update to allow time to process
    await interaction.deferUpdate();

    // Ask for confirmation to opt in to notability
    return askForConfirmation(
      interaction,
      [
        new TextDisplayBuilder().setContent(
          `# Character Notability Opt-In\n` +
          `By opting in to notability, your character will be made mortal and will begin aging. It will also be possible for your character to participate in the offspring system. It is not possible to later opt out of notability, so make sure that you want to proceed.\n\nYou are currently opting in to notability.`
        )
      ],
      'character-manager-return-button',
      (interaction) => characterNotabilityConfirm(interaction)
    )
  }
}

async function characterNotabilityConfirm(interaction) {
  // Defer the update to allow time to process
  await interaction.deferUpdate();

  /**
     * Notify the user of notability change in progress
     */
  const container = new ContainerBuilder()
    .addTextDisplayComponents((textDisplay) =>
      textDisplay.setContent(
        `# Confirming Notability Opt-In...\n` +
        `Your character is being updated to be notable. This may take a few moments...`
      )
    );

  await interaction.editReply({ components: [container], flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] });

  /**
   * Update the character to be notable
   */
  const player = await Players.findByPk(interaction.user.id);
  const character = await player.getCharacter();
  const { character: changedCharacter, embed: _ } = await changeCharacterInDatabase(interaction.user, character, true, { newSocialClassName: 'Notable' });
  if (!changedCharacter) {
    const errorContainer = new ContainerBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `# Error Updating Character Notability\n` +
          `There was an error updating your character to be notable. Please contact a storyteller for assistance.`
        )
      )
    return interaction.editReply({ components: [errorContainer], flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] });
  }

  /**
   * Notify the user of successful notability update
   */
  return showMessageThenReturnToContainer(
    interaction,
    `# Notability Opt-In Confirmed\n` +
    `Your character, ${formatCharacterName(changedCharacter.name)}, has been successfully updated to be notable. Your character is now mortal and has begun aging, and will be able to participate in the offspring system.`,
    10000,
    'Character Dashboard',
    async () => getCharacterManagerContainer(changedCharacter)
  )
}