const { SlashCommandBuilder, InteractionContextType, MessageFlags, userMention, inlineCode, EmbedBuilder } = require('discord.js');
const { Players, Characters, Regions, Houses, SocialClasses, Worlds, PlayableChildren, Relationships } = require('../../dbObjects.js');
const { Op } = require('sequelize');
const { postInLogChannel, changeCharacterInDatabase, changePlayerInDatabase, changeRegionInDatabase, changeHouseInDatabase, changePlayableChildInDatabase, changeRelationshipInDatabase, COLORS } = require('../../misc.js');


module.exports = {
  data: new SlashCommandBuilder()
    .setName('change')
    .setDescription('Change something in the Storyteller database.')
    .setContexts(InteractionContextType.Guild)
    .setDefaultMemberPermissions(0)
    .addSubcommand(subcommand =>
      subcommand
        .setName('player')
        .setDescription('Change something about a player')
        .addUserOption(option =>
          option
            .setName('user')
            .setDescription('The user of the player.')
            .setRequired(true)
        )
        .addStringOption(option =>
          option
            .setName('ign_new')
            .setDescription('The new VS username.')
        )
        .addStringOption(option =>
          option
            .setName('timezone_new')
            .setDescription('The new timezone.')
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('character')
        .setDescription('Change something about a character.')
        .addStringOption(option =>
          option
            .setName('name')
            .setDescription('The name of the character.')
            .setRequired(true)
            .setAutocomplete(true)
        )
        .addStringOption(option =>
          option
            .setName('name_new')
            .setDescription('The new name.')
        )
        .addStringOption(option =>
          option
            .setName('sex_new')
            .setDescription('The new sex.')
            .addChoices(
              { name: 'Male', value: 'Male' },
              { name: 'Female', value: 'Female' },
              { name: 'Undefined', value: 'Undefined' }
            )
        )
        .addStringOption(option =>
          option
            .setName('region_new')
            .setDescription('The new region.')
            .setAutocomplete(true)
        )
        .addStringOption(option =>
          option
            .setName('house_new')
            .setDescription('The new house.')
            .setAutocomplete(true)
        )
        .addStringOption(option =>
          option
            .setName('socialclass_new')
            .setDescription('The new social class.')
            .addChoices(
              { name: 'Commoner', value: 'Commoner' },
              { name: 'Notable', value: 'Notable' },
              { name: 'Noble', value: 'Noble' },
              { name: 'Ruler', value: 'Ruler' }
            )
        )
        .addNumberOption(option =>
          option
            .setName('yearofmaturity_new')
            .setDescription('The new Year of Maturity.')
        )
        .addNumberOption(option =>
          option
            .setName('pvedeaths_new')
            .setDescription('The new amount of PvE deaths.')
        )
        .addStringOption(option =>
          option
            .setName('role_new')
            .setDescription('The new role.')
        )
        .addStringOption(option =>
          option
            .setName('steelbearer_new')
            .setDescription('The type of steelbearer to change the character to.')
            .addChoices(
              { name: 'Ruler', value: 'Ruler' },
              { name: 'Duchy', value: 'Duchy' },
              { name: 'General-purpose', value: 'General-purpose' },
              { name: 'None', value: 'None' },
            )
        )
        .addStringOption(option =>
          option
            .setName('comments_new')
            .setDescription('The new comments.')
            .setAutocomplete(true)
        )
        .addStringOption(option =>
          option
            .setName('rollingforbastards_new')
            .setDescription('The new rolling for bastards status.')
            .addChoices(
              { name: 'Yes', value: 'Yes' },
              { name: 'No', value: 'No' }
            )
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('year')
        .setDescription('Change the current year.')
        .addNumberOption(option =>
          option
            .setName('year_new')
            .setDescription('The new year.')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('region')
        .setDescription('Change something about a region.')
        .addStringOption(option =>
          option
            .setName('name')
            .setDescription('The name of the region to change something about.')
            .setRequired(true)
            .setAutocomplete(true)
        )
        .addStringOption(option =>
          option
            .setName('rulinghouse_new')
            .setDescription('The new ruling house of the region.')
            .setAutocomplete(true)
        )
        .addStringOption(option =>
          option
            .setName('roleid_new')
            .setDescription('The new role ID of the region. This should technically never change.')
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('house')
        .setDescription('Change something about a house.')
        .addStringOption(option =>
          option
            .setName('name')
            .setDescription('The name of the house to change something about.')
            .setRequired(true)
            .setAutocomplete(true)
        )
        .addStringOption(option =>
          option
            .setName('name_new')
            .setDescription('The new name of the house.')
        )
        .addStringOption(option =>
          option
            .setName('emojiname_new')
            .setDescription('The new emoji name of the house.')
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('child')
        .setDescription('Change something about a playable child.')
        .addStringOption(option =>
          option
            .setName('name')
            .setDescription('The name of the child.')
            .setRequired(true)
            .setAutocomplete(true)
        )
        .addStringOption(option =>
          option
            .setName('name_new')
            .setDescription('The new name of the child.')
        )
        .addIntegerOption(option =>
          option
            .setName('yearofmaturity_new')
            .setDescription('The new year of maturity of the child.')
        )
        .addStringOption(option =>
          option
            .setName('sex_new')
            .setDescription('The new sex of the child.')
            .addChoices(
              { name: 'Male', value: 'Male' },
              { name: 'Female', value: 'Female' }
            )
        )
        .addStringOption(option =>
          option
            .setName('region_new')
            .setDescription('The new region of the child.')
            .setAutocomplete(true)
        )
        .addStringOption(option =>
          option
            .setName('house_new')
            .setDescription('The new house of the child.')
            .setAutocomplete(true)
        )
        .addStringOption(option =>
          option
            .setName('legitimacy_new')
            .setDescription('The new legitimacy of the child.')
            .addChoices(
              { name: 'Illegitimate', value: 'Illegitimate' },
              { name: 'Legitimate', value: 'Legitimate' },
              { name: 'Legitimised', value: 'Legitimised' }
            )
        )
        .addStringOption(option =>
          option
            .setName('inheritedtitle_new')
            .setDescription('The new inherited title of the child.')
            .addChoices(
              { name: 'None', value: 'None' },
              { name: 'Noble', value: 'Noble' }
            )
        )
        .addStringOption(option =>
          option
            .setName('comments_new')
            .setDescription('The new comments of the child.')
            .setAutocomplete(true)
        )
        .addUserOption(option =>
          option
            .setName('contact1_new')
            .setDescription('The new first contact of the child.')
        )
        .addUserOption(option =>
          option
            .setName('contact2_new')
            .setDescription('The new second contact of the child.')
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('relationship')
        .setDescription('Change something about a relationship.')
        .addStringOption(option =>
          option
            .setName('relationship')
            .setDescription('The relationship to change something about.')
            .setRequired(true)
            .setAutocomplete(true)
        )
        .addStringOption(option =>
          option
            .setName('committed_new')
            .setDescription('The new committed status of the relationship.')
            .addChoices(
              { name: 'Yes', value: 'Yes' },
              { name: 'No', value: 'No' }
            )
        )
        .addStringOption(option =>
          option
            .setName('inheritedtitle_new')
            .setDescription('The new inherited title for offspring of the relationship.')
            .addChoices(
              { name: 'None', value: 'None' },
              { name: 'Noble', value: 'Noble' }
            )
        )
    ),
  async autocomplete(interaction) {
    let choices;
    const subcommand = interaction.options.getSubcommand();

    // Handle autocompletes for character subcommand
    if (subcommand === 'character') {
      const focusedOption = interaction.options.getFocused(true);

      if (focusedOption.name === 'name') {
        const focusedValue = interaction.options.getFocused();

        const characters = await Characters.findAll({
          where: { name: { [Op.startsWith]: focusedValue } },
          attributes: ['name', 'id'],
          limit: 25
        });

        choices = characters.map(character => ({ name: character.name, value: character.id }));
      }

      if (focusedOption.name === 'region_new') {
        const focusedValue = interaction.options.getFocused();

        const regions = await Regions.findAll({
          where: { name: { [Op.startsWith]: focusedValue } },
          attributes: ['name', 'id'],
          limit: 25
        });

        choices = regions.map(region => ({ name: region.name, value: region.id }));
      }

      if (focusedOption.name === 'house_new') {
        const focusedValue = interaction.options.getFocused();

        const houses = await Houses.findAll({
          where: { name: { [Op.startsWith]: focusedValue } },
          attributes: ['name', 'id'],
          limit: 25
        });

        choices = houses.map(house => ({ name: house.name, value: house.id }));
      }

      if (focusedOption.name === 'comments_new') {
        // Get the character to fetch current comments from
        const characterId = interaction.options.getString('name');
        const character = await Characters.findOne({
          where: { id: characterId }
        });

        const currentComments = character ? character.comments : '';

        // If no input yet, suggest current comments
        // Otherwise, suggest the input
        const focusedValue = interaction.options.getFocused();
        if (focusedValue.length > 0) {
          choices = [
            { name: focusedValue, value: focusedValue }
          ];
        }
        else {
          if (currentComments) {
            choices = [
              { name: currentComments ?? '', value: currentComments ?? '' }
            ];
          }
          else {
            choices = [];
          }
        }
      }
    }

    // Handle autocompletes for region subcommand
    if (subcommand === 'region') {
      const focusedOption = interaction.options.getFocused(true);

      if (focusedOption.name === 'name') {
        const focusedValue = interaction.options.getFocused();

        const regions = await Regions.findAll({
          where: { name: { [Op.startsWith]: focusedValue } },
          attributes: ['name', 'id'],
          limit: 25
        })

        choices = regions.map(region => ({ name: region.name, value: region.id }));
      }
      else if (focusedOption.name === 'rulinghouse_new') {
        const focusedValue = interaction.options.getFocused();

        const houses = await Houses.findAll({
          where: { name: { [Op.startsWith]: focusedValue } },
          attributes: ['name', 'id'],
          limit: 25
        })

        choices = houses.map(house => ({ name: house.name, value: house.id }));
      }
    }

    // Handle autocompletes for house subcommand
    if (subcommand === 'house') {
      const focusedValue = interaction.options.getFocused();
      const houses = await Houses.findAll({
        where: { name: { [Op.startsWith]: focusedValue } },
        attributes: ['name', 'id'],
        limit: 25
      });
      choices = houses.map(house => ({ name: house.name, value: house.id }));
    }

    // Handle autocompletes for child subcommand
    if (subcommand === 'child') {
      const focusedOption = interaction.options.getFocused(true);

      if (focusedOption.name === 'name') {
        const focusedValue = interaction.options.getFocused();

        const children = await PlayableChildren.findAll({
          include: {
            model: Characters, as: 'character',
            include: [
              { model: Characters, as: 'parent1' },
              { model: Characters, as: 'parent2' }
            ],
            where: { name: { [Op.startsWith]: focusedValue } },
          },
          attributes: ['id'],
          limit: 25
        });

        choices = children.map(child => {
          const parentNames = []
          parentNames.push(child.character.parent1.name)

          if (child.character.parent2) {
            parentNames.push(child.character.parent2.name.substring(0, 30))
          }

          return ({
            name: (child.character.name.substring(0, 30) + ' | ' + parentNames.join(' & ')),
            value: child.id
          })
        }
        );
      }
      else if (focusedOption.name === 'region_new') {
        const focusedValue = interaction.options.getFocused();

        const regions = await Regions.findAll({
          where: { name: { [Op.startsWith]: focusedValue } },
          attributes: ['name', 'id'],
          limit: 25
        })

        choices = regions.map(region => ({ name: region.name, value: region.id }));
      }
      else if (focusedOption.name === 'house_new') {
        const focusedValue = interaction.options.getFocused();

        const houses = await Houses.findAll({
          where: { name: { [Op.startsWith]: focusedValue } },
          attributes: ['name', 'id'],
          limit: 25
        });

        choices = houses.map(house => ({ name: house.name, value: house.id }));
      }
      else if (focusedOption.name === 'comments_new') {
        // Get the child to fetch current comments from
        const childCharacterId = interaction.options.getString('name');
        const childCharacter = await PlayableChildren.findOne({
          where: { id: childCharacterId }
        });

        const currentComments = childCharacter ? childCharacter.comments : '';

        // If no input yet, suggest current comments
        // Otherwise, suggest the input
        const focusedValue = interaction.options.getFocused();
        if (focusedValue.length > 0) {
          choices = [
            { name: focusedValue, value: focusedValue }
          ];
        }
        else {
          if (currentComments) {
            choices = [
              { name: currentComments ?? '', value: currentComments ?? '' }
            ];
          }
          else {
            choices = [];
          }
        }
      }
    }

    // Handle autocompletes for relationship subcommand
    if (subcommand === 'relationship') {
      const focusedValue = interaction.options.getFocused();

      // Find relationships where the focused character name is a parent
      const relationships = await Relationships.findAll({
        include: [
          { model: Characters, as: 'bearingCharacter' },
          { model: Characters, as: 'conceivingCharacter' }
        ],
        where: {
          [Op.or]: [
            { '$bearingCharacter.name$': { [Op.startsWith]: `%${focusedValue}%` } },
            { '$conceivingCharacter.name$': { [Op.startsWith]: `%${focusedValue}%` } }
          ]
        },
        limit: 25
      });

      choices = relationships.map(rel => {
        const bearingCharacterName = rel.bearingCharacter ? rel.bearingCharacter.name : 'Unknown';
        const conceivingCharacterName = rel.conceivingCharacter ? rel.conceivingCharacter.name : 'Unknown';
        return {
          name: `${bearingCharacterName} & ${conceivingCharacterName}`,
          value: rel.id
        };
      });
    }


    await interaction.respond(choices);
  },



  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const subcommand = interaction.options.getSubcommand();

    /**
     * Handle changing player info
     */
    if (subcommand === 'player') {
      const user = interaction.options.getUser('user');
      const newIgn = interaction.options.getString('ign_new');
      const newTimezone = interaction.options.getString('timezone_new');

      const toUpdate = {};
      if (newIgn) toUpdate.newIgn = newIgn;
      if (newTimezone) toUpdate.newTimezone = newTimezone;

      const player = await Players.findByPk(user.id);

      try {
        const { player: updatedPlayer, embed: playerChangedEmbed } = await changePlayerInDatabase(interaction.user, player, toUpdate);
        return interaction.editReply({ embeds: [playerChangedEmbed], flags: MessageFlags.Ephemeral });
      }
      catch (error) {
        console.log(error);
        const playerNotChangedEmbed = new EmbedBuilder()
          .setTitle('Player Not Changed')
          .setDescription(`An error occured while trying to change the player: ${error.message}`)
          .setColor(COLORS.RED);
        return interaction.editReply({ embeds: [playerNotChangedEmbed], flags: MessageFlags.Ephemeral });
      }
    }

    /**
     * Handle changing character info
     */
    if (subcommand === 'character') {
      const characterId = interaction.options.getString('name');
      const newName = interaction.options.getString('name_new');
      const newSex = interaction.options.getString('sex_new');
      const newRegionId = interaction.options.getString('region_new');
      const newHouseId = interaction.options.getString('house_new');
      const newSocialClassName = interaction.options.getString('socialclass_new');
      const newYearOfMaturity = interaction.options.getNumber('yearofmaturity_new');
      const newPveDeaths = interaction.options.getNumber('pvedeaths_new');
      const newRole = interaction.options.getString('role_new');
      const newSteelbearerState = interaction.options.getString('steelbearer_new');
      const newComments = interaction.options.getString('comments_new');
      const newIsRollingForBastards = interaction.options.getString('rollingforbastards_new') === 'Yes' ? true : (interaction.options.getString('rollingforbastards_new') === 'No' ? false : null);

      const character = await Characters.findByPk(characterId);

      try {
        const { character: updatedCharacter, embed: characterChangedEmbed } = await changeCharacterInDatabase(interaction.user, character, true, {
          newName: newName,
          newSex: newSex,
          newRegionId: newRegionId,
          newHouseId: newHouseId,
          newSocialClassName: newSocialClassName,
          newYearOfMaturity: newYearOfMaturity,
          newPveDeaths: newPveDeaths,
          newRole: newRole,
          newSteelbearerState: newSteelbearerState,
          newComments: newComments,
          newIsRollingForBastards: newIsRollingForBastards
        })

        return interaction.editReply({ embeds: [characterChangedEmbed], flags: MessageFlags.Ephemeral });
      }
      catch (error) {
        console.log(error);
        const characterNotChangedEmbed = new EmbedBuilder()
          .setTitle('Character Not Changed')
          .setDescription(`An error occured while trying to change the character: ${error.message}`)
          .setColor(COLORS.RED);
        return interaction.editReply({ embeds: [characterNotChangedEmbed], flags: MessageFlags.Ephemeral });
      }
    }

    /**
     * Handle changing current year
     */
    if (subcommand === 'year') {
      const newYear = interaction.options.getNumber('year_new');

      const world = await Worlds.findOne({ where: { name: 'Elstrand' } });

      const oldYear = world.currentYear;
      await world.update({ currentYear: newYear });

      await postInLogChannel(
        'Current Year Changed',
        '**Changed by:** ' + userMention(interaction.user.id) + '\n\n' +
        'Year: ' + inlineCode(oldYear) + ' -> ' + inlineCode(newYear),
        COLORS.ORANGE
      )

      // Make embed to return
      const yearChangedEmbed = new EmbedBuilder()
        .setTitle('Current Year Changed')
        .setDescription(`**Year**: ${oldYear} -> ${newYear}`)
        .setColor(COLORS.ORANGE)

      return interaction.editReply({ embeds: [yearChangedEmbed], flags: MessageFlags.Ephemeral });
    }

    /**
     * Handle changing region info
     */
    if (subcommand === 'region') {
      const regionId = interaction.options.getString('name');
      const newRulingHouseId = interaction.options.getString('rulinghouse_new');
      const newRoleId = interaction.options.getString('roleid_new');

      const region = await Regions.findByPk(regionId);

      if (!region) {
        return interaction.editReply({ content: 'The specified region does not exist in the database.', flags: MessageFlags.Ephemeral });
      }

      try {
        const { region: updatedRegion, embed: regionChangedEmbed } = await changeRegionInDatabase(interaction.user, region, {
          newRoleId: newRoleId,
          newRulingHouseId: newRulingHouseId
        });
        return interaction.editReply({ embeds: [regionChangedEmbed], flags: MessageFlags.Ephemeral });
      }
      catch (error) {
        console.log(error);
        const regionNotChangedEmbed = new EmbedBuilder()
          .setTitle('Region Not Changed')
          .setDescription(`An error occurred while trying to change the region: ${error.message}`)
          .setColor(COLORS.RED);
        return interaction.editReply({ embeds: [regionNotChangedEmbed], flags: MessageFlags.Ephemeral });
      }
    }


    /**
     * Handle changing house info
     */
    if (subcommand === 'house') {
      const houseId = interaction.options.getString('name');
      const newName = interaction.options.getString('name_new');
      const newEmojiName = interaction.options.getString('emojiname_new');

      const house = await Houses.findByPk(houseId);

      try {
        const { house: updatedHouse, embed: houseChangedEmbed } = await changeHouseInDatabase(interaction.user, house, {
          newName: newName,
          newEmojiName: newEmojiName
        });
        return interaction.editReply({ embeds: [houseChangedEmbed], flags: MessageFlags.Ephemeral });
      }
      catch (error) {
        console.log(error);
        const houseNotChangedEmbed = new EmbedBuilder()
          .setTitle('House Not Changed')
          .setDescription(`An error occurred while trying to change the house: ${error.message}`)
          .setColor(COLORS.RED);
        return interaction.editReply({ embeds: [houseNotChangedEmbed], flags: MessageFlags.Ephemeral });
      }
    }

    /**
     * Handle changing playable child info
     */
    if (subcommand === 'child') {
      const playableChildId = interaction.options.getString('name');
      const newName = interaction.options.getString('name_new');
      const newYearOfMaturity = interaction.options.getInteger('yearofmaturity_new');
      const newSex = interaction.options.getString('sex_new');
      const newRegionId = interaction.options.getString('region_new');
      const newHouseId = interaction.options.getString('house_new');
      const newLegitimacy = interaction.options.getString('legitimacy_new');
      const newInheritedTitle = interaction.options.getString('inheritedtitle_new');
      const newComments = interaction.options.getString('comments_new');
      const newContact1 = interaction.options.getUser('contact1_new');
      const newContact2 = interaction.options.getUser('contact2_new');

      const playableChild = await PlayableChildren.findByPk(playableChildId);

      const embeds = [];
      try {
        const character = await playableChild.getCharacter();
        const { character: updatedCharacter, embed: characterChangedEmbed } = await changeCharacterInDatabase(interaction.user, await playableChild.getCharacter(), true, {
          newName: newName,
          newSex: newSex,
          newYearOfMaturity: newYearOfMaturity,
          newRegionId: newRegionId,
          newHouseId: newHouseId,
          newSocialClassName: newInheritedTitle !== null ? newInheritedTitle === 'Noble' ? 'Noble' : 'Notable' : null,
        });
        embeds.push(characterChangedEmbed);
      }
      catch (error) {
        console.log(error);
        const characterNotChangedEmbed = new EmbedBuilder()
          .setTitle('Character Not Changed')
          .setDescription(`An error occurred while trying to change the character: ${error.message}`)
          .setColor(COLORS.RED);
        embeds.push(characterNotChangedEmbed);
      }

      try {
        const { playableChild: updatedPlayableChild, embed: playableChildChangedEmbed } = await changePlayableChildInDatabase(interaction.user, playableChild, {
          newLegitimacy: newLegitimacy,
          newComments: newComments,
          newContact1Snowflake: newContact1 ? newContact1.id : null,
          newContact2Snowflake: newContact2 ? newContact2.id : null
        });
        embeds.push(playableChildChangedEmbed);
      }
      catch (error) {
        console.log(error);
        const playableChildNotChangedEmbed = new EmbedBuilder()
          .setTitle('Playable Child Not Changed')
          .setDescription(`An error occurred while trying to change the playable child: ${error.message}`)
          .setColor(COLORS.RED);
        embeds.push(playableChildNotChangedEmbed);
      }

      return interaction.editReply({ embeds: embeds, flags: MessageFlags.Ephemeral });
    }

    /**
     * Handle changing relationship info
     */
    if (subcommand === 'relationship') {
      const relationshipId = interaction.options.getString('relationship');
      const newCommitted = interaction.options.getString('committed_new');
      const newInheritedTitle = interaction.options.getString('inheritedtitle_new');

      const relationship = await Relationships.findByPk(relationshipId);

      try {
        const { relationship: updatedRelationship, embed: relationshipChangedEmbed } = await changeRelationshipInDatabase(interaction.user, relationship, {
          newIsCommitted: newCommitted === null ? null : (newCommitted === 'Yes' ? true : false),
          newInheritedTitle: newInheritedTitle
        });
        return interaction.editReply({ embeds: [relationshipChangedEmbed], flags: MessageFlags.Ephemeral });
      }
      catch (error) {
        console.log(error);
        const relationshipNotChangedEmbed = new EmbedBuilder()
          .setTitle('Relationship Not Changed')
          .setDescription(`An error occurred while trying to change the relationship: ${error.message}`)
          .setColor(COLORS.RED);
        return interaction.editReply({ embeds: [relationshipNotChangedEmbed], flags: MessageFlags.Ephemeral });
      }

      // const relationship = await Relationships.findOne({
      //   include: [
      //     { model: Characters, as: 'bearingCharacter' },
      //     { model: Characters, as: 'conceivingCharacter' }
      //   ],
      //   where: { id: relationshipId }
      // });

      const changes = []

      if (newCommitted) {
        const oldCommitted = relationship.isCommitted ? 'Yes' : 'No';
        const committedValue = newCommitted === 'Yes' ? true : false;
        await relationship.update({ isCommitted: committedValue });

        changes.push('Committed: ' + inlineCode(oldCommitted) + ' -> ' + inlineCode(newCommitted));
      }

      if (newInheritedTitle) {
        const oldInheritedTitle = relationship.inheritedTitle ? relationship.inheritedTitle : 'None';
        const inheritedTitleValue = newInheritedTitle === 'None' ? null : newInheritedTitle;
        await relationship.update({ inheritedTitle: inheritedTitleValue });

        changes.push('Inherited Title: ' + inlineCode(oldInheritedTitle) + ' -> ' + inlineCode(newInheritedTitle));
      }

      if (changes.length === 0) {
        return interaction.editReply({ content: 'Please specify what to change.', flags: MessageFlags.Ephemeral });
      }

      await postInLogChannel(
        'Relationship Changed',
        '**Changed by:** ' + userMention(interaction.user.id) + '\n\n' +
        'Relationship: ' + inlineCode(relationship.bearingCharacter.name + ' & ' + relationship.conceivingCharacter.name) + '\n\n' +
        changes.join('\n'),
        0xD98C00
      )

      changes.unshift('**The following was changed for the relationship between ' + inlineCode(relationship.bearingCharacter.name + ' & ' + relationship.conceivingCharacter.name) + ':**');
      return interaction.editReply({ content: changes.join('\n'), flags: MessageFlags.Ephemeral });
    }



    return interaction.editReply({ content: 'Hmm, whatever you just did shouldn\'t be possible. What did you do?', flags: MessageFlags.Ephemeral })
  }
}