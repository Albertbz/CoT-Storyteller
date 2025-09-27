const { SlashCommandBuilder, InteractionContextType, MessageFlags, userMention, inlineCode } = require('discord.js');
const { Players, Characters, Affiliations, SocialClasses, Worlds } = require('../../dbObjects.js');
const { roles } = require('../../configs/ids.json');
const { Op } = require('sequelize');
const { postInLogChannel } = require('../../misc.js');


module.exports = {
  data: new SlashCommandBuilder()
    .setName('deceased')
    .setDescription('Make a character deceased.')
    .setContexts(InteractionContextType.Guild)
    .setDefaultMemberPermissions(0)
    .addStringOption(option =>
      option
        .setName('character')
        .setDescription('The character to be set as deceased.')
        .setRequired(true)
        .setAutocomplete(true)
    )
    .addIntegerOption(option =>
      option
        .setName('year')
        .setDescription('The year that the character died.')
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName('month')
        .setDescription('The month that the character died.')
        .setRequired(true)
        .addChoices(
          { name: 'January', value: 'January' },
          { name: 'February', value: 'February' },
          { name: 'March', value: 'March' },
          { name: 'April', value: 'April' },
          { name: 'May', value: 'May' },
          { name: 'June', value: 'June' },
          { name: 'July', value: 'July' },
          { name: 'August', value: 'August' },
          { name: 'September', value: 'September' },
          { name: 'October', value: 'October' },
          { name: 'November', value: 'November' },
          { name: 'December', value: 'December' }
        )
    )
    .addIntegerOption(option =>
      option
        .setName('day')
        .setDescription('The day that the character died.')
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(24)
    )
    .addStringOption(option =>
      option
        .setName('cause')
        .setDescription('The cause of the death.')
        .setRequired(true)
    )
  ,
  async autocomplete(interaction) {
    const focusedValue = interaction.options.getFocused();

    const characters = await Characters.findAll({
      where: { name: { [Op.startsWith]: focusedValue } },
      attributes: ['name', 'id']
    });

    choices = characters.splice(0, 25).map(character => ({ name: character.name, value: character.id }));
  },
  async execute(interaction) {
    const characterId = interaction.options.getString('character');
    const year = interaction.options.getInteger('year');
    const month = interaction.options.getString('month');
    const day = interaction.options.getInteger('day');
    const cause = interaction.options.getString('cause');


  }
}