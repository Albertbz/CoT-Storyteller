const { changeRegion } = require("../helpers/changeregion");

module.exports = {
  customId: 'character-change-region-modal',
  async execute(interaction) {
    // Defer update to allow time for processing
    await interaction.deferUpdate();

    return changeRegion(interaction, 'character');
  }
}