const { changeRegion } = require("../helpers/changeregion");

module.exports = {
  customId: 'offspring-change-region-modal',
  async execute(interaction) {
    // Defer update to allow time for processing
    await interaction.deferUpdate();

    return changeRegion(interaction, 'offspring-manager-return-button');
  }
}