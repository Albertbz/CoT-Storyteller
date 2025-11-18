const { SlashCommandBuilder, InteractionContextType, MessageFlags, userMention, inlineCode, messageLink } = require('discord.js');
const { Players, Characters, SocialClasses, Worlds, Deceased } = require('../../dbObjects.js');
const { roles } = require('../../configs/ids.json');
const { Op } = require('sequelize');
const { postInLogChannel, addDeceasedToDatabase } = require('../../misc.js');


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
    .addUserOption(option =>
      option
        .setName('played_by')
        .setDescription('The user that played the character.')
    )
  ,
  async autocomplete(interaction) {
    const focusedValue = interaction.options.getFocused();

    const characters = await Characters.findAll({
      where: { name: { [Op.startsWith]: focusedValue } },
      attributes: ['name', 'id']
    });

    choices = characters.splice(0, 25).map(character => ({ name: character.name, value: character.id }));
    await interaction.respond(choices);
  },
  async execute(interaction) {
    const characterId = interaction.options.getString('character');
    const year = interaction.options.getInteger('year');
    const month = interaction.options.getString('month');
    const day = interaction.options.getInteger('day');
    const cause = interaction.options.getString('cause');
    const user = interaction.options.getUser('played_by');

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    try {

      let playerId = null;
      if (!user) {
        const player = await Players.findOne({ where: { characterId: characterId } })
        if (!player) return interaction.editReply({ content: 'Could not automatically find the player that played the character. Please specify them manually.', flags: MessageFlags.Ephemeral });
        playerId = player.id;
      }
      else {
        playerId = user.id
      }

      const { deceased, embed: deceasedCreatedEmbed } = await addDeceasedToDatabase(interaction.user, true, {
        characterId: characterId,
        yearOfDeath: year,
        monthOfDeath: month,
        dayOfDeath: day,
        causeOfDeath: cause,
        playedById: playerId
      });

      return interaction.editReply({ embeds: [deceasedCreatedEmbed], flags: MessageFlags.Ephemeral })
    }
    catch (error) {
      console.log(error);
      return interaction.editReply({ content: error.message, flags: MessageFlags.Ephemeral });
    }
  }
}