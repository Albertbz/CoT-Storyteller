const { ModalBuilder, MessageFlags, TextInputBuilder, LabelBuilder, TextInputStyle, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } = require('discord.js');
const { Regions, Houses } = require('../dbObjects.js');

module.exports = {
  customId: 'character-create-button',
  async execute(interaction) {
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
    const guildEmojis = await interaction.guild.emojis.fetch();
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
    const notabilityInput = new StringSelectMenuBuilder()
      .setCustomId('character-notability-select')
      .setPlaceholder('Whether to start your character as notable')
      .setMinValues(1)
      .setMaxValues(1)
      .setRequired(true)
      .addOptions(
        new StringSelectMenuOptionBuilder()
          .setLabel('Yes')
          .setValue('yes')
          .setDescription('Your character will be notable immediately.'),
        new StringSelectMenuOptionBuilder()
          .setLabel('No')
          .setValue('no')
          .setDescription('Your character will not be notable immediately.')
      );

    const notabilityLabel = new LabelBuilder()
      .setLabel('Should your character be notable immediately?')
      .setDescription('Your character will automatically be made notable two years after creation.')
      .setStringSelectMenuComponent(notabilityInput);


    modal.addLabelComponents(nameLabel, regionLabel, notabilityLabel);

    // Show the modal to the user
    await interaction.showModal(modal);
  }
}