const { MessageFlags, ContainerBuilder, inlineCode } = require('discord.js');
const { addCharacterToDatabase, assignCharacterToPlayer } = require('../misc.js');
const { askForConfirmation } = require('../helpers/confirmations.js');
const { Regions } = require('../dbObjects.js');
const { characterCreateModal } = require('../helpers/modalCreator.js');


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
  const { character, embed: _ } = await addCharacterToDatabase(interaction.user, { name: characterName, regionId: regionId, socialClassName: notabilityChoice === 'yes' ? 'Notable' : 'Commoner' });
  if (!character) {
    await interaction.followUp({ content: 'There was an error creating your character. Please contact a storyteller for assistance.', flags: MessageFlags.Ephemeral });
    return;
  }
  await assignCharacterToPlayer(character.id, interaction.user.id, interaction.user);

  /**
   * Notify the user of successful character creation
   */
  container.spliceComponents(0, container.components.length); // Clear container components

  container
    .addTextDisplayComponents((textDisplay) =>
      textDisplay.setContent(
        `# Character Created\n` +
        `Your character, **${inlineCode(character.name)}**, has been successfully created and assigned to you.\n` +
        `You can manage your character using the Character Manager GUI above.`
      )
    );

  return interaction.editReply({ components: [container], flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] });
}

async function characterCreateEdit(interaction, characterName, regionId, notabilityChoice) {
  // Show the character creation modal again with pre-filled values for editing
  const modal = await characterCreateModal({ characterName, regionId, notabilityChoice });
  return interaction.showModal(modal);
}

module.exports = {
  customId: 'character-create-modal',
  async execute(interaction) {
    // Defer reply to allow time to process
    await interaction.deferUpdate();

    // Extract character creation data from the modal submission
    const characterName = interaction.fields.getTextInputValue('character-name-input');
    const regionId = interaction.fields.getStringSelectValues('character-region-select')[0];
    const notabilityChoice = interaction.fields.getStringSelectValues('character-notability-select')[0];

    const region = await Regions.findByPk(regionId);

    // Ask the user to confirm the character creation details before proceeding
    return askForConfirmation(
      interaction,
      `Review Character Creation`,
      `Please review the character creation information below and confirm that everything is correct.\n\n` +
      `**Name:** ${characterName}\n` +
      `**Region:** ${region ? region.name : 'Unknown'}\n` +
      `**Social Class:** ${notabilityChoice === 'yes' ? 'Notable' : 'Commoner'}`,
      (interaction) => characterCreateConfirm(interaction, characterName, regionId, notabilityChoice),
      (interaction) => characterCreateEdit(interaction, characterName, regionId, notabilityChoice)
    )
  }
}