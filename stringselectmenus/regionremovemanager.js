const { TextDisplayBuilder, ContainerBuilder, MessageFlags } = require("discord.js");
const { RegionManagers, Characters } = require("../dbObjects");
const { askForConfirmation } = require("../helpers/confirmations");
const { formatCharacterName } = require("../helpers/formatters");
const { removeRegionManagerFromDatabase } = require("../misc");
const { getRegionManagerContainer } = require("../helpers/containerCreator");
const { showMessageThenReturnToContainer } = require("../helpers/messageSender");

module.exports = {
  customId: 'region-remove-manager-select',
  async execute(interaction) {
    // Defer update to allow time to process
    await interaction.deferUpdate();

    // Get the region manager id from the select menu values
    const regionManagerId = interaction.values[0];
    const regionManager = await RegionManagers.findByPk(regionManagerId, {
      include: { model: Characters, as: 'character' }
    });

    // Ask for confirmation
    return askForConfirmation(
      interaction,
      [
        new TextDisplayBuilder().setContent(
          `# Remove Region Manager\n` +
          `You are removing ${formatCharacterName(regionManager.character.name)} as a region manager. This action will remove the character's access to all of the same region management buttons that you have, preventing them from helping manage the region. The player of the character will also be notified that their character has been removed as a region manager.`
        )
      ],
      'region-manager-return-button',
      (interaction) => removeManagerConfirm(interaction, regionManager)
    )
  }
}

async function removeManagerConfirm(interaction, regionManager) {
  // Defer the interaction update to allow time to process
  await interaction.deferUpdate();

  // Notify the user that the character is being removed as a manager
  const removingManagerContainer = new ContainerBuilder()
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `# Removing Region Manager\n` +
        `Removing ${formatCharacterName(regionManager.character.name)} as a region manager. Please wait...`
      )
    )
  await interaction.editReply({ components: [removingManagerContainer], flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] });

  // Remove the character as a region manager in the database
  const { success } = await removeRegionManagerFromDatabase(interaction.user, regionManager);
  if (!success) {
    const errorContainer = new ContainerBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `# Error Removing Region Manager\n` +
          `There was an error removing ${formatCharacterName(regionManager.character.name)} as a region manager. Please try again later. If the issue persists, please contact a member of Staff.`
        )
      )

    return interaction.editReply({ components: [errorContainer], flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] });
  }

  // Send a message to the player of the character notifying them that their character has been removed as a region manager
  const player = await regionManager.character.getPlayer();
  let user;
  try {
    user = await interaction.client.users.fetch(player.id);
    const regionManagerContainer = new ContainerBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `# Character Removed as Region Manager\n` +
          `Your character ${formatCharacterName(regionManager.character.name)} has been removed as a region manager. This means that you are no longer able to access the region management buttons for the region. If you believe this was a mistake, please contact your region's ruler.`
        )
      )
    await user.send({ components: [regionManagerContainer], flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] });

    // Show a confirmation message to the user and return them to the region manager container
    return showMessageThenReturnToContainer(
      interaction,
      `# Region Manager Removed\n` +
      `${formatCharacterName(regionManager.character.name)} has been removed as a region manager. The player of the character has been notified.`,
      10000,
      `Region Dashboard`,
      async () => getRegionManagerContainer(interaction.user.id)
    )
  } catch (error) {
    console.error(`Error fetching user with ID ${player.id} or sending them a message:`, error.message);
    return showMessageThenReturnToContainer(
      interaction,
      `# Region Manager Removed\n` +
      `${formatCharacterName(regionManager.character.name)} has been removed as a region manager. However, there was an error sending the notification to ${user}. Please contact ${user} to inform them that their character has been removed as a region manager.`,
      10000,
      `Region Dashboard`,
      async () => getRegionManagerContainer(interaction.user.id)
    )
  }
}