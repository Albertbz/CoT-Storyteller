const { TextDisplayBuilder, ContainerBuilder, MessageFlags } = require("discord.js");
const { Players } = require("../../dbObjects");
const { askForConfirmation } = require("../../helpers/confirmations");
const { changePlayerInDatabase } = require("../../misc");
const { showMessageThenReturnToContainer } = require("../../helpers/messageSender");
const { getPlayerManagerContainer } = require("../../helpers/containerCreator");

module.exports = {
  customId: 'player-toggle-character-title-prefix-button',
  async execute(interaction) {
    // Defer update to allow time to process
    await interaction.deferUpdate();

    // Get the player
    const player = await Players.findByPk(interaction.user.id);
    // Get the current setting for whether to include the character title as a prefix in the nickname and toggle it
    const currentSetting = player.enableNicknameCharacterTitlePrefix;

    // Ask for confirmation to toggle the setting
    return askForConfirmation(
      interaction,
      [
        new TextDisplayBuilder().setContent(
          `# ${currentSetting ? 'Disable' : 'Enable'} Character Title Prefix\n` +
          `Are you sure you want to ${currentSetting ? 'disable' : 'enable'} including your character's title as a prefix in your Discord nickname? This will change how your nickname is displayed when you are playing a character.`
        )
      ],
      'player-manager-return-button',
      (interaction) => toggleCharacterTitlePrefixConfirm(interaction, player, !currentSetting)
    )
  }
}

async function toggleCharacterTitlePrefixConfirm(interaction, player, newSetting) {
  // Defer update to allow time to process
  await interaction.deferUpdate();

  // Edit the message to say that the setting is being enabled/disabled
  const togglingText = newSetting ? 'Enabling' : 'Disabling';
  const changingContainer = new ContainerBuilder().addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      `# ${togglingText} Character Title Prefix\n` +
      `${togglingText} the character title prefix in your nickname...`
    )
  );
  await interaction.editReply({ components: [changingContainer], flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] });

  // Update the setting in the database
  const { player: updatedPlayer } = await changePlayerInDatabase(interaction.user, player, { newEnableNicknameCharacterTitlePrefix: newSetting });
  if (!updatedPlayer) {
    // If there was an error updating the database, edit the message to say there was an error and return
    const errorContainer = new ContainerBuilder().addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `# Error ${togglingText} Character Title Prefix\n` +
        `There was an error updating your settings in the database. Please try again later or contact a member of Staff.`
      )
    );
    return interaction.editReply({ components: [errorContainer], flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] });
  }

  // Edit the message to say that the setting has been enabled/disabled
  return showMessageThenReturnToContainer(
    interaction,
    `# Character Title Prefix ${newSetting ? 'Enabled' : 'Disabled'}\n` +
    `You have ${newSetting ? 'enabled' : 'disabled'} including your character's title as a prefix in your Discord nickname. Your nickname will update immediately to reflect this change. You can toggle this setting again at any time.`,
    10000,
    'Player Dashboard',
    async () => getPlayerManagerContainer(interaction.user.id)
  )
}