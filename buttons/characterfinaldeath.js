const { ModalBuilder, MessageFlags, TextInputBuilder, LabelBuilder, TextInputStyle, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } = require('discord.js');
const { finalDeathModal } = require('../helpers/modalCreator.js');
module.exports = {
  customId: 'character-final-death-button',
  async execute(interaction) {
    const modal = await finalDeathModal();

    // Show the modal to the user
    await interaction.showModal(modal);
  }
}
