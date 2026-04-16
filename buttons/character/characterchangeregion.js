const { TimestampStyles, ContainerBuilder, MessageFlags, time, TextDisplayBuilder } = require("discord.js");
const { Players } = require("../../dbObjects");
const { changeRegionModal } = require("../../helpers/modalCreator");
const { formatCharacterName } = require("../../helpers/formatters");

module.exports = {
  customId: 'character-change-region-button',
  async execute(interaction) {
    // Get character of player for modal creation
    const player = await Players.findByPk(interaction.user.id);
    const character = await player.getCharacter();
    const regionChangedRecently = regionChangedCheck(character);

    // Check whether the character is a steelbearer
    const steelbearer = await character.getSteelbearer();
    if (steelbearer) {
      const steelbearerContainer = new ContainerBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `# Character Is a Steelbearer\n` +
            `The character ${formatCharacterName(character.name)} is currently a steelbearer, and as such cannot have their region changed until they are no longer a steelbearer.`
          )
        )
      return interaction.reply({ components: [steelbearerContainer], flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] });
    }

    // Check whether the character is a region manager
    const regionManager = await character.getRegionManager();
    if (regionManager) {
      const regionManagerContainer = new ContainerBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `# Character Is a Region Manager\n` +
            `The character ${formatCharacterName(character.name)} is currently a region manager, and as such cannot have their region changed until they are no longer a region manager.`
          )
        )
      return interaction.reply({ components: [regionManagerContainer], flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] });
    }

    if (!regionChangedRecently) {
      const modal = await changeRegionModal(character, 'character', { regionId: character.regionId });
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
  // if ((Date.now() - new Date(character.regionUpdatedAt).getTime()) <= 259200000) {
  if ((Date.now() - new Date(character.regionUpdatedAt).getTime()) <= 10) {
    return true;
  }
  else {
    return false;
  }
}
