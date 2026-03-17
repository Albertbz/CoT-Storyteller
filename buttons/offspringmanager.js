const { MessageFlags } = require("discord.js");
const { Players } = require("../dbObjects");
const { getOffspringManagerContainer } = require("../helpers/containerCreator");

module.exports = {
  customId: 'offspring-manager-button',
  async execute(interaction) {
    // Defer update to give time to process
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    // Get player that invoked the interaction
    const player = await Players.findByPk(interaction.user.id);
    if (!player) {
      return interaction.editReply({
        content: 'You are not registered as a player. Please make a ticket to register.',
        flags: MessageFlags.Ephemeral,
      });
    }

    // Create the offspring management container
    const container = await getOffspringManagerContainer(player);

    // Edit the original message to show the offspring management container
    return interaction.editReply({ components: [container], flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] });
  }
}