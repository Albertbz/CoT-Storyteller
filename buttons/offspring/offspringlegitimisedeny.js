const { ModalBuilder, TextInputBuilder, LabelBuilder } = require("discord.js");
const { denyChangeModal } = require("../../helpers/modalCreator");

module.exports = {
  customId: 'offspring-legitimise-deny',
  async execute(interaction) {
    // Get modal to ask for reason for denying the legitimisation request
    const modal = denyChangeModal(
      `offspring-legitimise-deny-modal:${interaction.customId.split(':')[1]}`,
      'Deny Offspring Legitimisation Request'
    )

    return interaction.showModal(modal);
  }
}