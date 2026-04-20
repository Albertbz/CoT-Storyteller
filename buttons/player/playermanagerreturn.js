const { MessageFlags } = require("discord.js");
const { getPlayerManagerContainer } = require("../../helpers/containerCreator");

module.exports = {
  customId: 'player-manager-return-button',
  async execute(interaction) {
    // Defer the update to allow time to process
    await interaction.deferUpdate();

    const container = await getPlayerManagerContainer(interaction.user.id);

    return interaction.editReply({ components: [container], flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2], allowedMentions: { parse: [] } });
  }
}