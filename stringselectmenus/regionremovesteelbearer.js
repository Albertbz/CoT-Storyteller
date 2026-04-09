const { TextDisplayBuilder, ContainerBuilder, MessageFlags } = require("discord.js");
const { Steelbearers, Characters } = require("../dbObjects");
const { askForConfirmation } = require("../helpers/confirmations");
const { formatCharacterName } = require("../helpers/formatters");
const { removeSteelbearerFromDatabase } = require("../misc");
const { showMessageThenReturnToContainer } = require("../helpers/messageSender");
const { getRegionManagerContainer } = require("../helpers/containerCreator");

module.exports = {
  customId: 'region-remove-steelbearer-select',
  async execute(interaction) {
    await interaction.deferUpdate();

    // Get the steelbearerId from the select menu values
    const steelbearerId = interaction.values[0];
    const steelbearer = await Steelbearers.findByPk(steelbearerId, {
      include: { model: Characters, as: 'character', required: true }
    });
    const character = steelbearer.character;
    const region = await character.getRegion();

    // Ask for confirmation
    return askForConfirmation(
      interaction,
      [
        new TextDisplayBuilder().setContent(
          `# Confirm Steelbearer Removal\n` +
          `You are currently removing ${formatCharacterName(character.name)} as a steelbearer in **${region.name}**. This will notify the player of the character that they have been removed as a steelbearer.`
        )
      ],
      'region-manager-return-button',
      (interaction) => removeSteelbearerConfirm(interaction, steelbearer)
    )
  }
}

async function removeSteelbearerConfirm(interaction, steelbearer) {
  // Defer update to allow time to process
  await interaction.deferUpdate();

  // Edit the message to say that the steelbearer is being removed and the
  // player is being notified
  const character = await steelbearer.getCharacter();
  const region = await character.getRegion();

  const removingSteelbearerContainer = new ContainerBuilder()
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `# Removing Steelbearer\n` +
        `Removing ${formatCharacterName(character.name)} as a steelbearer in **${region.name}** and notifying the player. Please wait...`
      )
    )

  await interaction.editReply({ components: [removingSteelbearerContainer], flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] });

  // Remove the steelbearer
  const { success } = await removeSteelbearerFromDatabase(interaction.user, steelbearer);
  if (!success) {
    const errorContainer = new ContainerBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `# Error Removing Steelbearer\n` +
          `There was an error removing ${formatCharacterName(character.name)} as a steelbearer. Please try again later or contact a member of Staff.`
        )
      )
    return interaction.editReply({ components: [errorContainer], flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] });
  }

  // Notify the player of the character that they have been removed as a steelbearer
  const player = await character.getPlayer();
  const user = await interaction.client.users.fetch(player.id);
  try {
    const removedSteelbearerContainer = new ContainerBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `# Steelbearer Status Removed\n` +
          `Your character ${formatCharacterName(character.name)} have been removed as a steelbearer in **${region.name}**. If you have any questions about this, please contact the ruler of your region.`
        )
      )
    await user.send({ components: [removedSteelbearerContainer], flags: [MessageFlags.IsComponentsV2] });

    // Edit the original message to say that the steelbearer has been removed and the player has been notified
    return showMessageThenReturnToContainer(
      interaction,
      `# Steelbearer Removed\n` +
      `${formatCharacterName(character.name)} has been removed as a steelbearer in **${region.name}** and the player has been notified.`,
      10000,
      'Region Dashboard',
      async () => getRegionManagerContainer(interaction.user.id)
    )
  }
  catch (error) {
    console.log(`Error sending message to user with id ${player.id} when removing steelbearer:`, error.message);
    return showMessageThenReturnToContainer(
      interaction,
      `# Steelbearer Removed\n` +
      `${formatCharacterName(character.name)} has been removed as a steelbearer in **${region.name}**, but there was an issue notifying ${user}. Please contact them to inform them of the change.`,
      15000,
      'Region Dashboard',
      async () => getRegionManagerContainer(interaction.user.id)
    );
  }
}