const { denyChangeModal } = require("../../helpers/modalCreator")

module.exports = {
  customId: 'offspring-change-name-deny',
  async execute(interaction) {
    // Create a modal to ask for reason for denying the name change request
    const modal = denyChangeModal(
      `offspring-change-name-deny-modal:${interaction.customId.split(':')[1]}`,
      'Deny Offspring Name Change Request'
    )

    return interaction.showModal(modal);
  }
}