const { ModalBuilder, TextInputBuilder, LabelBuilder } = require("discord.js")

module.exports = {
  customId: 'offspring-legitimise-deny',
  async execute(interaction) {
    // Create simple modal with a text input for the reason for denying the legitimisation request
    const modal = new ModalBuilder()
      .setCustomId(`offspring-legitimise-deny-modal:${interaction.customId.split(':')[1]}`)
      .setTitle('Deny Offspring Legitimisation Request');

    // Create the input for the reason for denying the legitimisation request
    const reasonInput = new TextInputBuilder()
      .setCustomId('reason')
      .setStyle('Paragraph')
      .setPlaceholder('Enter the reason for denying the legitimisation request here...')
      .setRequired(true);

    const reasonLabel = new LabelBuilder()
      .setLabel('Reason for denying the legitimisation request')
      .setDescription('This reason will be sent to the contacts of the offspring.')
      .setTextInputComponent(reasonInput);

    modal.addLabelComponents(reasonLabel);

    return interaction.showModal(modal);
  }
}