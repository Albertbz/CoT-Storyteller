const { MessageFlags, ContainerBuilder, TextDisplayBuilder } = require("discord.js");
const { Players } = require("../../dbObjects");
const { getRegionManagerContainer } = require("../../helpers/containerCreator");

module.exports = {
  customId: 'region-manager-button',
  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    // Get the container for the region manager
    const container = await getRegionManagerContainer(interaction.user.id);

    // Edit the original message to show the region manager container
    await interaction.editReply({ components: [container], flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] });
  }
}