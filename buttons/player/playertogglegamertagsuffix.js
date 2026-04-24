const { TextDisplayBuilder, ContainerBuilder, MessageFlags } = require("discord.js");
const { Players } = require("../../dbObjects");
const { askForConfirmation } = require("../../helpers/confirmations");
const { showMessageThenReturnToContainer } = require("../../helpers/messageSender");
const { getPlayerManagerContainer } = require("../../helpers/containerCreator");
const { changePlayerInDatabase } = require("../../misc");

module.exports = {
  customId: 'player-toggle-gamertag-suffix-button',
  async execute(interaction) {
    // Defer update to allow time to process
    await interaction.deferUpdate();

    // Get the player
    const player = await Players.findByPk(interaction.user.id);
    // Get the current setting for whether to include the gamertag as a suffix in the nickname and toggle it
    const currentSetting = player.enableNicknameGamertagSuffix;

    // Ask for confirmation
    return askForConfirmation(
      interaction,
      [
        new TextDisplayBuilder().setContent(
          `# ${currentSetting ? 'Disable' : 'Enable'} Gamertag Suffix\n` +
          `Are you sure you want to ${currentSetting ? 'disable' : 'enable'} including your gamertag as a suffix in your Discord nickname? This will change how your nickname is displayed when you are playing a character and also when you are not playing a character.`
        )
      ],
      'player-manager-return-button',
      (interaction) => toggleGamertagSuffixConfirm(interaction, player, !currentSetting)
    )

  }
}

async function toggleGamertagSuffixConfirm(interaction, player, newSetting) {
  // Defer update to allow time to process
  await interaction.deferUpdate();

  // Edit the message to say that the setting is being enabled/disabled
  const togglingText = newSetting ? 'Enabling' : 'Disabling';
  const changingContainer = new ContainerBuilder().addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      `# ${togglingText} Gamertag Suffix\n` +
      `${togglingText} the gamertag suffix in your nickname...`
    )
  );
  await interaction.editReply({ components: [changingContainer], flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] });

  // Update the setting in the database
  const { player: updatedPlayer } = await changePlayerInDatabase(interaction.user, player, { newEnableNicknameGamertagSuffix: newSetting });
  if (!updatedPlayer) {
    // If there was an error updating the database, edit the message to say there was an error and return
    const errorContainer = new ContainerBuilder().addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `# Error ${togglingText} Gamertag Suffix\n` +
        `There was an error updating your settings in the database. Please try again later or contact a member of Staff.`
      )
    );
    return interaction.editReply({ components: [errorContainer], flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] });
  }

  // If the update was successful, edit the message to say that the setting has been enabled/disabled
  return showMessageThenReturnToContainer(
    interaction,
    `# Gamertag Suffix ${newSetting ? 'Enabled' : 'Disabled'}\n` +
    `Your gamertag suffix setting has been ${newSetting ? 'enabled' : 'disabled'}. Your nickname will update immediately to reflect this change. You can toggle this setting again at any time.`,
    10000,
    'Player Dashboard',
    async () => getPlayerManagerContainer(interaction.user.id)
  )
}