const { ContainerBuilder, TextDisplayBuilder, MessageFlags } = require("discord.js");
const { Players } = require("../dbObjects");
const { askForConfirmation } = require("../helpers/confirmations");
const { changePlayerInDatabase } = require("../misc");
const { showMessageThenReturnToContainer } = require("../helpers/messageSender");
const { getPlayerManagerContainer } = require("../helpers/containerCreator");
const { changeGamertagModal } = require("../helpers/modalCreator");

module.exports = {
  customId: 'player-change-gamertag-modal',
  async execute(interaction) {
    // Defer update to allow time to process
    await interaction.deferUpdate();

    // Get the player
    const player = await Players.findByPk(interaction.user.id);

    // Get the new gamertag from the modal input
    const newGamertag = interaction.fields.getTextInputValue('gamertag-input');
    // If one was not provided, set it to '-' to indicate that it should be set to null in the database
    const gamertagToSet = newGamertag.trim() === '' ? '-' : newGamertag.trim();

    const oldGamertagDisplay = player.gamertag ? `**${player.gamertag}**` : 'not set';
    const newGamertagDisplay = gamertagToSet === '-' ? 'not set' : `**${gamertagToSet}**`;

    // Ensure that it is different from the current one (treat null and '-' as the same)
    if ((gamertagToSet === '-' && !player.gamertag) || gamertagToSet === player.gamertag) {
      const sameGamertagContainer = new ContainerBuilder().addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `# No Changes Detected\n\n` +
          `Your current gamertag is already ${oldGamertagDisplay}. Please enter a different gamertag to update it.`
        )
      );
      return interaction.followUp({ components: [sameGamertagContainer], flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] });
    }

    // Ask for confirmation
    return askForConfirmation(
      interaction,
      [
        new TextDisplayBuilder().setContent(
          `# Confirm Gamertag Change\n\n` +
          `You are about to ${gamertagToSet === '-' ? `remove your gamertag, ${oldGamertagDisplay}` : `change your gamertag from **${oldGamertagDisplay}** to **${newGamertagDisplay}**`}. When you change your gamertag, your nickname here on the Discord server will be updated to reflect the new gamertag or lack thereof along with your character's name.`
        )
      ],
      'player-manager-return-button',
      (interaction) => changeGamertagConfirm(interaction, player, gamertagToSet),
      (interaction) => changeGamertagEdit(interaction, player, gamertagToSet)
    )
  }
}

async function changeGamertagConfirm(interaction, player, gamertagToSet) {
  // Defer the update to allow time to process
  await interaction.deferUpdate();

  // Update the message to say that the gamertag is being updated
  const updatingContainer = new ContainerBuilder().addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      `# Changing Gamertag\n\n` +
      `Your gamertag is being ${gamertagToSet === '-' ? 'removed' : `changed to **${gamertagToSet}**`}. This may take a moment...`
    )
  );
  await interaction.editReply({ components: [updatingContainer], flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] });

  // Update the player's gamertag in the database
  const { player: updatedPlayer } = await changePlayerInDatabase(interaction.user, player, { newGamertag: gamertagToSet });
  if (!updatedPlayer) {
    const errorContainer = new ContainerBuilder().addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `# Gamertag Change Failed\n\n` +
        `There was an error changing your gamertag. Please try again later or contact a member of Staff.`
      )
    );
    return interaction.editReply({ components: [errorContainer], flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] });
  }

  // Show a success message
  return showMessageThenReturnToContainer(
    interaction,
    `# Gamertag Changed\n\n` +
    `Your gamertag has been ${gamertagToSet === '-' ? 'removed' : `changed to **${gamertagToSet}**`}. Your nickname on the Discord server has been updated accordingly!`,
    10000,
    `Player Dashboard`,
    async () => getPlayerManagerContainer(interaction.user.id)
  )
}

async function changeGamertagEdit(interaction, player, gamertagToSet) {
  // Get the modal again
  const modal = await changeGamertagModal(player, gamertagToSet === '-' ? '' : gamertagToSet);

  // Show the modal to the user again
  return interaction.showModal(modal);
}