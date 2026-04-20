const { Players } = require("../../dbObjects");
const { changeGamertagModal } = require("../../helpers/modalCreator");

module.exports = {
  customId: 'player-change-gamertag-button',
  async execute(interaction) {
    // Get the player
    const player = await Players.findByPk(interaction.user.id);

    // Create a modal for changing the player's gamertag
    const modal = await changeGamertagModal(player);

    // Show the modal to the user
    return interaction.showModal(modal);
  }
}