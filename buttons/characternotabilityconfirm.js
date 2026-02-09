const { ContainerBuilder, MessageFlags, inlineCode } = require('discord.js');
const { changeCharacterInDatabase } = require('../misc.js');
const { Players } = require('../dbObjects');

module.exports = {
  customId: 'character-notability-confirm-button',
  async execute(interaction) {
    // Defer the update to allow time to process
    await interaction.deferUpdate();

    /**
     * Notify the user of notability change in progress
     */
    const container = new ContainerBuilder()
      .addTextDisplayComponents((textDisplay) =>
        textDisplay.setContent(
          `# Confirming Notability Opt-In...\n` +
          `Your character is being updated to be notable. This may take a few moments...`
        )
      );

    await interaction.editReply({ components: [container], flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] });

    /**
     * Update the character to be notable
     */
    const player = await Players.findByPk(interaction.user.id);
    const character = await player.getCharacter();
    const { character: changedCharacter, embed: _ } = await changeCharacterInDatabase(interaction.user, character, true, { newSocialClassName: 'Notable' });
    if (!changedCharacter) {
      await interaction.followUp({ content: 'There was an error updating your character to be notable. Please contact a storyteller for assistance.', flags: MessageFlags.Ephemeral });
      return;
    }

    /**
     * Notify the user of successful notability update
     */
    container.spliceComponents(0, container.components.length); // Clear container components

    container
      .addTextDisplayComponents((textDisplay) =>
        textDisplay.setContent(
          `# Notability Opt-In Confirmed\n` +
          `Your character, **${inlineCode(changedCharacter.name)}**, has been successfully updated to be notable. Your character is now mortal and has begun aging, and will be able to participate in the offspring system.\n` +
          `You can continue to manage your character using the Character Manager GUI above.`
        )
      );

    return interaction.editReply({ components: [container], flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] });
  }
}