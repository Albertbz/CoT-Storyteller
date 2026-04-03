const { MessageFlags, ContainerBuilder, TextDisplayBuilder } = require("discord.js");
const { Players } = require("../../dbObjects");
const { getOffspringManagerContainer } = require("../../helpers/containerCreator");

module.exports = {
  customId: 'offspring-manager-button',
  async execute(interaction) {
    // Defer update to give time to process
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    // Create the offspring management container
    const container = await getOffspringManagerContainer(interaction.user.id);

    // Edit the original message to show the offspring management container
    return interaction.editReply({ components: [container], flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] });
  }
}