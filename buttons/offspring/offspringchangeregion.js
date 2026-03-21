const { PlayableChildren } = require("../../dbObjects");
const { changeRegionModal } = require("../../helpers/modalCreator");

module.exports = {
  customId: 'offspring-change-region',
  async execute(interaction) {
    // Get offspring id from customId, split by ":" and get second element
    const offspringId = interaction.customId.split(':')[1];
    const offspring = await PlayableChildren.findByPk(offspringId);

    const character = await offspring.getCharacter();

    // Get modal for changing region and show it
    const modal = await changeRegionModal(character, 'offspring', { regionId: character.regionId });
    return interaction.showModal(modal);
  }
}