const { TextDisplayBuilder, ContainerBuilder, MessageFlags } = require("discord.js");
const { Characters } = require("../dbObjects");
const { askForConfirmation } = require("../helpers/confirmations");
const { formatCharacterName } = require("../helpers/formatters");
const { addRegionManagerToDatabase } = require("../misc");
const { showMessageThenReturnToContainer } = require("../helpers/messageSender");
const { getRegionManagerContainer } = require("../helpers/containerCreator");

module.exports = {
  customId: 'region-add-manager-select',
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
          `# Add Region Manager\n` +
          `You are adding ${formatCharacterName(character.name)} as a region manager. This action will give the character access to all of the same region management buttons that you have, allowing them to help manage the region. The player of the character will also be notified that their character has been made a region manager.`
        )
      ],
      'region-manager-return-button',
      (interaction) => addManagerConfirm(interaction, character)
    )
  }
}

async function addManagerConfirm(interaction, character) {
  // Defer the interaction update to allow time to process
  await interaction.deferUpdate();

  // Notify the user that the character is being made a manager
  const makingManagerContainer = new ContainerBuilder()
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `# Adding Region Manager\n` +
        `Adding ${formatCharacterName(character.name)} as a region manager. Please wait...`
      )
    )
  await interaction.editReply({ components: [makingManagerContainer], flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] });

  // Add the character as a region manager in the database
  const { regionManager } = await addRegionManagerToDatabase(interaction.user, { characterId: character.id, regionId: character.regionId });
  if (!regionManager) {
    const errorContainer = new ContainerBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `# Error Adding Region Manager\n` +
          `There was an error adding ${formatCharacterName(character.name)} as a region manager. Please try again later. If the issue persists, please contact a member of Staff.`
        )
      )

    return interaction.editReply({ components: [errorContainer], flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] });
  }

  // Send a message to the player of the character notifying them that their character has been made a region manager
  const player = await character.getPlayer();
  let user;
  try {
    user = await interaction.client.users.fetch(player.id);
    const regionManagerContainer = new ContainerBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `# Character Made Region Manager\n` +
          `Your character **${formatCharacterName(character.name)}** has been made a region manager in their current region. As a region manager, your character has access to various buttons in the Region Dashboard that allow them to help manage the region. Be sure to check out it out to see all of the options available to you as a region manager!`
        )
      );

    await user.send({ components: [regionManagerContainer], flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] });

    return showMessageThenReturnToContainer(
      interaction,
      `# Region Manager Added\n` +
      `${formatCharacterName(character.name)} has been added as a region manager. The player of the character has been notified.`,
      10000,
      `Region Dashboard`,
      async () => getRegionManagerContainer(interaction.user.id)
    )
  }
  catch (error) {
    console.error(`Error sending region manager notification to user ${player.id}:`, error.message);

    return showMessageThenReturnToContainer(
      interaction,
      `# Region Manager Added\n` +
      `${formatCharacterName(character.name)} has been added as a region manager. However, there was an error sending the notification to ${user}. Please contact ${user} to inform them that their character has been made a region manager.`,
      10000,
      `Region Dashboard`,
      async () => getRegionManagerContainer(interaction.user.id)
    )
  }
}