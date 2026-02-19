const { MessageFlags, ContainerBuilder, inlineCode, ModalBuilder, TextInputBuilder, StringSelectMenuBuilder, LabelBuilder, StringSelectMenuOptionBuilder, TextInputStyle } = require('discord.js');
const { addDeceasedToDatabase } = require('../misc.js');
const { Players } = require('../dbObjects');
const { askForConfirmation } = require('../helpers/confirmations');
const { finalDeathModal } = require('../helpers/modalCreator.js');

module.exports = {
  customId: 'character-death-modal',
  async execute(interaction) {
    // Defer reply to allow time to process
    await interaction.deferUpdate();
    /**
     * Extract modal inputs first prior to confirmation
     */
    const day = interaction.fields.getTextInputValue('death-day-input');
    const month = interaction.fields.getStringSelectValues('death-month-select')[0];
    const year = interaction.fields.getTextInputValue('death-year-input');
    const cause = interaction.fields.getTextInputValue('death-cause-input');
    const note = interaction.fields.getTextInputValue('death-note-input');

    // Find player and character 
    const player = await Players.findByPk(interaction.user.id);
    const character = await player.getCharacter();

    // User final check for information update using helper
    return askForConfirmation(
      interaction,
      `Review Character Final Death`,
      `Please review the final death information and confirm that this is correct for ${inlineCode(character.name)}.\n\n` +
      `Date of Death: ${day} ${month} ${year}\n` +
      `Cause: ${cause}\n` +
      `Final Note: ${note}\n`,
      (interaction) => finalDeathConfirm(interaction, day, month, year, cause, note),
      (interaction) => finalDeathEdit(interaction, day, month, year, cause, note)
    )
  }
  
}
  async function finalDeathConfirm(interaction, day, month, year, cause, note){
   
    await buttonInteraction.deferUpdate();
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
     * Add deceased in the database
     */
    const { deceased, embed: deceasedCreatedEmbed } = await addDeceasedToDatabase(interaction.user, true, { characterId: character.id, yearOfDeath: year, monthOfDeath: month, dayOfDeath: day, causeOfDeath: cause, playedById: player.id });
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
    
  async function finalDeathEdit(interaction, day, month, year, cause, note) {
    // Show the modal again with pre-filled values for editing
    const modal = await finalDeathModal({ day, month, year, cause, note });
    return interaction.showModal(modal);

  }
    