const { TimestampStyles, ContainerBuilder, MessageFlags, time } = require("discord.js");
const { Players } = require("../dbObjects");
const { characterChangeRegionModal } = require("../helpers/modalCreator");

module.exports = {
  customId: 'character-change-region-button',
  async execute(interaction) {
    // Get character of player for modal creation
    const player = await Players.findByPk(interaction.user.id);
    const character = await player.getCharacter();
    const regionChangedRecently = regionChangedCheck(character);

    if (!regionChangedRecently) {
      const modal = await characterChangeRegionModal(character, { regionId: character.regionId });
      await interaction.showModal(modal);
    }
    else {
      const container = new ContainerBuilder()
        .addTextDisplayComponents((textDisplay) =>
          textDisplay.setContent(
            `# Cannot Change Region\n` +
            `You cannot change region within 3 days of joining the current region.\n` +
            `You can change region again ${time(new Date(character.regionUpdatedAt.getTime() + 259200000), TimestampStyles.FullDateShortTime)}.`
          )
        );
      await interaction.reply({ components: [container], flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] });
    }
  }
}

function regionChangedCheck(character) {
  if (!character.regionUpdatedAt) {
    return false;
  }

  // Check if character has changed region within the last 3 days (1000 * 60 * 60 * 24 * 3 = 259200000 milliseconds)
  if ((Date.now() - new Date(character.regionUpdatedAt).getTime()) <= 259200000) {
    return true;
  }
  else {
    return false;
  }
}
