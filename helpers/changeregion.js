const { TextDisplayBuilder, MessageFlags, ContainerBuilder } = require("discord.js");
const { Characters, Regions } = require("../dbObjects");
const { changeCharacterInDatabase } = require("../misc");
const { askForConfirmation } = require("./confirmations");

async function changeRegionConfirm(interaction, character, regionId) {
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
    await interaction.followUp({ embeds: [embed], flags: MessageFlags.Ephemeral });
    return;
  }

  // Notify the user of successful region change
  container.spliceComponents(0, container.components.length);

  container
    .addTextDisplayComponents((textDisplay) =>
      textDisplay.setContent(
        `# Character Region Changed\n` +
        `The character has now successfully had their region changed.\n` +
        `You can continue to manage the character using the Character Manager GUI above.`
      )
    )

  return interaction.editReply({ components: [container], flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] });
}

async function changeRegion(interaction, cancelId) {
  // Get character id from customId, split by ":" and get second element
  const characterId = interaction.customId.split(':')[1];
  const character = await Characters.findByPk(characterId);

  // Get submitted values
  const regionId = interaction.fields.getStringSelectValues('character-change-region-select')[0];
  const region = await Regions.findByPk(regionId);

  // Check whether the character is already in the selected region
  if (character.regionId === regionId) {
    await interaction.followUp({ content: `The character **${character.name}** is already in the region of **${region.name}**. Please select a different region to change to.`, flags: MessageFlags.Ephemeral });
    return;
  }

  // Ask for confirmation of region change
  return askForConfirmation(
    interaction,
    [
      new TextDisplayBuilder().setContent(
        `# Change Character Region\n` +
        `You are about to change the region of the character **${character.name}** to **${region.name}**.`
      )
    ],
    cancelId,
    (interaction) => changeRegionConfirm(interaction, character, regionId)
  )
}

module.exports = {
  changeRegion
}