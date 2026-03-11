const { Players } = require("../dbObjects");
const { characterChangeRegionModal } = require("../helpers/modalCreator");

module.exports = {
  customId: 'character-change-region-button',
  async execute(interaction) {
    // Get character of player for modal creation
    const player = await Players.findByPk(interaction.user.id);
    const character = await player.getCharacter();

    const modal = await characterChangeRegionModal(character, { regionId: character.regionId });
    await interaction.showModal(modal);
  }
}