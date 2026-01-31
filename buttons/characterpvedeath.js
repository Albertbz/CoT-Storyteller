const { ContainerBuilder, MessageFlags, inlineCode } = require('discord.js');
const { changeCharacterInDatabase } = require('../misc.js');
const { Players, Characters } = require('../dbObjects.js');

module.exports = {
  customId: 'character-pve-death-button',
  async execute(interaction) {
    // Defer the update to allow time to process
    await interaction.deferUpdate();

    /**
     * Notify the user of death change in progress
     */
    const components = [];

    const container = new ContainerBuilder()
      .addTextDisplayComponents((textDisplay) =>
        textDisplay.setContent(
          `# Adding PvE death to character...\n` +
          `Your character is being updated. This may take a few moments...`
        )
      );

    components.push(container);

    await interaction.editReply({ components: components, flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] });

    /**
     * Update the character PvE death count in DB
     */
    const player = await Players.findByPk(interaction.user.id);
    const character = await player.getCharacter();
    const addedpvedeath = character.pveDeaths + 1
    const { character: changedCharacter, embed: _ } = await changeCharacterInDatabase(interaction.user, character, true, { newPveDeaths: addedpvedeath });
    if (!changedCharacter) {
      await interaction.followUp({ content: 'There was an error registering your character PvE death. Please contact a storyteller for assistance.', flags: MessageFlags.Ephemeral });
      return;
    }

    /**
     * Notify the user of successful notability update
     */
    components.length = 0; // Clear components array
    container.spliceComponents(0, container.components.length); // Clear container components

    container
      .addTextDisplayComponents((textDisplay) =>
        textDisplay.setContent(
          `# PvE death added Successfully!\n` +
          `Your character, **${inlineCode(character.name)}**, has now spent ${inlineCode(addedpvedeath)} PvE ${addedpvedeath === 1 ? 'life' : 'lives'}.\n` +
          `You can continue to manage your character using the Character Manager GUI above.`
        )
      );

    components.push(container);

    return interaction.editReply({ components: components, flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] });
  }
}