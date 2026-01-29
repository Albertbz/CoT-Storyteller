const { MessageFlags, ContainerBuilder, inlineCode } = require('discord.js');
const { addDeceasedToDatabase } = require('../../misc.js');
const { Players } = require('../dbObjects');

module.exports = {
  customId: 'character-death-modal',
  async execute(interaction) {
    // Defer reply to allow time to process
    await interaction.deferUpdate();

    
   // Notify the user of death register in progress
    
    const components = [];
    const container = new ContainerBuilder()
      .addTextDisplayComponents((textDisplay) =>
        textDisplay.setContent(
          `# Updating Character...\n` +
          `Your character is being murdered. This may take a few moments...`
        )
      );

    components.push(container);

    await interaction.editReply({ components: components, flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] });


    /**
     * Extract modal inputs
     */
    const dayInput = interaction.fields.getTextInputValue('death-day-input');
    const monthInput = interaction.fields.getStringSelectValues('death-month-select')[0];
    const yearInput = interaction.fields.getTextInputValue('death-year-input');
    const causeInput = interaction.fields.getTextInputValue('death-cause-input');
    const noteInput = interaction.fields.getTextInputValue('death-note-input');

    //collect player 
    const player = await Players.findByPk(interaction.user.id);
    const character = await player.getCharacter();
    

    /**
     * Create the character in the database and assign to the player
     */
     const { deceased, embed: deceasedCreatedEmbed } = await addDeceasedToDatabase(interaction.user, true, { characterId: character.id,  yearOfDeath: yearInput, monthOfDeath: monthInput, dayOfDeath: dayInput, causeOfDeath: causeInput, playedById: interaction.user});
    if (!character) {
      await interaction.followUp({ content: 'There was an error marking your character as deceased. Please contact a storyteller for assistance.', flags: MessageFlags.Ephemeral });
      return;
    }

    /**
     * Notify the user of successful character death
     */
    components.length = 0; // Clear components array
    container.spliceComponents(0, container.components.length); // Clear container components

    container
      .addTextDisplayComponents((textDisplay) =>
        textDisplay.setContent(
          `# Character Updated\n` +
          `Your character, **${inlineCode(character.name)}**, has been successfully marked as deceased, this death should be posted in 2 hours in #Graveyard. If this has not happened please open a user support ticket.\n` +
          `You can create a new character using the Character Manager GUI above.`
        )
      );

    components.push(container);

    await interaction.editReply({ components: components, flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] });
  }
}