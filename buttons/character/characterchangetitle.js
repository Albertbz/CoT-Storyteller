const { Players } = require("../../dbObjects");
const { changeCharacterTitleModal } = require("../../helpers/modalCreator");

module.exports = {
  customId: 'character-change-title-button',
  async execute(interaction) {
    // Get the player's character
    const player = await Players.findByPk(interaction.user.id);
    const character = await player.getCharacter();

    // Get the modal for changing a character's title
    const modal = await changeCharacterTitleModal(character);

    // Show the modal to the user
    return interaction.showModal(modal);
  }
}