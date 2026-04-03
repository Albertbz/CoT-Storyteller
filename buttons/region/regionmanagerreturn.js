const { MessageFlags } = require("discord.js");
const { getRegionManagerContainer } = require("../../helpers/containerCreator");

module.exports = {
  customId: 'region-manager-return-button',
  async execute(interaction) {
    // Defer update to allow time to process
    await interaction.deferUpdate();

    // Get the region manager container
    const container = await getRegionManagerContainer(interaction.user.id);

    // Show the region manager container
    return interaction.editReply({ components: [container], flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] });
  }
}