const { TextDisplayBuilder, MessageFlags, ContainerBuilder } = require("discord.js");
const { Characters, Regions, Players } = require("../dbObjects");
const { changeCharacterInDatabase } = require("../misc");
const { askForConfirmation } = require("./confirmations");
const { showMessageThenReturnToContainer } = require("./messageSender");
const { getCharacterManagerContainer, getOffspringManagerContainer } = require("./containerCreator");
const { formatCharacterName } = require("./formatters");

async function changeRegionConfirm(interaction, character, regionId, managerType) {
  // Defer update to allow time for processing
  await interaction.deferUpdate();

  // Notify the user of processing the region change
  const container = new ContainerBuilder()
    .addTextDisplayComponents((textDisplay) =>
      textDisplay.setContent(
        `# Changing Character Region\n` +
        `Please wait while the character's region is being changed...`
      )
    )

  await interaction.editReply({ components: [container], flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] });

  // Update the character's region in the database
  const { character: updatedCharacter, embed } = await changeCharacterInDatabase(interaction.user, character, true, { newRegionId: regionId });
  if (!updatedCharacter) {
    const errorContainer = new ContainerBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `# Error Changing Character Region\n` +
          `There was an error changing the character's region. Please contact a storyteller for assistance.`
        )
      )
    return interaction.editReply({ components: [errorContainer], flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] });
  }

  // Notify the user of successful region change
  let returnTo;
  let containerFunction;
  if (managerType === 'character') {
    returnTo = 'Character Dashboard';
    containerFunction = async () => getCharacterManagerContainer(updatedCharacter);
  }
  else if (managerType === 'offspring') {
    returnTo = 'Offspring Dashboard';
    const player = await Players.findByPk(interaction.user.id);
    containerFunction = async () => getOffspringManagerContainer(player);
  }
  return showMessageThenReturnToContainer(
    interaction,
    `# Character Region Changed\n` +
    `The character has now successfully had their region changed.`,
    10000,
    returnTo,
    containerFunction
  )
}

async function changeRegion(interaction, managerType) {
  let cancelId;
  if (managerType === 'character') {
    cancelId = 'character-manager-return-button';
  }
  else if (managerType === 'offspring') {
    cancelId = 'offspring-manager-return-button';
  }

  // Get character id from customId, split by ":" and get second element
  const characterId = interaction.customId.split(':')[1];
  const character = await Characters.findByPk(characterId);

  // Get submitted values
  const regionId = interaction.fields.getStringSelectValues('character-change-region-select')[0];
  const region = await Regions.findByPk(regionId);

  // Check whether the character is already in the selected region
  if (character.regionId === regionId) {
    const inRegionContainer = new ContainerBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `# Character Already in Region\n` +
          `The character ${formatCharacterName(character.name)} is already part of the region **${region.name}**.\n` +
          `Please select a different region to change to.`
        )
      )
    return interaction.followUp({ components: [inRegionContainer], flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] });
  }

  // Ask for confirmation of region change
  return askForConfirmation(
    interaction,
    [
      new TextDisplayBuilder().setContent(
        `# Change Character Region\n` +
        `You are about to change the region of the character ${formatCharacterName(character.name)} to **${region.name}**.`
      )
    ],
    cancelId,
    (interaction) => changeRegionConfirm(interaction, character, regionId, managerType)
  )
}

module.exports = {
  changeRegion
}