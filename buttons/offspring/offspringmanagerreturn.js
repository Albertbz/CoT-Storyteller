const { MessageFlags } = require("discord.js");
const { Players } = require("../../dbObjects");
const { getOffspringManagerContainer } = require("../../helpers/containerCreator");

module.exports = {
  customId: 'offspring-manager-return-button',
  async execute(interaction) {
    // Defer the update to allow time to process
    await interaction.deferUpdate();

    const container = await getOffspringManagerContainer(interaction.user.id);

    return interaction.editReply({ components: [container], flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] });
  }
}