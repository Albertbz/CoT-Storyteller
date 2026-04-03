const { MessageFlags, ContainerBuilder, inlineCode, TextDisplayBuilder } = require('discord.js');
const { changeCharacterInDatabase } = require('../misc.js');
const { Players } = require('../dbObjects');
const { askForConfirmation } = require('../helpers/confirmations.js');
const { characterSurnameModal } = require('../helpers/modalCreator.js');
const { showMessageThenReturnToContainer } = require('../helpers/messageSender.js');
const { formatCharacterName } = require('../helpers/formatters.js');
const { getCharacterManagerContainer } = require('../helpers/containerCreator.js');

module.exports = {
  customId: 'character-change-surname-modal',
  async execute(interaction) {
    // Defer reply to allow time to process
    await interaction.deferUpdate();

    // Extract new surname from the modal input
    const newSurname = interaction.fields.getTextInputValue('character-surname-input');

    // Get the player's character to check the current name and ensure the new name is different
    const player = await Players.findByPk(interaction.user.id);
    const character = await player.getCharacter();

    const firstNameSeparator = character.name.indexOf(' ');
    const firstName = firstNameSeparator !== -1 ? character.name.substring(0, firstNameSeparator) : character.name;
    const newName = `${firstName} ${newSurname}`;

    if (character.name === newName) {
      const sameNameContainer = new ContainerBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `# No Changes Detected\n` +
            `The surname **${newSurname}** results in the same full name as your current name.\n` +
            `Please enter a different surname to change it.`
          )
        )
      return interaction.followUp({ components: [sameNameContainer], flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] });
    }

    const existingCharacterWithName = await character.constructor.findOne({ where: { name: newName } });
    if (existingCharacterWithName) {
      const nameTakenContainer = new ContainerBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `# Name Already Taken\n` +
            `The new name, **${newName}**, that would be created with the surname you entered is already taken by another character.\n` +
            `Please enter a different surname to change it.`
          )
        )
      return interaction.followUp({ components: [nameTakenContainer], flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] });
    }

    // Ask for confirmation of surname change
    return askForConfirmation(
      interaction,
      [
        new TextDisplayBuilder().setContent(
          `# Change Character Surname\n` +
          `You are currently changing the surname of your character to **${newSurname}**. This will change your character's name to ${formatCharacterName(newName)}.`
        )
      ],
      'character-manager-return-button',
      (interaction) => characterChangeSurnameConfirm(interaction, newName),
      (interaction) => characterChangeSurnameEdit(interaction, newSurname)
    );
  }
}

async function characterChangeSurnameConfirm(interaction, newName) {
  // Defer reply to allow time to process
  await interaction.deferUpdate();

  /**
    * Notify the user of surname update in progress
    */
  const container = new ContainerBuilder()
    .addTextDisplayComponents((textDisplay) =>
      textDisplay.setContent(
        `# Changing Character Surname\n` +
        `The surname of your character is being changed. This may take a few moments...`
      )
    );

  await interaction.editReply({ components: [container], flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] });

  /**
   * Get the character from the database and update the name with the new
   * surname
   */
  const player = await Players.findByPk(interaction.user.id);
  const character = await player.getCharacter();

  const { character: updatedCharacter, _ } = await changeCharacterInDatabase(interaction.user, character, true, { newName: newName });
  if (!updatedCharacter) {
    const errorContainer = new ContainerBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `# Error Changing Character Surname\n` +
          `There was an error changing the character's surname. Please contact a storyteller for assistance.`
        )
      )
    return interaction.editReply({ components: [errorContainer], flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] });
  }

  /**
   * Notify the user of successful surname change
   */
  return showMessageThenReturnToContainer(
    interaction,
    `# Character Surname Changed\n` +
    `Your character has now successfully had their name changed to ${formatCharacterName(newName)}.`,
    10000,
    'Character Dashboard',
    async () => getCharacterManagerContainer(interaction.user.id)
  )
}

async function characterChangeSurnameEdit(interaction, newSurname) {
  // Show the character surname modal again with pre-filled values for editing
  const player = await Players.findByPk(interaction.user.id);
  const character = await player.getCharacter();

  const modal = await characterSurnameModal(character, { surnameValue: newSurname });
  return interaction.showModal(modal);
}