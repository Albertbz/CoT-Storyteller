const { ModalBuilder, MessageFlags, TextInputBuilder, LabelBuilder, TextInputStyle, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } = require('discord.js');
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

module.exports = {
  characterCreateModal
}