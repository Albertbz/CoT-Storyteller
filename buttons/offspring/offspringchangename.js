const { PlayableChildren } = require("../../dbObjects");
const { offspringChangeNameModal } = require("../../helpers/modalCreator");

module.exports = {
  customId: 'offspring-change-name',
  async execute(interaction) {
    // Get the offspring ID from the customId of the button
    const offspringId = interaction.customId.split(':')[1];
    // Get the offspring from the database
    const offspring = await PlayableChildren.findByPk(offspringId);

    // Create modal to give the offspring a new name
    const modal = await offspringChangeNameModal(offspring);

    // Show the modal to the user
    await interaction.showModal(modal);
  }
}