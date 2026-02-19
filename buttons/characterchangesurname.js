const { ModalBuilder, TextDisplayBuilder, TextInputBuilder, LabelBuilder, TextInputStyle, inlineCode } = require('discord.js');
const { Players } = require('../dbObjects.js');
const { characterSurnameModal } = require('../helpers/modalCreator.js');

module.exports = {
  customId: 'character-change-surname-button',
  async execute(interaction) {
    // Get player for modal creation
    const player = await Players.findByPk(interaction.user.id);
    const character = await player.getCharacter();

    // Create modal for changing the surname
    const modal = await characterSurnameModal(character);

    // Show the modal to the user
    await interaction.showModal(modal);
  }
}