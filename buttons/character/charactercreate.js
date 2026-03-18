const { characterCreateModal } = require('../../helpers/modalCreator.js');

module.exports = {
  customId: 'character-create-button',
  async execute(interaction) {
    const modal = await characterCreateModal();

    // Show the modal to the user
    await interaction.showModal(modal);
  }
}