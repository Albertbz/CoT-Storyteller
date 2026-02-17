const { ModalBuilder, MessageFlags, TextInputBuilder, LabelBuilder, TextInputStyle, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } = require('discord.js');
const { Regions, Houses } = require('../dbObjects.js');
const { characterCreateModal } = require('../helpers/modalCreator.js');

module.exports = {
  customId: 'character-create-button',
  async execute(interaction) {
    const modal = await characterCreateModal();

    // Show the modal to the user
    await interaction.showModal(modal);
  }
}