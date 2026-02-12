const { MessageFlags, ContainerBuilder, inlineCode } = require('discord.js');
const { addDeceasedToDatabase } = require('../misc.js');
const { Players } = require('../dbObjects');

module.exports = {
  customId: 'character-submit-death-button',
  async execute(interaction) {
    // Defer reply to allow time to process
    await interaction.deferUpdate();
    /**
     * Extract modal inputs first prior to confirmation
     */
    const dayInput = interaction.fields.getTextInputValue('death-day-input');
    const monthInput = interaction.fields.getStringSelectValues('death-month-select')[0];
    const yearInput = interaction.fields.getTextInputValue('death-year-input');
    const causeInput = interaction.fields.getTextInputValue('death-cause-input');
    const noteInput = interaction.fields.getTextInputValue('death-note-input');

    // Find player and character 
    const player = await Players.findByPk(interaction.user.id);
    const character = await player.getCharacter();

    // Data clean-up for confirmation pop-up
    const deathData = {
      day: dayInput,
      month: monthInput,
      year: yearInput,
      cause: causeInput,
      note: noteInput
    };

    // User final check for information update using helper
    const confirmation = confirmationCheck(character, 'death', deathData);

    await interaction.editReply({ components: [confirmation], flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] });

    // await confirmation button press, if cancel is click, will automatically return to manager
    const filter = (i) => i.user.id === interaction.user.id;
    const collector = interaction.message.createMessageComponentCollector({ filter });

    collector.on('collect', async (buttonInteraction) => {
    if (buttonInteraction.customId === 'character-submit-death-button') {
        collector.stop();
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

    // Handle edit button
    else if (buttonInteraction.customId === 'character-edit-death-button') {
        collector.stop();

        // Reopen modal with existing data, has to be in same same file because modals cannot execute with parameters that will give prefil data.
        // Copied from previous modal with prefills added, will retrigger confirmation with updated data if executed
        const modal = new ModalBuilder()
      .setCustomId('character-death-modal')
      .setTitle('Register Character Final Death');

    // Day Input
    const dayInput = new TextInputBuilder()
      .setCustomId('death-day-input')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('e.g., 15')
      .setRequired(true)
      .setMaxLength(2)
      .setValue(deathData.day);

    const dayLabel = new LabelBuilder()
      .setLabel('Day of Death')
      .setDescription('Enter the in-game day your character died (1-24).')
      .setTextInputComponent(dayInput);

    // Month Input
    const monthInput = new StringSelectMenuBuilder()
      .setCustomId('death-month-select')
      .setPlaceholder(deathData.month)
      .setRequired(true)
      .addOptions(
        new StringSelectMenuOptionBuilder().setLabel('January').setValue('January'),
        new StringSelectMenuOptionBuilder().setLabel('February').setValue('February'),
        new StringSelectMenuOptionBuilder().setLabel('March').setValue('March'),
        new StringSelectMenuOptionBuilder().setLabel('April').setValue('April'),
        new StringSelectMenuOptionBuilder().setLabel('May').setValue('May'),
        new StringSelectMenuOptionBuilder().setLabel('June').setValue('June'),
        new StringSelectMenuOptionBuilder().setLabel('July').setValue('July'),
        new StringSelectMenuOptionBuilder().setLabel('August').setValue('August'),
        new StringSelectMenuOptionBuilder().setLabel('September').setValue('September'),
        new StringSelectMenuOptionBuilder().setLabel('October').setValue('October'),
        new StringSelectMenuOptionBuilder().setLabel('November').setValue('November'),
        new StringSelectMenuOptionBuilder().setLabel('December').setValue('December')
      )

    const monthLabel = new LabelBuilder()
      .setLabel('Month of Death')
      .setDescription('Choose the in-game month your character died.')
      .setStringSelectMenuComponent(monthInput);

    // Year Input, To be prefilled once date API added
    const yearInput = new TextInputBuilder()
      .setCustomId('death-year-input')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('e.g., 28')
      .setRequired(true)
      .setMaxLength(2)
      .setValue(deathData.year);

    const yearLabel = new LabelBuilder()
      .setLabel('Year of Death')
      .setDescription('Enter the in-game year your character died.')
      .setTextInputComponent(yearInput);

    // Death Cause
    const causeInput = new TextInputBuilder()
      .setCustomId('death-cause-input')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('e.g., old age, execution, fall damage, bear attack')
      .setRequired(true)
      .setMaxLength(30)
      .setValue(deathData.cause);

    const causeLabel = new LabelBuilder()
      .setLabel('Cause of Death')
      .setDescription('Note the cause of the death, i.e. how your character died.')
      .setTextInputComponent(causeInput);

    // Death Final Note
    const noteInput = new TextInputBuilder()
      .setCustomId('death-note-input')
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(true)
      .setMaxLength(250)
      .setValue(deathData.cause);

    const noteLabel = new LabelBuilder()
      .setLabel('Final note')
      .setDescription('Your final note. This is not allowed to reveal any IC information. Max 250 characters.')
      .setTextInputComponent(noteInput);

    modal.addLabelComponents(dayLabel, monthLabel, yearLabel, causeLabel, noteLabel);

    // Show the modal to the user
    await interaction.showModal(modal);
        
      } 
  })
  } 
}