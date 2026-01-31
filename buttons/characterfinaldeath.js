const { ModalBuilder, MessageFlags, TextInputBuilder, LabelBuilder, TextInputStyle, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } = require('discord.js');

module.exports = {
  customId: 'character-final-death-button',
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
      .setDescription('Enter the in-game day your character died (1-24).')
      .setTextInputComponent(dayInput);

    // Month Input
    const monthInput = new StringSelectMenuBuilder()
      .setCustomId('character-month-select')
      .setPlaceholder('Select month of death')
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
      .setRequired(true)
      .setMaxLength(2);

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
      .setMaxLength(30);

    const causeLabel = new LabelBuilder()
      .setLabel('Cause of Death')
      .setDescription('Note the cause of the death, i.e. how your character died.')
      .setTextInputComponent(causeInput);

    // Death Final Note
    const noteInput = new TextInputBuilder()
      .setCustomId('death-note-input')
      .setStyle(TextInputStyle.Short)
      .setRequired(true)
      .setMaxLength(100);

    const noteLabel = new LabelBuilder()
      .setLabel('Final note')
      .setDescription('Your final note. This is not allowed to reveal any IC information.')
      .setTextInputComponent(noteInput);

    modal.addLabelComponents(dayLabel, monthLabel, yearLabel, causeLabel, noteLabel);

    // Show the modal to the user
    await interaction.showModal(modal);
  }
}