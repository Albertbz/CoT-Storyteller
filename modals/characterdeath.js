const { MessageFlags, ContainerBuilder, inlineCode } = require('discord.js');
const { addDeceasedToDatabase } = require('../misc.js');
const { Players } = require('../dbObjects');

module.exports = {
  customId: 'character-death-modal',
  async execute(interaction) {
    // Defer reply to allow time to process
    await interaction.deferUpdate();


    /**
     * Notify the user of death register in progress
     */
    const container = new ContainerBuilder()
      .addTextDisplayComponents((textDisplay) =>
        textDisplay.setContent(
          `# Registering death of Character...\n` +
          `Character Death being Registered. This may take a few moments...`
        )
      );

    await interaction.editReply({ components: [container], flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] });

    /**
     * Extract modal inputs
     */
    const dayInput = interaction.fields.getTextInputValue('death-day-input');
    const monthInput = interaction.fields.getStringSelectValues('death-month-select')[0];
    const yearInput = interaction.fields.getTextInputValue('death-year-input');
    const causeInput = interaction.fields.getTextInputValue('death-cause-input');
    const noteInput = interaction.fields.getTextInputValue('death-note-input');

    // Find player and character 
    const player = await Players.findByPk(interaction.user.id);
    const character = await player.getCharacter();


    /**
     * Create the character in the database and assign to the player
     */
    const { deceased, embed: deceasedCreatedEmbed } = await addDeceasedToDatabase(interaction.user, true, { characterId: character.id, yearOfDeath: yearInput, monthOfDeath: monthInput, dayOfDeath: dayInput, causeOfDeath: causeInput, playedById: player.id });
    if (!deceased) {
      await interaction.followUp({ content: 'There was an error marking your character as deceased. Please contact a storyteller for assistance.', flags: MessageFlags.Ephemeral });
      return;
    }

    /**
     * Notify the user of successful character death
     */
    container.spliceComponents(0, container.components.length); // Clear container components

    container
      .addTextDisplayComponents((textDisplay) =>
        textDisplay.setContent(
          `# Character Final Death Registered\n` +
          `Your character, **${inlineCode(character.name)}**, has been successfully marked as deceased. This death will be posted in the graveyard channel in 2 hours.\n` +
          `You can now create a new character using the Character Manager GUI above.`
        )
      );


    await interaction.editReply({ components: [container], flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] });
  }
}