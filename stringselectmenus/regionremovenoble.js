const { TextDisplayBuilder, ContainerBuilder, MessageFlags } = require("discord.js");
const { Characters } = require("../dbObjects");
const { askForConfirmation } = require("../helpers/confirmations");
const { formatCharacterName } = require("../helpers/formatters");
const { changeCharacterInDatabase } = require("../misc");
const { showMessageThenReturnToContainer } = require("../helpers/messageSender");
const { getRegionManagerContainer } = require("../helpers/containerCreator");

module.exports = {
  customId: 'region-remove-noble-select',
  async execute(interaction) {
    // Defer update to allow time to process
    await interaction.deferUpdate();

    // Get the characterId from the select menu values
    const characterId = interaction.values[0];
    const character = await Characters.findByPk(characterId);

    // Ask for confirmation
    return askForConfirmation(
      interaction,
      [
        new TextDisplayBuilder().setContent(
          `# Remove Nobility\n` +
          `You are removing nobility from ${formatCharacterName(character.name)}. This action will remove the character's noble status. The player of the character will also be notified that their character is no longer a noble.`
        )
      ],
      'region-manager-return-button',
      async (interaction) => removeNobleConfirm(interaction, character)
    )
  }
}

async function removeNobleConfirm(interaction, character) {
  // Defer the interaction update to allow time to process
  await interaction.deferUpdate();

  // Notify the user that the character is being removed as a noble
  const removingNobleContainer = new ContainerBuilder()
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `# Removing Nobility\n` +
        `Removing nobility from ${formatCharacterName(character.name)}. Please wait...`
      )
    )
  await interaction.editReply({ components: [removingNobleContainer], flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] });

  // Update the character's social class to Notable in the database
  const { character: updatedCharacter } = await changeCharacterInDatabase(interaction.user, character, true, { newSocialClassName: 'Notable' });
  if (!updatedCharacter) {
    const errorContainer = new ContainerBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `# Error Removing Nobility\n` +
          `There was an error removing nobility from ${formatCharacterName(character.name)}. Please try again later. If the issue persists, please contact a member of Staff.`
        )
      )

    return interaction.editReply({ components: [errorContainer], flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] });
  }

  // Send a notification to the player that their character has been made a notable
  const player = await updatedCharacter.getPlayer();
  const user = await interaction.client.users.fetch(player.id);
  const region = await updatedCharacter.getRegion();
  try {
    const nobilityRemovedContainer = new ContainerBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `# Character Nobility Removed\n` +
          `Your character ${formatCharacterName(character.name)} has had their nobility removed. If you have any questions about why this is, please contact the ruler of **${region.name}**.`
        )
      )

    await user.send({ components: [nobilityRemovedContainer], flags: [MessageFlags.IsComponentsV2] });

    // Inform the user that the character has had their nobility removed and the player has been notified
    return showMessageThenReturnToContainer(
      interaction,
      `# Nobility Removed\n` +
      `${formatCharacterName(character.name)} has had their nobility removed and the player has been notified.`,
      10000,
      `Region Dashboard`,
      async () => getRegionManagerContainer(interaction.user.id)
    )
  }
  catch (error) {
    console.error(`Error sending DM to user ${user.id} about character having nobility removed:`, error.message);
    // If there was an error sending the DM (e.g. user has DMs closed), log the error but do not fail the entire operation
    return showMessageThenReturnToContainer(
      interaction,
      `# Nobility Removed\n` +
      `${formatCharacterName(character.name)} has had their nobility removed. However, there was an error sending a notification to ${user}. Please inform them of this change manually.`,
      10000,
      `Region Dashboard`,
      async () => getRegionManagerContainer(interaction.user.id)
    )
  }

}