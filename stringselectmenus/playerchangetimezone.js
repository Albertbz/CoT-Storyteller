const { ContainerBuilder, TextDisplayBuilder, MessageFlags } = require("discord.js");
const { Players } = require("../dbObjects");
const { askForConfirmation } = require("../helpers/confirmations");
const { changePlayerInDatabase } = require("../misc");
const { showMessageThenReturnToContainer } = require("../helpers/messageSender");
const { getPlayerManagerContainer } = require("../helpers/containerCreator");
const { getFullTimezoneString } = require("../helpers/formatters");

module.exports = {
  customId: 'player-change-timezone-select',
  async execute(interaction) {
    // Defer update to allow time to process
    await interaction.deferUpdate();

    const player = await Players.findByPk(interaction.user.id);

    const selectedTimezone = interaction.values[0];

    // Ensure the selected timezone is different from the player's current timezone
    if (selectedTimezone === player.timezone) {
      const sameTimezoneContainer = new ContainerBuilder().addComponents(
        new TextDisplayBuilder().setContent(
          `# No Changes Detected\n\n` +
          `Your current timezone is already set to **${getFullTimezoneString(player.timezone)}**. Please select a different timezone to update it.`
        )
      );
      return interaction.followUp({ components: [sameTimezoneContainer], flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] });
    }

    // Ask for confirmation
    return askForConfirmation(
      interaction,
      [
        new TextDisplayBuilder().setContent(
          `# Confirm Timezone Change\n\n` +
          `You are about to change your timezone from **${getFullTimezoneString(player.timezone)}** to **${getFullTimezoneString(selectedTimezone)}**.`
        )
      ],
      'player-manager-return-button',
      (interaction) => changeTimezoneConfirm(interaction, player, selectedTimezone),
    )
  }
}

async function changeTimezoneConfirm(interaction, player, selectedTimezone) {
  // Defer the update to allow time to process
  await interaction.deferUpdate();

  // Edit the message to say that the timezone is being updated
  const updatingContainer = new ContainerBuilder().addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      `# Changing Timezone\n\n` +
      `Your timezone is being updated to **${getFullTimezoneString(selectedTimezone)}**. This may take a moment...`
    )
  );
  await interaction.editReply({ components: [updatingContainer], flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] });

  // Update the player's timezone in the database
  const { player: updatePlayer } = await changePlayerInDatabase(interaction.user, player, { newTimezone: selectedTimezone });
  if (!updatePlayer) {
    const errorContainer = new ContainerBuilder().addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `# Error Updating Timezone\n\n` +
        `There was an error updating your timezone. Please try again later or contact a member of Staff.`
      )
    );
    return interaction.editReply({ components: [errorContainer], flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] });
  }

  // Edit the message to say that the timezone was updated
  return showMessageThenReturnToContainer(
    interaction,
    `# Timezone Updated\n\n` +
    `Your timezone has been updated to **${getFullTimezoneString(updatePlayer.timezone)}**!`,
    10000,
    `Player Dashboard`,
    async () => getPlayerManagerContainer(interaction.user.id)
  );
}

