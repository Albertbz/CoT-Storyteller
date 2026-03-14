const { MessageFlags } = require("discord.js");
const { Players } = require("../dbObjects.js");
const { getCharacterManagerContainer } = require("../helpers/containerCreator.js");

module.exports = {
  customId: 'character-manager-button',
  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    // Get player that invoked the interaction
    const player = await Players.findByPk(interaction.user.id);
    if (!player) {
      return interaction.editReply({
        content: 'You are not registered as a player. Please make a ticket to register.',
        flags: MessageFlags.Ephemeral,
      });
    }

    const character = await player.getCharacter();

    const container = await getCharacterManagerContainer(character);

    return interaction.editReply({ components: [container], flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] });
  }
}