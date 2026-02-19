const { ContainerBuilder, ButtonBuilder, MessageFlags, ButtonStyle, inlineCode } = require('discord.js');
const { askForConfirmation } = require('../helpers/confirmations');
const { changeCharacterInDatabase } = require('../misc');
const { Players } = require('../dbObjects');

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
    await interaction.followUp({ content: 'There was an error updating your character to be notable. Please contact a storyteller for assistance.', flags: MessageFlags.Ephemeral });
    return;
  }

  /**
   * Notify the user of successful notability update
   */
  container.spliceComponents(0, container.components.length); // Clear container components

  container
    .addTextDisplayComponents((textDisplay) =>
      textDisplay.setContent(
        `# Notability Opt-In Confirmed\n` +
        `Your character, **${inlineCode(changedCharacter.name)}**, has been successfully updated to be notable. Your character is now mortal and has begun aging, and will be able to participate in the offspring system.\n` +
        `You can continue to manage your character using the Character Manager GUI above.`
      )
    );

  return interaction.editReply({ components: [container], flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] });
}

module.exports = {
  customId: 'character-notability-button',
  async execute(interaction) {
    // Defer the update to allow time to process
    await interaction.deferUpdate();

    // Ask for confirmation to opt in to notability
    return askForConfirmation(
      interaction,
      'Character Notability Opt-In',
      'By opting in to notability, your character will be made mortal and will begin aging. It will also be possible for your character to participate in the offspring system. It is not possible to later opt out of notability, so make sure that you want to proceed.\n\nYou are currently opting in to notability.',
      (interaction) => characterNotabilityConfirm(interaction)
    )
  }
}