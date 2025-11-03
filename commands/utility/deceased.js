const { SlashCommandBuilder, InteractionContextType, MessageFlags, userMention, inlineCode, messageLink } = require('discord.js');
const { Players, Characters, Affiliations, SocialClasses, Worlds, Deceased } = require('../../dbObjects.js');
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
      let member = null;
      let player = null;
      if (!user) {
        player = await Players.findOne({ where: { characterId: characterId } })
        if (!player) return interaction.editReply({ content: 'Could not automatically find the player that played the character. Please specify them manually.', flags: MessageFlags.Ephemeral });
        playerId = player.id;
        member = await interaction.guild.members.fetch(playerId);
      }
      else {
        playerId = user.id
      }

      const character = await Characters.findOne({ where: { id: characterId } });

      const deceased = await Deceased.create({
        characterId: characterId,
        yearOfDeath: year,
        monthOfDeath: month,
        dayOfDeath: day,
        causeOfDeath: cause,
        ageOfDeath: year - character.yearOfMaturity,
        playedById: playerId
      })

      if (player) {
        await player.setCharacter(null);
      }

      if (member) {
        await member.roles.remove([roles.commoner, roles.eshaeryn, roles.firstLanding, roles.noble, roles.notable, roles.riverhelm, roles.ruler, roles.steelbearer, roles.theBarrowlands, roles.theHeartlands, roles.velkharaan, roles.vernados, roles.wanderer])
      }

      await postInLogChannel(
        'Character made Deceased',
        '**Made deceased by: ' + userMention(interaction.user.id) + '**\n\n' +
        'Character: ' + inlineCode(character.name) + '\n\n' +
        'Date of Death: ' + inlineCode(deceased.dateOfDeath) + '\n' +
        'Age of Death: ' + inlineCode(deceased.ageOfDeath) + '\n' +
        'Cause of Death: ' + inlineCode(deceased.causeOfDeath) + '\n' +
        'Played by: ' + userMention(deceased.playedById),
        0x0000A3
      )

      return interaction.editReply({ content: 'The character ' + inlineCode(character.name) + ' has been added to the deceased characters.', flags: MessageFlags.Ephemeral })
    }
    catch (error) {
      if (error.name === 'SequelizeUniqueConstraintError') {
        return interaction.editReply({ content: 'This character is already marked as deceased.', flags: MessageFlags.Ephemeral });
      }
      console.log(error);
      return interaction.editReply({ content: 'Something went wrong with making the character deceased.', flags: MessageFlags.Ephemeral });
    }
  }
}