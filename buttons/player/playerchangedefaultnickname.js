const { Players } = require("../../dbObjects");
const { changePlayerDefaultNicknameModal } = require("../../helpers/modalCreator");

module.exports = {
  customId: 'player-change-default-nickname-button',
  async execute(interaction) {
    // Get the player
    const player = await Players.findByPk(interaction.user.id);

    // Create a modal that allows the user to change their default nickname
    const modal = await changePlayerDefaultNicknameModal(player);

    // Show the modal to the user
    return interaction.showModal(modal);
  }
}