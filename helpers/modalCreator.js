const { ModalBuilder, MessageFlags, TextInputBuilder, LabelBuilder, TextInputStyle, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, TextDisplayBuilder, inlineCode } = require('discord.js');
const { Regions, Houses } = require('../dbObjects.js');
const { guilds } = require('../configs/ids.json');

/**
 * Creates a character creation modal with optional pre-filled values.
 * 
 * @param {Object} options - Options for the character creation modal
 * @param {string} [options.characterName] - Optional pre-filled character name
 * @param {string} [options.regionId] - Optional pre-filled region ID
 * @param {string} [options.notabilityChoice] - Optional pre-filled notability choice ('yes' or 'no')
 * @returns {Promise<ModalBuilder>} - The constructed character creation modal
 */
async function characterCreateModal({ characterName = null, regionId = null, notabilityChoice = null } = {}) {
  /**
   * Create modal for character creation with optional pre-filled values
   */
  const modal = new ModalBuilder()
    .setCustomId('character-create-modal')
    .setTitle('Create New Character');

  /**
   * Create character name input and label
   */
  const nameInput = new TextInputBuilder()
    .setCustomId('character-name-input')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('Enter character name')
    .setRequired(true)
    .setMaxLength(50);

  // If a character name was provided, pre-fill the input with that value
  if (characterName) {
    nameInput.setValue(characterName);
  }

  const nameLabel = new LabelBuilder()
    .setLabel('What is the name of your character?')
    .setDescription('Numbers, usernames, and references to real-life are not allowed.')
    .setTextInputComponent(nameInput);

  /**
   * Create region input and label
   */
  const regionInput = new StringSelectMenuBuilder()
    .setCustomId('character-region-select')
    .setPlaceholder('Select a region for your character')
    .setRequired(true)

  // Get current regions and their ruling houses, as well as their emojis
  const cotGuild = await client.guilds.fetch(guilds.cot);
  const guildEmojis = await cotGuild.emojis.fetch();
  const regions = await Regions.findAll({ include: { model: Houses, as: 'rulingHouse' } });
  const regionOptions = regions.map(region => {
    const selectMenuOption = new StringSelectMenuOptionBuilder()
      .setLabel(region.name === 'Wanderer' ? 'None' : region.name)
      .setValue(region.id)
      .setDescription(`${region.name === 'Wanderer' ? 'Your character will be a wanderer' : 'House ' + region.rulingHouse.name}`);

    // Find emoji for this region's ruling house
    if (region.rulingHouse) {
      const emoji = guildEmojis.find(e => e.name === region.rulingHouse.emojiName);
      if (emoji) {
        selectMenuOption.setEmoji(emoji.toString());
      }
    }

    // If a region ID was provided and matches this region, pre-select this option
    if (regionId && region.id === regionId) {
      selectMenuOption.setDefault(true);
    }

    return selectMenuOption;
  });
  regionInput.addOptions(regionOptions);

  const regionLabel = new LabelBuilder()
    .setLabel('Which region will your character belong to?')
    .setDescription('This determines your character\'s house.')
    .setStringSelectMenuComponent(regionInput);

  /**
   * Create notability opt in input and label
   */
  const yesOption = new StringSelectMenuOptionBuilder()
    .setLabel('Yes')
    .setValue('yes')
    .setDescription('Your character will be notable immediately.');

  const noOption = new StringSelectMenuOptionBuilder()
    .setLabel('No')
    .setValue('no')
    .setDescription('Your character will not be notable immediately.');

  // If a notability choice was provided and matches an option, pre-select that option
  if (notabilityChoice === 'yes') {
    yesOption.setDefault(true);
  } else if (notabilityChoice === 'no') {
    noOption.setDefault(true);
  }

  const notabilityInput = new StringSelectMenuBuilder()
    .setCustomId('character-notability-select')
    .setPlaceholder('Whether to start your character as notable')
    .setMinValues(1)
    .setMaxValues(1)
    .setRequired(true)
    .addOptions(
      yesOption,
      noOption
    );

  const notabilityLabel = new LabelBuilder()
    .setLabel('Should your character be notable immediately?')
    .setDescription('Your character will automatically be made notable two years after creation.')
    .setStringSelectMenuComponent(notabilityInput);


  modal.addLabelComponents(nameLabel, regionLabel, notabilityLabel);

  return modal;
}

async function finalDeathModal({ deathDay = null, deathMonth = null, deathYear = null, deathCause = null, deathNote = null } = {}) {
  const modal = new ModalBuilder()
    .setCustomId('character-death-modal')
    .setTitle('Register Character Final Death');

  // Day Input
  const dayInput = new TextInputBuilder()
    .setCustomId('death-day-input')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('e.g., 15')
    .setRequired(true)
    .setMaxLength(2);

  if (deathDay) {
    dayInput.setValue(deathDay);
  }

  const dayLabel = new LabelBuilder()
    .setLabel('Day of Death')
    .setDescription('Enter the in-game day your character died (1-24).')
    .setTextInputComponent(dayInput);

  // Month Input
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  const options = months.map((month) => {
    const option = new StringSelectMenuOptionBuilder()
      .setLabel(month)
      .setValue(month);
    if (deathMonth) {
      if (month === deathMonth) {
        option.setDefault(true);
      }
    }
    return option;
  });

  const monthInput = new StringSelectMenuBuilder()
    .setCustomId('death-month-select')
    .setPlaceholder('Select month of death')
    .setRequired(true)
    .addOptions(options);

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
    .setMaxLength(2);

  if (deathYear) {
    yearInput.setValue(deathYear);
  }

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

  if (deathCause) {
    causeInput.setValue(deathCause);
  }

  const causeLabel = new LabelBuilder()
    .setLabel('Cause of Death')
    .setDescription('Note the cause of the death, i.e. how your character died.')
    .setTextInputComponent(causeInput);

  // Death Final Note
  const noteInput = new TextInputBuilder()
    .setCustomId('death-note-input')
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(true)
    .setMaxLength(250);

  if (deathNote) {
    noteInput.setValue(deathNote);
  }

  const noteLabel = new LabelBuilder()
    .setLabel('Final note')
    .setDescription('Your final note. This is not allowed to reveal any IC information. Max 250 characters.')
    .setTextInputComponent(noteInput);

  modal.addLabelComponents(dayLabel, monthLabel, yearLabel, causeLabel, noteLabel);

  return modal;
}

async function characterSurnameModal(character, { surnameValue = null } = {}) {
  const modal = new ModalBuilder()
    .setCustomId('character-change-surname-modal')
    .setTitle('Change Surname of Character')

  /**
   * Create a textdisplay to have the name of the character and some 
   * information, and then also the input that is prefilled with the
   * current surname (if any)
   */
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
    .setPlaceholder('Enter new surname for your character')
    .setMaxLength(50);

  if (surnameValue) {
    surnameInput.setValue(surnameValue);
  }
  else if (currentSurname !== '') {
    surnameInput.setValue(currentSurname);
  }

  const surnameLabel = new LabelBuilder()
    .setLabel('What is the new surname of your character?')
    .setDescription('Numbers, usernames, and references to real-life are not allowed.')
    .setTextInputComponent(surnameInput);

  modal.addTextDisplayComponents(textDisplay);
  modal.addLabelComponents(surnameLabel);

  return modal;
}

module.exports = {
  characterCreateModal,
  finalDeathModal,
  characterSurnameModal
}