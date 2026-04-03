const { MessageFlags, ContainerBuilder, TextDisplayBuilder } = require("discord.js");
const { Players } = require("../../dbObjects.js");
const { getCharacterManagerContainer } = require("../../helpers/containerCreator.js");

module.exports = {
  customId: 'character-manager-button',
  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const container = await getCharacterManagerContainer(interaction.user.id);

    return interaction.editReply({ components: [container], flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] });
  }
}