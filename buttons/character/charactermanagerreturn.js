const { MessageFlags } = require('discord.js');
const { getCharacterManagerContainer } = require('../../helpers/containerCreator.js');

module.exports = {
  customId: 'character-manager-return-button',
  async execute(interaction) {
    // Defer the update to allow time to process
    await interaction.deferUpdate();

    const container = await getCharacterManagerContainer(interaction.user.id);

    return interaction.editReply({ components: [container], flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] });
  }
}