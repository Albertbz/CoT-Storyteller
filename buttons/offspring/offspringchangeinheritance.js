const { PlayableChildren } = require("../../dbObjects");
const { offspringChangeInheritanceModal } = require("../../helpers/modalCreator");

module.exports = {
  customId: 'offspring-change-inheritance',
  async execute(interaction) {
    // Get the offspring ID from the customId of the button
    const offspringId = interaction.customId.split(':')[1];
    // Get the offspring from the database
    const offspring = await PlayableChildren.findByPk(offspringId);

    // Create modal to change the inheritance of the offspring
    const modal = await offspringChangeInheritanceModal(offspring);

    // Show the modal to the user
    await interaction.showModal(modal);
  }
}