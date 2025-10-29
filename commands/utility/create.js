const { SlashCommandBuilder, InteractionContextType, MessageFlags, userMention, inlineCode } = require('discord.js');
const { Players, Characters, Affiliations, SocialClasses, Relationships } = require('../../dbObjects.js');
const { roles } = require('../../configs/ids.json');
const { Op } = require('sequelize');
const { addPlayerToDatabase, addCharacterToDatabase, assignCharacterToPlayer, postInLogChannel, addRelationshipToDatabase } = require('../../misc.js')


module.exports = {
  data: new SlashCommandBuilder()
    .setName('create')
    .setDescription('Create a new player or character.')
    .setContexts(InteractionContextType.Guild)
    .setDefaultMemberPermissions(0)
    .addSubcommand(subcommand =>
      subcommand
        .setName('player')
        .setDescription('Create a new player and (optionally) a character for them to play.')
        .addUserOption(option =>
          option
            .setName('user')
            .setDescription('The user of the player.')
            .setRequired(true)
        )
        .addStringOption(option =>
          option
            .setName('ign')
            .setDescription('The VS username of the player.')
            .setRequired(true)
        )
        .addStringOption(option =>
          option
            .setName('timezone')
            .setDescription('The timezone of the player.')
        )
        .addStringOption(option =>
          option
            .setName('name')
            .setDescription('The name of the character.')
        )
        .addStringOption(option =>
          option
            .setName('sex')
            .setDescription('The sex of the character.')
            .addChoices(
              { name: 'Male', value: 'Male' },
              { name: 'Female', value: 'Female' },
              { name: 'Undefined', value: 'Undefined' }
            )
        )
        .addStringOption(option =>
          option
            .setName('affiliation')
            .setDescription('The affiliation of the character.')
            .setAutocomplete(true)
        )
        .addStringOption(option =>
          option
            .setName('socialclass')
            .setDescription('The social class of the character.')
            .addChoices(
              { name: 'Commoner', value: 'Commoner' },
              { name: 'Notable', value: 'Notable' },
              { name: 'Noble', value: 'Noble' },
              { name: 'Ruler', value: 'Ruler' }
            )
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('character')
        .setDescription('Create a new character and (optionally) set it to a player.')
        .addStringOption(option =>
          option
            .setName('name')
            .setDescription('The name of the character.')
            .setRequired(true)
        )
        .addStringOption(option =>
          option
            .setName('sex')
            .setDescription('The sex of the character.')
            .addChoices(
              { name: 'Male', value: 'Male' },
              { name: 'Female', value: 'Female' },
              { name: 'Undefined', value: 'Undefined' }
            )
        )
        .addStringOption(option =>
          option
            .setName('affiliation')
            .setDescription('The affiliation of the character.')
            .setAutocomplete(true)
        )
        .addStringOption(option =>
          option
            .setName('socialclass')
            .setDescription('The social class of the character.')
            .addChoices(
              { name: 'Commoner', value: 'Commoner' },
              { name: 'Notable', value: 'Notable' },
              { name: 'Noble', value: 'Noble' },
              { name: 'Ruler', value: 'Ruler' }
            )
        )
        .addUserOption(option =>
          option
            .setName('player')
            .setDescription('The player to set the character to.')
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('relationship')
        .setDescription('Create a new relationship.')
        .addStringOption(option =>
          option
            .setName('bearingcharacter')
            .setDescription('The character bearing the offspring.')
            .setRequired(true)
            .setAutocomplete(true)
        )
        .addStringOption(option =>
          option
            .setName('conceivingcharacter')
            .setDescription('The character conceiving the offspring.')
            .setRequired(true)
            .setAutocomplete(true)
        )
        .addStringOption(option =>
          option
            .setName('committed')
            .setDescription('Whether the relationship is committed or not.')
            .setRequired(true)
            .addChoices(
              { name: 'Yes', value: 'Yes' },
              { name: 'No', value: 'No' }
            )
        )
        .addStringOption(option =>
          option
            .setName('inheritedtitle')
            .setDescription('The inherited title that offspring of this relationship will receive.')
            .addChoices(
              { name: 'Noble', value: 'Noble' },
              { name: 'None', value: 'None' }
            )
        )
    ),
  async autocomplete(interaction) {
    let choices;

    // Autocomplete for affiliations, check which option is being autocompleted
    const focusedOption = interaction.options.getFocused(true);

    if (focusedOption.name === 'affiliation') {
      const focusedValue = interaction.options.getFocused();

      const affiliations = await Affiliations.findAll({
        where: { name: { [Op.startsWith]: focusedValue }, [Op.or]: { name: 'Wanderer', isRuling: true } },
        attributes: ['name', 'id'],
        limit: 25
      });

      choices = affiliations.map(affiliation => ({ name: affiliation.name, value: affiliation.id }));
    }

    // Autocomplete for relationships
    else if (focusedOption.name === 'bearingcharacter' || focusedOption.name === 'conceivingcharacter') {
      const focusedValue = interaction.options.getFocused();

      const characters = await Characters.findAll({
        where: { name: { [Op.startsWith]: focusedValue } },
        attributes: ['name', 'id'],
        limit: 25
      });

      choices = characters.map(character => ({ name: character.name, value: character.id }));
    }

    await interaction.respond(choices);
  },
  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    if (interaction.options.getSubcommand() === 'player') {
      // For creating the player
      const user = interaction.options.getUser('user');
      const ign = interaction.options.getString('ign');
      const timezone = interaction.options.getString('timezone') ?? undefined;

      // For creating the character, if one is to be created for the player
      const name = interaction.options.getString('name');
      const sex = interaction.options.getString('sex');
      const affiliationId = interaction.options.getString('affiliation');
      const socialClassName = interaction.options.getString('socialclass');

      const creatingCharacter = name || sex || affiliationId || socialClassName;

      // Create the player
      try {
        const player = await addPlayerToDatabase(user.id, ign, timezone, interaction.user);

        const playerCreatedText =
          '**Player was created with the following information:**\n' +
          'Discord User: ' + userMention(player.id) + '\n' +
          'VS Username: ' + inlineCode(player.ign) + '\n' +
          'Timezone: ' + inlineCode(player.timezone ? player.timezone : 'Undefined') + '\n';


        // Create the character if any of the arguments were provided
        if (!creatingCharacter) return interaction.editReply({ content: playerCreatedText, flags: MessageFlags.Ephemeral });

        const character = await addCharacterToDatabase(interaction.user, { name, sex, affiliationId, socialClassName });
        await assignCharacterToPlayer(character.id, player.id, interaction.user);

        const affiliation = await Affiliations.findOne({ where: { id: affiliationId } });

        const characterCreatedText =
          '**Character was created with the following information and set as the Player\'s character:**\n' +
          'Name: ' + inlineCode(character.name) + '\n' +
          'Sex: ' + inlineCode(character.sex) + '\n' +
          'Affiliation: ' + inlineCode(affiliation.name) + '\n' +
          'Social class: ' + inlineCode(character.socialClassName) + '\n' +
          'Year of Maturity: ' + inlineCode(character.yearOfMaturity) + '\n';

        return interaction.editReply({ content: playerCreatedText + '\n\n' + characterCreatedText, flags: MessageFlags.Ephemeral });
      }
      catch (error) {
        return interaction.editReply({ content: error.message, flags: MessageFlags.Ephemeral });
      }

    }
    else if (interaction.options.getSubcommand() === 'character') {
      const name = interaction.options.getString('name');
      const sex = interaction.options.getString('sex');
      const affiliationId = interaction.options.getString('affiliation');
      const socialClassName = interaction.options.getString('socialclass');

      const user = interaction.options.getUser('player');

      const linkToUser = user !== null;

      try {
        const character = await addCharacterToDatabase(interaction.user, { name, sex, affiliationId, socialClassName });

        const affiliation = await character.getAffiliation();

        const characterCreatedText =
          '**Character was created with the following information:**\n' +
          'Name: ' + inlineCode(character.name) + '\n' +
          'Sex: ' + inlineCode(character.sex) + '\n' +
          'Affiliation: ' + inlineCode(affiliation.name) + '\n' +
          'Social class: ' + inlineCode(character.socialClassName) + '\n' +
          'Year of Maturity: ' + inlineCode(character.yearOfMaturity) + '\n'
        if (!linkToUser) return interaction.editReply({ content: characterCreatedText, flags: MessageFlags.Ephemeral });

        const playerExists = await assignCharacterToPlayer(character.id, user.id, interaction.user);

        if (!playerExists) return interaction.editReply({ content: characterCreatedText + '\n\n' + '**Attempted to assign character to the specified player, but the player was not found in the database.**', flags: MessageFlags.Ephemeral })

        return interaction.editReply({ content: characterCreatedText + '\n\n' + '**Aditionally, the character was assigned to:** ' + userMention(user.id), flags: MessageFlags.Ephemeral })
      }
      catch (error) {
        console.log(error);
        return interaction.editReply({ content: 'Something went wrong.', flags: MessageFlags.Ephemeral })
      }
    }
    else if (interaction.options.getSubcommand() === 'relationship') {
      const bearingCharacterId = interaction.options.getString('bearingcharacter');
      const conceivingCharacterId = interaction.options.getString('conceivingcharacter');
      const committed = interaction.options.getString('committed') === 'Yes';
      const inheritedTitle = interaction.options.getString('inheritedtitle') ?? 'None';

      try {
        const relationship = await addRelationshipToDatabase(interaction.user, { bearingCharacterId, conceivingCharacterId, committed, inheritedTitle });
        const bearingCharacter = await relationship.getBearingCharacter();
        const conceivingCharacter = await relationship.getConceivingCharacter();
        return interaction.editReply({ content: 'The relationship between ' + inlineCode(bearingCharacter.name) + ' and ' + inlineCode(conceivingCharacter.name) + ' was created.', flags: MessageFlags.Ephemeral });
      }
      catch (error) {
        // console.log(error);
        return interaction.editReply({ content: error.message, flags: MessageFlags.Ephemeral });
      }
    }
  }
}