const { MessageFlags, ContainerBuilder, inlineCode, TextDisplayBuilder } = require('discord.js');
const { addCharacterToDatabase, assignCharacterToPlayer } = require('../misc.js');
const { askForConfirmation } = require('../helpers/confirmations.js');
const { Regions, Characters } = require('../dbObjects.js');
const { characterCreateModal } = require('../helpers/modalCreator.js');
const { where } = require('sequelize');
const { showMessageThenReturnToContainer } = require('../helpers/messageSender.js');
const { getCharacterManagerContainer } = require('../helpers/containerCreator.js');
const { formatCharacterName } = require('../helpers/formatters.js');

module.exports = {
  customId: 'character-create-modal',
  async execute(interaction) {
    // Defer reply to allow time to process
    await interaction.deferUpdate();

    // Extract character creation data from the modal submission
    const characterName = interaction.fields.getTextInputValue('character-name-input');
    const regionId = interaction.fields.getStringSelectValues('character-region-select')[0];
    const notabilityChoice = interaction.fields.getStringSelectValues('character-notability-select')[0];

    // Check whether a character with this name already exists
    const existingCharacter = await Characters.findOne({ where: { name: characterName } });
    if (existingCharacter) {
      const nameTakenContainer = new ContainerBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `# Name Already Taken\n` +
            `A character with the name **${characterName}** already exists.\n` +
            `Please choose a different name, add a surname, or change the current surname.`
          )
        )
      return interaction.followUp({ components: [nameTakenContainer], flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] });
    }

    const region = await Regions.findByPk(regionId);

    // Ask the user to confirm the character creation details before proceeding
    return askForConfirmation(
      interaction,
      [
        new TextDisplayBuilder().setContent(
          `# Review Character Creation\n` +
          `Please review the character creation information below and confirm that everything is correct.\n\n` +
          `**Name:** ${characterName}\n` +
          `**Region:** ${region ? region.name : 'Unknown'}\n` +
          `**Social Class:** ${notabilityChoice === 'yes' ? 'Notable' : 'Commoner'}`
        )
      ],
      'character-manager-return-button',
      (interaction) => characterCreateConfirm(interaction, characterName, regionId, notabilityChoice),
      (interaction) => characterCreateEdit(interaction, characterName, regionId, notabilityChoice)
    )
  }
}

async function characterCreateConfirm(interaction, characterName, regionId, notabilityChoice) {
  // Defer reply to allow time to process
  await interaction.deferUpdate();

  /**
   * Notify the user of character creation in progress
   */
  const container = new ContainerBuilder()
    .addTextDisplayComponents((textDisplay) =>
      textDisplay.setContent(
        `# Creating Character...\n` +
        `Your character is being created. This may take a few moments...`
      )
    );

  await interaction.editReply({ components: [container], flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] });

  /**
   * Create the character in the database and assign to the player
   */
  const { character } = await addCharacterToDatabase(interaction.user, { name: characterName, regionId: regionId, socialClassName: notabilityChoice === 'yes' ? 'Notable' : 'Commoner' });
  if (!character) {
    const errorContainer = new ContainerBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `# Error Creating Character\n` +
          `There was an error creating your character. Please contact a storyteller for assistance.`
        )
      )
    return interaction.editReply({ components: [errorContainer], flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] });
  }
  const { success } = await assignCharacterToPlayer(character.id, interaction.user.id, interaction.user);
  if (!success) {
    const errorContainer = new ContainerBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `# Error Assigning Character\n` +
          `Your character was created but there was an error assigning it to you. Please contact a storyteller for assistance.`
        )
      )
    return interaction.editReply({ components: [errorContainer], flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] });
  }

  /**
   * Notify the user of successful character creation
   */
  return showMessageThenReturnToContainer(
    interaction,
    `# Character Created\n` +
    `Your character, ${formatCharacterName(character.name)}, has been successfully created and assigned to you.`,
    10000,
    'Character Dashboard',
    async () => getCharacterManagerContainer(interaction.user.id)
  )
}

async function characterCreateEdit(interaction, characterName, regionId, notabilityChoice) {
  // Show the character creation modal again with pre-filled values for editing
  const modal = await characterCreateModal({ characterName, regionId, notabilityChoice });
  return interaction.showModal(modal);
}