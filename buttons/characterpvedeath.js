const { ContainerBuilder, MessageFlags, inlineCode } = require('discord.js');
const { changeCharacterInDatabase } = require('../misc.js');
const { Players, Characters } = require('../dbObjects.js');
const { askForConfirmation } = require('../helpers/confirmations.js');

async function characterPveDeathConfirm(interaction) {
  // Defer the update to allow time to process
  await interaction.deferUpdate();

  /**
   * Notify the user of death change in progress
   */
  const container = new ContainerBuilder()
    .addTextDisplayComponents((textDisplay) =>
      textDisplay.setContent(
        `# Adding PvE death to character...\n` +
        `Your character is being updated. This may take a few moments...`
      )
    );

  await interaction.editReply({ components: [container], flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] });

  /**
   * Update the character PvE death count in DB
   */
  const player = await Players.findByPk(interaction.user.id);
  const character = await player.getCharacter();
  const addedpvedeath = character.pveDeaths + 1
  const { character: changedCharacter, embed: _ } = await changeCharacterInDatabase(interaction.user, character, true, { newPveDeaths: addedpvedeath });
  if (!changedCharacter) {
    await interaction.followUp({ content: 'There was an error registering your character PvE death. Please contact a storyteller for assistance.', flags: MessageFlags.Ephemeral });
    return;
  }

  /**
   * Notify the user of successful notability update
   */
  container.spliceComponents(0, container.components.length); // Clear container components

  container
    .addTextDisplayComponents((textDisplay) =>
      textDisplay.setContent(
        `# PvE death added Successfully!\n` +
        `Your character, **${inlineCode(character.name)}**, has now spent ${inlineCode(addedpvedeath)} PvE ${addedpvedeath === 1 ? 'life' : 'lives'}.\n` +
        `You can continue to manage your character using the Character Manager GUI above.`
      )
    );

  return interaction.editReply({ components: [container], flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] });
}

module.exports = {
  customId: 'character-pve-death-button',
  async execute(interaction) {
    // Defer the update to allow time to process
    await interaction.deferUpdate();

    // Ask for confirmation
    return askForConfirmation(
      interaction,
      'Confirm Adding PvE Death',
      'You are currently adding a PvE death to your character. This will increase your character\'s PvE death count by 1. You cannot undo this action.',
      (interaction) => characterPveDeathConfirm(interaction)
    )
  }
}