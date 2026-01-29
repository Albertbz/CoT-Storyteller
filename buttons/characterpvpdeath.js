const { ModalBuilder, MessageFlags, TextInputBuilder, LabelBuilder, TextInputStyle, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } = require('discord.js');

module.exports = {
  customId: 'character-pvp-death-button',
  async execute(interaction) {
    const modal = new ModalBuilder()
      .setCustomId('character-death-modal')
      .setTitle('Register Character Final Death');

    // Day Input
    const dayInput = new TextInputBuilder()
      .setCustomId('death-day-input')
      .setStyle(TextInputStyle.Short)
      .setRequired(true)
      .setMaxLength(2);

    const dayLabel = new LabelBuilder()
      
      .setLabel('Day of Death')
      .setDescription('Enter In-Game Day your character died (1-24)')
      .setTextInputComponent(dayInput);

    // Month Input
    const monthInput = new StringSelectMenuBuilder()
      .setCustomId('character-month-select')
      .setPlaceholder('Select month of death')
      .setRequired(true)
    monthInput.addOptions('January','February','March','April','May','June','July','August','September','October','November','December');

    const monthLabel = new LabelBuilder()
      .setLabel('Month of Death')
      .setDescription('Enter In-Game Month your chararcter Died')
      .setStringSelectMenuComponent(monthInput);

    //Year Input, To be prefilled once date API added
     const yearInput = new TextInputBuilder()
      .setCustomId('death-year-input')
      .setStyle(TextInputStyle.Short)
      .setRequired(true)
      .setMaxLength(2);

    const yearLabel = new LabelBuilder()
      
      .setLabel('Year of Death')
      .setDescription('Enter In-Game Year your character died ')
      .setTextInputComponent(dayInput);

    // Death Cause
    const causeInput = new TextInputBuilder()
      .setCustomId('death-cause-input')
      .setStyle(TextInputStyle.Short)
      .setRequired(true)
      .setMaxLength(30);

    const causeLabel = new LabelBuilder()
      
      .setLabel('Cause of Death')
      .setDescription('Note how your character died. This will be posted publically in #Graveyard.')
      .setTextInputComponent(causeInput);

    // Death Final Note
    const noteInput = new TextInputBuilder()
      .setCustomId('death-note-input')
      .setStyle(TextInputStyle.Short)
      .setRequired(true)
      .setMaxLength(100);

    const noteLabel = new LabelBuilder()
      
      .setLabel('Final notes')
      .setDescription('Leave your final note, this is not allowed to reveal any In Character information.\n This will be posted publically in #Graveyard.')
      .setTextInputComponent(dayInput);

    modal.addLabelComponents(dayLabel, monthLabel, yearLabel, causeLabel, noteLabel);

    // Show the modal to the user
    await interaction.showModal(modal);
  }
}