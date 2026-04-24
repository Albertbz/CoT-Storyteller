const { MessageFlags } = require("discord.js");
const { getPlayerManagerContainer } = require("../../helpers/containerCreator");

module.exports = {
  customId: 'player-manager-button',
  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const container = await getPlayerManagerContainer(interaction.user.id);

    return interaction.editReply({ components: [container], flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2], allowedMentions: { parse: [] } });
  }
}