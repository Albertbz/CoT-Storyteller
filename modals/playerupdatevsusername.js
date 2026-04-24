const { TextDisplayBuilder, ContainerBuilder, MessageFlags } = require("discord.js");
const { Players } = require("../dbObjects");
const { askForConfirmation } = require("../helpers/confirmations");
const { updateVSUsernameModal } = require("../helpers/modalCreator");
const { changePlayerInDatabase } = require("../misc");
const { showMessageThenReturnToContainer } = require("../helpers/messageSender");
const { getPlayerManagerContainer } = require("../helpers/containerCreator");

module.exports = {
  customId: 'player-update-vs-username-modal',
  async execute(interaction) {
    // Defer update to allow time to process
    await interaction.deferUpdate();

    // Get the player
    const player = await Players.findByPk(interaction.user.id);

    // Get the new VS username from the modal input
    const newVSUsername = interaction.fields.getTextInputValue('vs-username-input');

    // Ensure that it is different from the current one
    if (newVSUsername === player.ign) {
      const sameUsernameContainer = new ContainerBuilder().addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `# No Changes Detected\n\n` +
          `Your current VS username is already **${player.ign}**. Please enter a different username to update it.`
        )
      );
      return interaction.followUp({ components: [sameUsernameContainer], flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] });
    }

    // Ask for confirmation
    return askForConfirmation(
      interaction,
      [
        new TextDisplayBuilder().setContent(
          `# Confirm VS Username Update\n\n` +
          `You are about to update your VS username from **${player.ign}** to **${newVSUsername}**. You should only do this if you have changed your username on the VS website.`
        )
      ],
      'player-manager-return-button',
      (interaction) => updateVSUsernameConfirm(interaction, player, newVSUsername),
      (interaction) => updateVSUsernameEdit(interaction, player, newVSUsername)
    )
  }
}

async function updateVSUsernameConfirm(interaction, player, newVSUsername) {
  // Defer the update to allow time to process
  await interaction.deferUpdate();

  // Update the message to say that the username is being updated
  const updatingContainer = new ContainerBuilder().addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      `# Updating VS Username\n\n` +
      `Your VS username is being updated to **${newVSUsername}**. This may take a moment...`
    )
  );
  await interaction.editReply({ components: [updatingContainer], flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] });

  // Update the player's VS username in the database
  const { player: updatedPlayer } = await changePlayerInDatabase(interaction.user, player, { newIgn: newVSUsername });
  if (!updatedPlayer) {
    const errorContainer = new ContainerBuilder().addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `# VS Username Update Failed\n\n` +
        `There was an error updating your VS username. Please try again later or contact a member of Staff.`
      )
    );
    return interaction.editReply({ components: [errorContainer], flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] });
  }

  // Show a success message
  return showMessageThenReturnToContainer(
    interaction,
    `# VS Username Updated\n\n` +
    `Your VS username has been updated to **${updatedPlayer.ign}**!`,
    10000,
    `Player Dashboard`,
    async () => getPlayerManagerContainer(interaction.user.id)
  )
}

async function updateVSUsernameEdit(interaction, player, newVSUsername) {
  // Show the edit modal again with the new username pre-filled
  const modal = await updateVSUsernameModal(player, newVSUsername);

  return interaction.showModal(modal);
}