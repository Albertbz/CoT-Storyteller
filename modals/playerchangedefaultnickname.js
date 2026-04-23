const { ContainerBuilder, TextDisplayBuilder, MessageFlags } = require("discord.js");
const { Players } = require("../dbObjects");
const { askForConfirmation } = require("../helpers/confirmations");
const { changePlayerDefaultNicknameModal } = require("../helpers/modalCreator");
const { changePlayerInDatabase } = require("../misc");
const { showMessageThenReturnToContainer } = require("../helpers/messageSender");
const { getPlayerManagerContainer } = require("../helpers/containerCreator");

module.exports = {
  customId: 'player-change-default-nickname-modal',
  async execute(interaction) {
    // Defer update to allow time to process
    await interaction.deferUpdate();

    // Get the player
    const player = await Players.findByPk(interaction.user.id);

    // Get the input from the modal
    const newDefaultNickname = interaction.fields.getTextInputValue('default-nickname-input').trim();

    // Ensure that the new nickname is not the same as the current default nickname
    if ((newDefaultNickname === player.defaultNickname) || (newDefaultNickname === '' && !player.defaultNickname)) {
      const sameNicknameContainer = new ContainerBuilder().addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `# No Change Provided\n` +
          `The nickname you entered is the same as your current default nickname. Please enter a different nickname to change your default nickname.`
        )
      );
      return interaction.followUp({ components: [sameNicknameContainer], flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] });
    }

    // Ask for confirmation to change the default nickname
    return askForConfirmation(
      interaction,
      [
        new TextDisplayBuilder().setContent(
          `# Change Default Nickname\n` +
          `You are changing your default nickname from ${player.defaultNickname ? `**${player.defaultNickname}**` : '*None*'} to ${newDefaultNickname ? `**${newDefaultNickname}**` : '*None*'}.\n` +
          `This will change how your nickname is displayed when you are not playing a character. If you have gamertag suffix enabled, your gamertag will still be included in your nickname after the default nickname or "(no character)".`
        )
      ],
      `player-manager-return-button`,
      (interaction) => changeDefaultNicknameConfirm(interaction, player, newDefaultNickname),
      (interaction) => changeDefaultNicknameEdit(interaction, player, newDefaultNickname)
    )
  }
}

async function changeDefaultNicknameConfirm(interaction, player, newDefaultNickname) {
  // Defer update to allow time to process
  await interaction.deferUpdate();

  // Edit the message to say that the default nickname is being changed
  const changingContainer = new ContainerBuilder().addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      `# Changing Default Nickname\n` +
      `Changing your default nickname to ${newDefaultNickname ? `**${newDefaultNickname}**` : '*None*'}...`
    )
  );
  await interaction.editReply({ components: [changingContainer], flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] });

  // Update the default nickname in the database
  const { player: updatedPlayer } = await changePlayerInDatabase(interaction.user, player, { newDefaultNickname: newDefaultNickname === '' ? '-' : newDefaultNickname });
  if (!updatedPlayer) {
    const errorContainer = new ContainerBuilder().addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `# Error Changing Default Nickname\n` +
        `There was an error updating your default nickname in the database. Please try again later or contact a member of Staff.`
      )
    );
    return interaction.editReply({ components: [errorContainer], flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] });
  }

  // Edit the message to say that the default nickname has been changed and show the new default nickname
  return showMessageThenReturnToContainer(
    interaction,
    `# Default Nickname Changed\n` +
    `Your default nickname has been changed to ${updatedPlayer.defaultNickname ? `**${updatedPlayer.defaultNickname}**` : '*None*'}. Your nickname will update immediately when you are not playing a character to reflect this change. You can change your default nickname again at any time.`,
    10000,
    'Player Dashboard',
    async () => getPlayerManagerContainer(interaction.user.id)
  )
}


async function changeDefaultNicknameEdit(interaction, player, newDefaultNickname) {
  // Get the modal to edit
  const modal = await changePlayerDefaultNicknameModal(player, newDefaultNickname);

  // Edit the modal to show the new default nickname and ask for confirmation
  return interaction.showModal(modal);
}
