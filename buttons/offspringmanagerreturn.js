const { MessageFlags } = require("discord.js");
const { Players } = require("../dbObjects");
const { getOffspringManagerContainer } = require("../helpers/containerCreator");

module.exports = {
  customId: 'offspring-manager-return-button',
  async execute(interaction) {
    // Defer the update to allow time to process
    await interaction.deferUpdate();

    // Get player to get offspring to edit reply with offspring manager container
    const player = await Players.findByPk(interaction.user.id);
    const container = await getOffspringManagerContainer(player);

    return interaction.editReply({ components: [container], flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] });
  }
}