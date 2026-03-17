const { Players } = require("../dbObjects");
const { characterChangeRegionModal } = require("../helpers/modalCreator");

module.exports = {
  customId: 'character-change-region-button',
  async execute(interaction) {
    // Get character of player for modal creation
    const player = await Players.findByPk(interaction.user.id);
    const character = await player.getCharacter();
    const check = await houseTimeCheck(interaction, character);
    
    if (check === false) {
    const modal = await characterChangeRegionModal(character, { regionId: character.regionId });
    await interaction.showModal(modal);
    }
  }
}

async function houseTimeCheck(interaction, character) {
  // Check if character has changed house within the last 3 days (259200000 milliseconds)
  if ((date(now) - (date(character.houseUpdatedAt.getTime()))) <= 259200000) {
    const container = new ContainerBuilder()
      .addTextDisplayComponents((textDisplay) =>
        textDisplay.setContent(
          `# Cannot Change House\n` +
          `You cannot change house within 3 days of joining the current house\n` +
          `You can change houses again on ${(new Date(character.houseUpdatedAt.getTime() + 259200000), TimestampStyles.LongDate)}\n` +
          `You can continue to manage your character using the Character Manager GUI above.`
        )
      );
    await interaction.editReply({ components: [container], flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] });

    return true
  }
  else {
    return false
  }
}
