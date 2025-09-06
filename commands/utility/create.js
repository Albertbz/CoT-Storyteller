const { SlashCommandBuilder, InteractionContextType, MessageFlags, userMention } = require('discord.js');
const { Players, Characters, Affiliations, SocialClasses } = require('../../dbObjects.js');
const { roles } = require('../../configs/ids.json');
const { Op } = require('sequelize');
const { addPlayerToDatabase, addCharacterToDatabase, assignCharacterToPlayer } = require('../../misc.js')


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
            .addChoices(
              { name: 'Aetos', value: roles.aetos },
              { name: 'Ayrin', value: roles.ayrin },
              { name: 'Dayne', value: roles.dayne },
              { name: 'Farring', value: roles.farring },
              { name: 'Locke', value: roles.locke },
              { name: 'Merrick', value: roles.merrick },
              { name: 'Wildhart', value: roles.wildhart },
              { name: 'Wanderer', value: roles.wanderer }
            )
        )
        .addStringOption(option =>
          option
            .setName('socialclass')
            .setDescription('The social class of the character.')
            .addChoices(
              { name: 'Commoner', value: roles.commoner },
              { name: 'Notable', value: roles.notable },
              { name: 'Noble', value: roles.noble },
              { name: 'Ruler', value: roles.ruler }
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
            .addChoices(
              { name: 'Aetos', value: roles.aetos },
              { name: 'Ayrin', value: roles.ayrin },
              { name: 'Dayne', value: roles.dayne },
              { name: 'Farring', value: roles.farring },
              { name: 'Locke', value: roles.locke },
              { name: 'Merrick', value: roles.merrick },
              { name: 'Wildhart', value: roles.wildhart },
              { name: 'Wanderer', value: roles.wanderer }
            )
        )
        .addStringOption(option =>
          option
            .setName('socialclass')
            .setDescription('The social class of the character.')
            .addChoices(
              { name: 'Commoner', value: roles.commoner },
              { name: 'Notable', value: roles.notable },
              { name: 'Noble', value: roles.noble },
              { name: 'Ruler', value: roles.ruler }
            )
        )
        .addUserOption(option =>
          option
            .setName('player')
            .setDescription('The player to set the character to.')
        )
    )
  ,
  async execute(interaction) {
    if (interaction.options.getSubcommand() === 'player') {
      // For creating the player
      const user = interaction.options.getUser('user');
      const ign = interaction.options.getString('ign');
      const timezone = interaction.options.getString('timezone') ?? 'Undefined';

      // For creating the character, if one is to be created for the player
      const name = interaction.options.getString('name');
      const sex = interaction.options.getString('sex');
      const affiliationId = interaction.options.getString('affiliation');
      const socialClassId = interaction.options.getString('socialclass');

      const creatingCharacter = name || sex || affiliationId || socialClassId;

      // Create the player
      try {
        const player = await addPlayerToDatabase(user.id, ign, timezone, interaction.user);

        const playerCreatedText =
          '**Player was created with the following information:**\n' +
          'Discord User: ' + userMention(player.id) + '\n' +
          'VS Username: `' + player.ign + '`\n' +
          'Timezone: `' + player.timezone + '`';


        // Create the character if any of the arguments were provided
        if (!creatingCharacter) return interaction.reply({ content: playerCreatedText, flags: MessageFlags.Ephemeral });

        const character = await addCharacterToDatabase(name, sex, affiliationId, socialClassId, interaction.user);
        await assignCharacterToPlayer(character.id, player.id, interaction.user);

        const affiliation = await Affiliations.findOne({ where: { id: character.affiliationId } });
        const socialClass = await SocialClasses.findOne({ where: { id: character.socialClassId } });
        const characterCreatedText =
          '**Character was created with the following information and set as the Player\'s character:**\n' +
          'Name: `' + character.name + '`\n' +
          'Sex: `' + character.sex + '`\n' +
          'Affiliation: `' + affiliation.name + '`\n' +
          'Social class: `' + socialClass.name + '`\n' +
          'Year of Maturity: `' + character.yearOfMaturity + '`'
        return interaction.reply({ content: playerCreatedText + '\n\n' + characterCreatedText, flags: MessageFlags.Ephemeral });
      }
      catch (error) {
        return interaction.reply({ content: error.message, flags: MessageFlags.Ephemeral });
      }

    }
    else if (interaction.options.getSubcommand() === 'character') {
      const name = interaction.options.getString('name');
      const sex = interaction.options.getString('sex');
      const affiliationId = interaction.options.getString('affiliation');
      const socialClassId = interaction.options.getString('socialclass');

      const user = interaction.options.getUser('player');

      const linkToUser = user !== null;

      try {
        const character = await addCharacterToDatabase(name, sex, affiliationId, socialClassId, interaction.user);


        const affiliation = await Affiliations.findOne({ where: { id: character.affiliationId } });
        const socialClass = await SocialClasses.findOne({ where: { id: character.socialClassId } });
        const characterCreatedText =
          '**Character was created with the following information:**\n' +
          'Name: `' + character.name + '`\n' +
          'Sex: `' + character.sex + '`\n' +
          'Affiliation: `' + affiliation.name + '`\n' +
          'Social class: `' + socialClass.name + '`\n' +
          'Year of Maturity: `' + character.yearOfMaturity + '`'
        if (!linkToUser) return interaction.reply({ content: characterCreatedText, flags: MessageFlags.Ephemeral });

        const playerExists = await assignCharacterToPlayer(character.id, user.id, interaction.user);

        if (!playerExists) return interaction.reply({ content: characterCreatedText + '\n\n' + '**Attempted to assign character to the specified player, but the player was not found in the database.**', flags: MessageFlags.Ephemeral })

        return interaction.reply({ content: characterCreatedText + '\n\n' + '**Aditionally, the character was assigned to:** ' + userMention(user.id), flags: MessageFlags.Ephemeral })
      }
      catch (error) {
        return interaction.reply({ content: error.message, flags: MessageFlags.Ephemeral })
      }
    }

  }
}