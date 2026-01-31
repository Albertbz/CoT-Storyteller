const { ModalBuilder, TextDisplayBuilder, TextInputBuilder, LabelBuilder, TextInputStyle, inlineCode } = require('discord.js');
const { Players } = require('../dbObjects.js');

module.exports = {
  customId: 'character-change-surname-button',
  async execute(interaction) {
    // Create modal for changing the surname
    const modal = new ModalBuilder()
      .setCustomId('character-change-surname-modal')
      .setTitle('Change Surname of Character')


    /**
     * Create a textdisplay to have the name of the character and some 
     * information, and then also the input that is prefilled with the
     * current surname (if any)
     */
    const player = await Players.findByPk(interaction.user.id);
    const character = await player.getCharacter();

    const separator = character.name.indexOf(' ');
    const currentSurname = separator !== -1 ? character.name.substring(separator + 1) : '';

    const textDisplay = new TextDisplayBuilder()
      .setContent(
        `You are currently changing the surname of your character, **${inlineCode(character.name)}**, ` +
        (currentSurname === '' ? `who does not have a surname yet.\n` : `whose current surname is **${inlineCode(currentSurname)}**.\n`) +
        `Please do not choose a surname that already exists, unless your character is part of said family.`
      )

    const surnameInput = new TextInputBuilder()
      .setCustomId('character-surname-input')
      .setStyle(TextInputStyle.Short)
      .setRequired(true)
      .setMaxLength(50);

    if (currentSurname === '') {
      surnameInput.setPlaceholder('Write your surname here');
    }
    else {
      surnameInput.setValue(currentSurname);
    }

    const surnameLabel = new LabelBuilder()
      .setLabel('What is the new surname of your character?')
      .setDescription('Numbers, usernames, and references to real-life are not allowed.')
      .setTextInputComponent(surnameInput);

    modal.addTextDisplayComponents(textDisplay);
    modal.addLabelComponents(surnameLabel);

    // Show the modal to the user
    await interaction.showModal(modal);
  }
}