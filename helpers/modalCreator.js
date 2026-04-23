const { ModalBuilder, MessageFlags, TextInputBuilder, LabelBuilder, TextInputStyle, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, TextDisplayBuilder, FileUploadBuilder } = require('discord.js');
const { Regions, Houses, Relationships } = require('../dbObjects.js');
const { guildId } = require('../configs/config.json');
const { Op, Sequelize } = require('sequelize');
const { WANDERER_REGION_ID } = require('../constants.js');
const { formatCharacterName } = require('./formatters.js');

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
  const guild = await client.guilds.fetch(guildId);
  const guildEmojis = await guild.emojis.fetch();
  const regions = await Regions.findAll({ include: { model: Houses, as: 'rulingHouse' } });
  const regionOptions = regions.map(region => {
    const selectMenuOption = new StringSelectMenuOptionBuilder()
      .setLabel(region.id === WANDERER_REGION_ID ? 'None' : region.name)
      .setValue(region.id)
      .setDescription(`${region.id === WANDERER_REGION_ID ? 'Your character will be a wanderer' : region.rulingHouse ? 'House ' + region.rulingHouse.name : 'No ruling house'}`);

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
    .setMaxLength(500);

  if (deathNote) {
    noteInput.setValue(deathNote);
  }

  const noteLabel = new LabelBuilder()
    .setLabel('Final note')
    .setDescription('Final note. No IC information allowed, as it will be posted to the public. Max 500 characters.')
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
      `You are currently changing the surname of your character, ${formatCharacterName(character.name)}, ` +
      (currentSurname === '' ? `who does not have a surname yet.\n` : `whose current surname is **${currentSurname}**.\n`) +
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


async function intercharacterRollCreateModal(character1, character2, { bearingCharacterPrev = null, committed = null, inheritedTitle = null } = {}) {
  const modal = new ModalBuilder()
    .setCustomId('intercharacter-roll-create-modal')
    .setTitle('Create Intercharacter Roll');

  /**
   * Depending on whether there is a choice to be made about which character is
   * bearing and conceiving, create a select menu to specify this, or if not,
   * just create a text display to inform the user of which character is bearing
   * and which is conceiving
   */
  let bearingCharacter = null;
  let conceivingCharacter = null;
  // Check if there is a choice to be made about which character is bearing and which is conceiving
  const existsRollWithCharacter1BearingOrCharacter2Conceiving = await Relationships.findOne({
    where: {
      [Op.or]: [
        { bearingCharacterId: character1.id },
        { conceivingCharacterId: character2.id }
      ]
    }
  })

  if (existsRollWithCharacter1BearingOrCharacter2Conceiving) {
    bearingCharacter = character1;
    conceivingCharacter = character2;
  }
  else {
    const existsRollWithCharacter2ConceivingOrCharacter1Bearing = await Relationships.findOne({
      where: {
        [Op.or]: [
          { conceivingCharacterId: character1.id },
          { bearingCharacterId: character2.id }
        ]
      }
    })

    if (existsRollWithCharacter2ConceivingOrCharacter1Bearing) {
      bearingCharacter = character2;
      conceivingCharacter = character1;
    }
  }

  const canInheritNobleTitles = (character1.socialClassName === 'Noble' || character2.socialClassName === 'Noble' || character1.socialClassName === 'Ruler' || character2.socialClassName === 'Ruler');

  const textDisplay = new TextDisplayBuilder()
    .setContent(
      `## You are creating an intercharacter roll between ${formatCharacterName(character1.name)} and ${formatCharacterName(character2.name)}.\n` +
      (bearingCharacter && conceivingCharacter ? `${formatCharacterName(bearingCharacter.name)} will be the bearing partner and ${formatCharacterName(conceivingCharacter.name)} will be the conceiving partner, as one or both of them are already in another intercharacter roll as that type of partner.\n\n` : `Please specify which character will be the bearing partner.\n`) +
      `Please${bearingCharacter && conceivingCharacter ? ' ' : ' also '}specify whether the characters are married to each other or not${canInheritNobleTitles ? ', and if they are married, whether any children born from this intercharacter roll will inherit noble titles or not.' : '.'}`
    )

  modal.addTextDisplayComponents(textDisplay);

  if (!bearingCharacter && bearingCharacterPrev) {
    bearingCharacter = bearingCharacterPrev;
  }

  const { bearingLabel, marriedLabel, inheritTitlesLabel } = await getIntercharacterRollLabels(character1, character2, { bearingCharacter, committed, inheritedTitle });

  modal.addLabelComponents(bearingLabel, marriedLabel);

  if (inheritTitlesLabel) {
    modal.addLabelComponents(inheritTitlesLabel);
  }

  return modal;
}

async function intercharacterRollEditModal(roll) {
  const modal = new ModalBuilder()
    .setCustomId(`intercharacter-roll-edit-modal:${roll.id}`)
    .setTitle('Edit Intercharacter Roll');

  // Add a text display that explains which intercharacter roll is being edited, 
  // and what the current settings of that roll are
  const textDisplay = new TextDisplayBuilder()
    .setContent(
      `## You are editing the intercharacter roll between ${formatCharacterName(roll.bearingCharacter.name)} and ${formatCharacterName(roll.conceivingCharacter.name)}.\n` +
      `Please change any of the values you want to change, and leave any values you do not want to change the same as they currently are.`
    )

  modal.addTextDisplayComponents(textDisplay);

  const { bearingLabel, marriedLabel, inheritTitlesLabel } = await getIntercharacterRollLabels(roll.bearingCharacter, roll.conceivingCharacter, { bearingCharacter: roll.bearingCharacter, committed: roll.isCommitted, inheritedTitle: roll.inheritedTitle !== 'None', ignoreNumRolls: 1 });

  modal.addLabelComponents(bearingLabel, marriedLabel);

  if (inheritTitlesLabel) {
    modal.addLabelComponents(inheritTitlesLabel);
  }

  return modal;
}

async function getIntercharacterRollLabels(character1, character2, { bearingCharacter = null, committed = null, inheritedTitle = null, ignoreNumRolls = 0 } = {}) {
  // Create the input and label for choosing the bearing character, which can
  // be prefilled if there is already a bearing character 
  const character1BearingOption = new StringSelectMenuOptionBuilder()
    .setLabel(`${character1.name}`)
    .setValue(`${character1.id}:${character2.id}`)
    .setDefault(bearingCharacter && bearingCharacter.id === character1.id ? true : false);

  const character2BearingOption = new StringSelectMenuOptionBuilder()
    .setLabel(`${character2.name}`)
    .setValue(`${character2.id}:${character1.id}`)
    .setDefault(bearingCharacter && bearingCharacter.id === character2.id ? true : false);

  const bearingSelectMenu = new StringSelectMenuBuilder()
    .setCustomId('intercharacter-roll-bearing-select')
    .setPlaceholder('Select the bearing partner')
    .setRequired(true)

  // If one of the characters is already the bearing or conceiving partner in
  // another roll, then there is no choice to be made about who is the bearing
  // and who is the conceiving character, so we only add the option for the
  // character that can be the bearing character. Otherwise, we add options for
  // both characters to be the bearing character
  const existingRollsWithCharacter1BearingOrCharacter2ConceivingCount = await Relationships.count({
    where: {
      [Op.or]: [
        { bearingCharacterId: character1.id },
        { conceivingCharacterId: character2.id }
      ]
    }
  });

  const existingRollsWithCharacter1ConceivingOrCharacter2BearingCount = await Relationships.count({
    where: {
      [Op.or]: [
        { conceivingCharacterId: character1.id },
        { bearingCharacterId: character2.id }
      ]
    }
  });

  if (existingRollsWithCharacter1BearingOrCharacter2ConceivingCount - ignoreNumRolls > 0 && existingRollsWithCharacter1ConceivingOrCharacter2BearingCount === 0) {
    bearingSelectMenu.addOptions(character1BearingOption);
  }
  else if (existingRollsWithCharacter1BearingOrCharacter2ConceivingCount === 0 && existingRollsWithCharacter1ConceivingOrCharacter2BearingCount - ignoreNumRolls > 0) {
    bearingSelectMenu.addOptions(character2BearingOption);
  }
  else {
    bearingSelectMenu.addOptions(character1BearingOption, character2BearingOption);
  }

  const bearingLabel = new LabelBuilder()
    .setLabel('Which character is the bearing partner?')
    .setDescription('The other character will automatically be the conceiving partner.')
    .setStringSelectMenuComponent(bearingSelectMenu);

  // Create the input and label for whether the characters are married or not,
  // potentially prefilled with whether they are currently married or not
  const marriedSelectMenu = new StringSelectMenuBuilder()
    .setCustomId('intercharacter-roll-committed-select')
    .setPlaceholder('Select whether the characters are married or not')
    .setRequired(true)
    .addOptions(
      new StringSelectMenuOptionBuilder()
        .setLabel('Married')
        .setValue('true')
        .setDefault(committed === true ? true : false),
      new StringSelectMenuOptionBuilder()
        .setLabel('Not Married')
        .setValue('false')
        .setDefault(committed === false ? true : false)
    );

  const marriedLabel = new LabelBuilder()
    .setLabel('Are the characters married to each other?')
    .setDescription('This will affect the legitimacy of any children born from this intercharacter roll.')
    .setStringSelectMenuComponent(marriedSelectMenu);

  // Create the input and label for whether any children born from this roll will
  // inherit noble titles or not, which only applies if either character is noble,
  // and which can be prefilled with the current value if it is already set
  let inheritTitlesLabel = null;
  if (character1.socialClassName === 'Noble' || character2.socialClassName === 'Noble' || character1.socialClassName === 'Ruler' || character2.socialClassName === 'Ruler') {
    const inheritTitlesSelectMenu = new StringSelectMenuBuilder()
      .setCustomId('intercharacter-roll-inherit-titles-select')
      .setPlaceholder('Select whether any children will inherit noble titles')
      .setRequired(false)
      .addOptions(
        new StringSelectMenuOptionBuilder()
          .setLabel('Will Inherit Noble Titles')
          .setValue('true')
          .setDefault(inheritedTitle === true ? true : false),
        new StringSelectMenuOptionBuilder()
          .setLabel('Will Not Inherit Noble Titles')
          .setValue('false')
          .setDefault(inheritedTitle === false ? true : false)
      );

    inheritTitlesLabel = new LabelBuilder()
      .setLabel('Will any children born inherit noble titles?')
      .setDescription('This only makes a difference for intercharacter rolls between married characters.')
      .setStringSelectMenuComponent(inheritTitlesSelectMenu);
  }

  return { bearingLabel, marriedLabel, inheritTitlesLabel };
}

/**
 * Creates a modal for changing the region of a character, with an optional pre-selected region.
 * @param {*} character The character entry to change the region of.
 * @param {string} manager The manager that is being used to change the character's region. 
 * @param {Object} [options={}] - Optional configuration.
 * @param {string|null} [options.regionId=null] - The region ID.
 * @returns {Promise<ModalBuilder>} The constructed modal for changing the character's region.
 */
async function changeRegionModal(character, manager, { regionId = null } = {}) {
  const modal = new ModalBuilder()
    .setCustomId(`${manager}-change-region-modal:${character.id}`)
    .setTitle('Change Region of Character');


  /**
   * Create a textdisplay to have the name of the character and some information
   */
  const textDisplay = new TextDisplayBuilder()
    .setContent(
      `You are currently changing the region of the character ${formatCharacterName(character.name)}.\n` +
      `Changing the character's region will also change their house to the house that rules that region, and may also change their social class.`
    )

  modal.addTextDisplayComponents(textDisplay);

  /**
   * Create a select menu to specify which region the character should be 
   * changed to, prefilled with the character's current region
   */
  const guild = await client.guilds.fetch(guildId);
  const guildEmojis = await guild.emojis.fetch();
  const regions = await Regions.findAll({ include: { model: Houses, as: 'rulingHouse' } });
  const regionOptions = regions.map(region => {
    const selectMenuOption = new StringSelectMenuOptionBuilder()
      .setLabel(region.id === WANDERER_REGION_ID ? 'None' : region.name)
      .setValue(region.id)
      .setDescription(`${region.id === WANDERER_REGION_ID ? 'The character will be a wanderer' : region.rulingHouse ? 'House ' + region.rulingHouse.name : 'No ruling house'}`);

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

  const regionInput = new StringSelectMenuBuilder()
    .setCustomId('character-change-region-select')
    .setPlaceholder('Select a new region for the character')
    .setRequired(true)
    .addOptions(regionOptions);

  const regionLabel = new LabelBuilder()
    .setLabel('Which region is the character to change to?')
    .setDescription('This determines the character\'s house.')
    .setStringSelectMenuComponent(regionInput);

  modal.addLabelComponents(regionLabel);

  return modal;
}

async function offspringLegitimiseModal(offspring, newNameValue = null) {
  const modal = new ModalBuilder()
    .setCustomId('offspring-legitimise-modal:' + offspring.id)
    .setTitle('Legitimise Offspring');

  const offspringCharacter = await offspring.getCharacter();

  // Create textdisplay to explain what legitimising the offspring means and 
  // what the requirements are
  const textDisplay = new TextDisplayBuilder()
    .setContent(
      `To legitimise the offspring ${formatCharacterName(offspringCharacter.name)}, please provide a screenshot of a piece of parchment that has been signed by the ruler of the lands that the offspring belongs to. The parchment must state that the offspring is now a legitimate child of their parent(s), and must include the name of the offspring and their parent(s).\n` +
      `You can also specify the new name of the offspring in the input below (if it is to be changed), and you must also provide a screenshot of the chiseled child with its name shown, made into a tabletop piece, to show that the child exists in the world.`
    )

  modal.addTextDisplayComponents(textDisplay);

  // Create a file upload input for the screenshot of the signed parchment
  const screenshotInput = new FileUploadBuilder()
    .setCustomId('offspring-legitimise-screenshot')

  const screenshotLabel = new LabelBuilder()
    .setLabel('Upload screenshot of signed parchment')
    .setDescription('Make sure the screenshot includes the things mentioned in the instructions above.')
    .setFileUploadComponent(screenshotInput);

  const { nameLabel, screenshotLabel: nameScreenshotLabel } = getNameAndScreenshotLabel(newNameValue ? newNameValue : offspringCharacter.name);

  modal.addLabelComponents(screenshotLabel, nameLabel, nameScreenshotLabel);

  return modal;
}

function getNameAndScreenshotLabel(nameValue) {
  const nameInput = new TextInputBuilder()
    .setCustomId('offspring-change-name-input')
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setPlaceholder('Enter new name for the offspring')
    .setValue(nameValue)
    .setMaxLength(50);

  const nameLabel = new LabelBuilder()
    .setLabel('What is the new name of the offspring?')
    .setDescription('Numbers, usernames, and references to real-life are not allowed.')
    .setTextInputComponent(nameInput);

  // Create a file upload input for the screenshot of the chiseled child with its name shown
  const screenshotInput = new FileUploadBuilder()
    .setCustomId('offspring-chiseled-offspring-screenshot')

  const screenshotLabel = new LabelBuilder()
    .setLabel('Upload screenshot of chiseled child')
    .setDescription('Make sure the screenshot includes the things mentioned in the instructions above.')
    .setFileUploadComponent(screenshotInput);

  return { nameLabel, screenshotLabel };
}

async function offspringChangeNameModal(offspring, { nameValue = null } = {}) {
  const modal = new ModalBuilder()
    .setCustomId('offspring-change-name-modal:' + offspring.id)
    .setTitle('Change Name of Offspring');

  const offspringCharacter = await offspring.getCharacter();

  // Create textdisplay to explain what changing the name of the offspring means
  const textDisplay = new TextDisplayBuilder()
    .setContent(
      `You are currently changing the name of the offspring ${formatCharacterName(offspringCharacter.name)}.\n` +
      `Please enter the new name for this offspring, and provide a screenshot of the chiseled child with its name shown. It has to be made into a tabletop piece to be valid.`
    );

  modal.addTextDisplayComponents(textDisplay);

  // Create a text input for the new name of the offspring, prefilled with the current name
  const { nameLabel, screenshotLabel } = getNameAndScreenshotLabel(nameValue ? nameValue : offspringCharacter.name);

  modal.addLabelComponents(nameLabel, screenshotLabel);

  return modal;
}

function denyChangeModal(modalCustomId, title) {
  const modal = new ModalBuilder()
    .setCustomId(modalCustomId)
    .setTitle(title);

  const reasonInput = new TextInputBuilder()
    .setCustomId('reason')
    .setStyle(TextInputStyle.Paragraph)
    .setPlaceholder('Enter the reason for denying this request here...')
    .setRequired(true);

  const reasonLabel = new LabelBuilder()
    .setLabel('Reason for denying this request')
    .setDescription('This reason will be sent to the user who made the request.')
    .setTextInputComponent(reasonInput);

  modal.addLabelComponents(reasonLabel);

  return modal;
}

async function offspringChangeInheritanceModal(offspring) {
  const modal = new ModalBuilder()
    .setCustomId('offspring-change-inheritance-modal:' + offspring.id)
    .setTitle('Change Offspring Inheritance');

  const offspringCharacter = await offspring.getCharacter();

  // Create textdisplay to explain what changing the inheritance of the offspring means
  const textDisplay = new TextDisplayBuilder()
    .setContent(
      `You are currently changing the inheritance of the offspring ${formatCharacterName(offspringCharacter.name)}.\n` +
      `Please specify whether this offspring is inheriting nobility or not.`
    );

  modal.addTextDisplayComponents(textDisplay);

  // Create string select menu to specify "Inheriting Nobility" or "Not Inheriting Nobility", prefilled with the current inheritance status of the offspring
  const inheritanceSelectMenu = new StringSelectMenuBuilder()
    .setCustomId('offspring-change-inheritance-select')
    .setPlaceholder('Select the new inheritance status of the offspring')
    .setRequired(true)
    .addOptions(
      new StringSelectMenuOptionBuilder()
        .setLabel('Inheriting Nobility')
        .setValue('inheriting')
        .setDescription('The offspring is inheriting nobility.')
        .setDefault(offspringCharacter.socialClassName === 'Notable' ? false : true),
      new StringSelectMenuOptionBuilder()
        .setLabel('Not Inheriting Nobility')
        .setValue('not_inheriting')
        .setDescription('The offspring is not inheriting nobility.')
        .setDefault(offspringCharacter.socialClassName === 'Notable' ? true : false)
    );

  const inheritanceLabel = new LabelBuilder()
    .setLabel('Is the offspring inheriting nobility or not?')
    .setDescription('This will affect the social class of the offspring character.')
    .setStringSelectMenuComponent(inheritanceSelectMenu);

  modal.addLabelComponents(inheritanceLabel);

  return modal;
}

async function changeRecruitmentRolesModal(region) {
  const modal = new ModalBuilder()
    .setCustomId(`region-change-recruitment-roles-modal`)
    .setTitle('Change Recruitment Roles for ' + region.name);

  const textDisplay = new TextDisplayBuilder()
    .setContent(
      `You are currently changing the recruitment roles for the region **${region.name}**.\n` +
      `Please specify what roles this region is in need of. You can select up to 3 recruitment roles, or leave it blank if there are no specific roles needed for this region.`
    );

  modal.addTextDisplayComponents(textDisplay);

  // Create three string select menus for the three recruitment roles, prefilled with the current recruitment roles of the region
  const possibleRoles = [{ name: 'Smiths', emoji: '🔨' }, { name: 'Builders', emoji: '🏗️' }, { name: 'Cooks', emoji: '🍳' }, { name: 'Lumberjacks', emoji: '🪓' }, { name: 'Soldiers', emoji: '⚔️' }, { name: 'Potters', emoji: '🏺' }, { name: 'Miners', emoji: '⛏️' }, { name: 'Carpenters', emoji: '🪚' }, { name: 'Tailors', emoji: '🧵' }, { name: 'Healers', emoji: '🩹' }, { name: 'Farmers', emoji: '🌾' }, { name: 'Hunters', emoji: '🏹' }, { name: 'Clockmakers', emoji: '🕰️' }, { name: 'Alchemists', emoji: '🧪' }];

  const recruitment = await region.getRecruitment();
  const currentRoles = recruitment ? [recruitment.role1, recruitment.role2, recruitment.role3] : [null, null, null];

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId(`recruitment-roles-select`)
    .setPlaceholder(`No specific roles required`)
    .setRequired(false)
    .setMinValues(0)
    .setMaxValues(3)
    .addOptions(
      possibleRoles.map(role => new StringSelectMenuOptionBuilder()
        .setLabel(role.name)
        .setValue(role.name)
        .setEmoji(role.emoji)
        .setDefault(currentRoles.includes(role.name) ? true : false)
      )
    );

  const label = new LabelBuilder()
    .setLabel(`Recruitment Roles`)
    .setDescription('Select the recruitment roles for this region. You can select up to 3 roles.')
    .setStringSelectMenuComponent(selectMenu);


  modal.addLabelComponents(label);

  return modal;
}

async function updateVSUsernameModal(player, usernameValue = null) {
  const modal = new ModalBuilder()
    .setCustomId('player-update-vs-username-modal')
    .setTitle('Update VS Username')

  const textDisplay = new TextDisplayBuilder()
    .setContent(
      `You are currently updating your VS username, which is currently noted down as **${player.ign}**.\n` +
      `Please enter your new VS username in the input below, and ensure that it is the same as the username that is shown in the bottom left corner of the main menu of the game.`
    );

  modal.addTextDisplayComponents(textDisplay);

  const usernameInput = new TextInputBuilder()
    .setCustomId('vs-username-input')
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setPlaceholder('Enter your new VS username')
    .setMaxLength(50);

  if (usernameValue) {
    usernameInput.setValue(usernameValue);
  }
  else if (player.ign) {
    usernameInput.setValue(player.ign);
  }

  const usernameLabel = new LabelBuilder()
    .setLabel('What is your new VS username?')
    .setDescription('Make sure to enter the correct username.')
    .setTextInputComponent(usernameInput);

  modal.addLabelComponents(usernameLabel);

  return modal;
}

async function changeGamertagModal(player, gamertagValue = null) {
  const modal = new ModalBuilder()
    .setCustomId('player-change-gamertag-modal')
    .setTitle('Change Gamertag')

  const textDisplay = new TextDisplayBuilder()
    .setContent(
      `You are currently changing your gamertag, which is currently ${player.gamertag ? `set to **${player.gamertag}**` : 'not set'}.\n` +
      `Please enter your new gamertag in the input below. This gamertag will be shown in your nickname here on the Discord server along with your character's name. If you do not want to have a gamertag shown, you can leave the input blank.`
    );

  modal.addTextDisplayComponents(textDisplay);

  const gamertagInput = new TextInputBuilder()
    .setCustomId('gamertag-input')
    .setStyle(TextInputStyle.Short)
    .setRequired(false)
    .setPlaceholder('Enter your new gamertag')
    .setMaxLength(20);

  if (gamertagValue) {
    gamertagInput.setValue(gamertagValue);
  }
  else if (player.gamertag) {
    gamertagInput.setValue(player.gamertag);
  }

  const gamertagLabel = new LabelBuilder()
    .setLabel('What is your new gamertag?')
    .setDescription('A maximum of 20 characters is allowed. Leave blank to remove gamertag.')
    .setTextInputComponent(gamertagInput);

  modal.addLabelComponents(gamertagLabel);

  return modal;
}

async function changeCharacterTitleModal(character, titleValue = null) {
  const modal = new ModalBuilder()
    .setCustomId('character-change-title-modal')
    .setTitle('Change Title of Character')

  const textDisplay = new TextDisplayBuilder()
    .setContent(
      `You are currently changing the title of the character ${formatCharacterName(character.name)}, which is currently ${character.title ? `**${character.title}**` : 'not set'}.\n` +
      `Please enter the new title for this character in the input below. If you want to remove the character's title, you can leave the input blank.`
    )

  modal.addTextDisplayComponents(textDisplay);

  const titleInput = new TextInputBuilder()
    .setCustomId('character-title-input')
    .setStyle(TextInputStyle.Short)
    .setRequired(false)
    .setPlaceholder('Enter new title for the character')
    .setMaxLength(50);

  if (titleValue) {
    titleInput.setValue(titleValue);
  }
  else if (character.title) {
    titleInput.setValue(character.title);
  }

  const titleLabel = new LabelBuilder()
    .setLabel('What is the new title for the character?')
    .setDescription('A maximum of 50 characters is allowed. Leave blank to remove title.')
    .setTextInputComponent(titleInput);

  modal.addLabelComponents(titleLabel);

  return modal;
}

async function changePlayerDefaultNicknameModal(player, nicknameValue = null) {
  const modal = new ModalBuilder()
    .setCustomId('player-change-default-nickname-modal')
    .setTitle('Change Default Nickname')

  const textDisplay = new TextDisplayBuilder()
    .setContent(
      `You are currently changing your default nickname, which is currently ${player.defaultNickname ? `set to **${player.defaultNickname}**` : 'not set'}.\n` +
      `Your default nickname is the nickname that will be set when you are not playing a character. If you do not want to have a default nickname, you can leave the input blank, and will simply be called "(no character)" when you are not playing a character.`
    );

  modal.addTextDisplayComponents(textDisplay);

  const nicknameInput = new TextInputBuilder()
    .setCustomId('default-nickname-input')
    .setStyle(TextInputStyle.Short)
    .setRequired(false)
    .setPlaceholder('Enter your new default nickname')
    .setMaxLength(32);

  if (nicknameValue) {
    nicknameInput.setValue(nicknameValue);
  }
  else if (player.defaultNickname) {
    nicknameInput.setValue(player.defaultNickname);
  }

  const nicknameLabel = new LabelBuilder()
    .setLabel('What is your new default nickname?')
    .setDescription('A maximum of 32 characters is allowed. Leave blank to remove default nickname.')
    .setTextInputComponent(nicknameInput);

  modal.addLabelComponents(nicknameLabel);

  return modal;
}

module.exports = {
  characterCreateModal,
  finalDeathModal,
  characterSurnameModal,
  intercharacterRollCreateModal,
  intercharacterRollEditModal,
  changeRegionModal,
  offspringLegitimiseModal,
  offspringChangeNameModal,
  offspringChangeInheritanceModal,
  denyChangeModal,
  changeRecruitmentRolesModal,
  updateVSUsernameModal,
  changeGamertagModal,
  changeCharacterTitleModal,
  changePlayerDefaultNicknameModal
}