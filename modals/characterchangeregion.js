const { ContainerBuilder, MessageFlags } = require("discord.js");
const { Players, Regions, Characters } = require("../dbObjects");
const { askForConfirmation } = require("../helpers/confirmations");
const { changeCharacterInDatabase } = require("../misc");

module.exports = {
  customId: 'character-change-region-modal',
  async execute(interaction) {
    // Defer update to allow time for processing
    await interaction.deferUpdate();

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
      `Change Character Region`,
      `You are about to change the region of the character **${character.name}** to **${region.name}**.`,
      (interaction) => changeHouseConfirm(interaction, character, regionId)
    )
  }
}

async function changeHouseConfirm(interaction, character, regionId) {
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