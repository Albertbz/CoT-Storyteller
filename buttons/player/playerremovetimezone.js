const { TextDisplayBuilder, MessageFlags, ContainerBuilder } = require("discord.js");
const { Players } = require("../../dbObjects");
const { askForConfirmation } = require("../../helpers/confirmations");
const { getFullTimezoneString } = require("../../helpers/formatters");
const { changePlayerInDatabase } = require("../../misc");
const { showMessageThenReturnToContainer } = require("../../helpers/messageSender");
const { getPlayerManagerContainer } = require("../../helpers/containerCreator");

module.exports = {
  customId: 'player-remove-timezone-button',
  async execute(interaction) {
    // Defer the update to allow time to process
    await interaction.deferUpdate();

    const player = await Players.findByPk(interaction.user.id);

    // Ask for confirmation
    return askForConfirmation(
      interaction,
      [
        new TextDisplayBuilder().setContent(
          `# Confirm Timezone Removal\n\n` +
          `You are about to remove your timezone, **${getFullTimezoneString(player.timezone)}**. If you want to change your timezone instead of removing it, please pick a region and choose the appropriate timezone for that region instead.`
        )
      ],
      'player-manager-return-button',
      (interaction) => removeTimezoneConfirm(interaction, player),
    )
  }
}

async function removeTimezoneConfirm(interaction, player) {
  // Defer the update to allow time to process
  await interaction.deferUpdate();

  // Edit the message to say that the timezone is being removed
  const removingContainer = new ContainerBuilder().addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      `# Removing Timezone\n\n` +
      `Your timezone, **${getFullTimezoneString(player.timezone)}**, is being removed. This may take a moment...`
    )
  );
  await interaction.editReply({ components: [removingContainer], flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] });

  const oldTimezone = player.timezone;

  // Update the player's timezone in the database to `-`, which is the value that represents no timezone
  const { player: updatedPlayer } = await changePlayerInDatabase(interaction.user, player, { newTimezone: '-' });
  if (!updatedPlayer) {
    const errorContainer = new ContainerBuilder().addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `# Error Removing Timezone\n\n` +
        `An error occurred while trying to remove your timezone. Please try again later.`
      )
    );
    return interaction.editReply({ components: [errorContainer], flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] });
  }

  // Edit the message to say that the timezone has been removed
  return showMessageThenReturnToContainer(
    interaction,
    `# Timezone Removed\n\n` +
    `Your timezone, **${getFullTimezoneString(oldTimezone)}**, has been removed!`,
    10000,
    `Player Dashboard`,
    async () => getPlayerManagerContainer(interaction.user.id)
  )
}