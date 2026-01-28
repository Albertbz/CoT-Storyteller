const { MessageFlags } = require("discord.js");
const { Players } = require("../dbObjects.js");
const { createManageCharacterContainer } = require("../helpers/managecharacter.js");

module.exports = {
  customId: 'manage-character-button',
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

    const container = await createManageCharacterContainer(character);

    return interaction.editReply({ components: [container], flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] });
  }
}