const { Players } = require("../../dbObjects")
const { updateVSUsernameModal } = require("../../helpers/modalCreator")

module.exports = {
  customId: 'player-update-vs-username-button',
  async execute(interaction) {
    // Get the player
    const player = await Players.findByPk(interaction.user.id);

    // Create a modal for updating the player's VS username
    const modal = await updateVSUsernameModal(player);

    // Show the modal to the user
    return interaction.showModal(modal);
  }
}