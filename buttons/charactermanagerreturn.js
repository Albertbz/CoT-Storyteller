const { MessageFlags } = require('discord.js');
const { Players } = require('../dbObjects.js');
const { createManageCharacterContainer } = require('../helpers/managecharacter.js');

module.exports = {
  customId: 'character-manager-return-button',
  async execute(interaction) {
    // Defer the update to allow time to process
    await interaction.deferUpdate();

    // Get player and character to edit reply with character manager container
    const player = await Players.findByPk(interaction.user.id);
    const character = await player.getCharacter();

    const container = await createManageCharacterContainer(character);

    return interaction.editReply({ components: [container], flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] });
  }
}