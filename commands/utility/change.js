const { SlashCommandBuilder, InteractionContextType, MessageFlags, userMention, inlineCode, EmbedBuilder, ContainerBuilder, TextDisplayBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, Client } = require('discord.js');
const { Players, Characters, Regions, Houses, SocialClasses, Worlds, PlayableChildren, Relationships, Deceased, Duchies } = require('../../dbObjects.js');
const { Op } = require('sequelize');
const { postInLogChannel, changeCharacterInDatabase, changePlayerInDatabase, changeRegionInDatabase, changeHouseInDatabase, changePlayableChildInDatabase, changeRelationshipInDatabase, COLORS, changeDuchyInDatabase, changeDeceasedInDatabase, changeSocialClassInDatabase, changeWorldInDatabase } = require('../../misc.js');
const { WANDERER_REGION_ID, WORLD_ID } = require('../../constants.js');

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
            .setName('gamertag_new')
            .setDescription('The new gamertag.')
            .setMaxLength(20)
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
            .setName('title_new')
            .setDescription('The new title.')
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
            .setName('yearofcreation_new')
            .setDescription('The new Year of Creation.')
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
        .addStringOption(option =>
          option
            .setName('parent1_new')
            .setDescription('The new first parent.')
            .setAutocomplete(true)
        )
        .addStringOption(option =>
          option
            .setName('parent2_new')
            .setDescription('The new second parent.')
            .setAutocomplete(true)
        )
        .addBooleanOption(option =>
          option
            .setName('forcechange')
            .setDescription('Force the change even if it may cause issues.')
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('world')
        .setDescription('Change something about the world.')
        .addStringOption(option =>
          option
            .setName('name_new')
            .setDescription('The new name of the world.')
        )
        .addIntegerOption(option =>
          option
            .setName('currentyear_new')
            .setDescription('The new current year of the world.')
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('region')
        .setDescription('Change something about a region.')
        .addStringOption(option =>
          option
            .setName('region')
            .setDescription('The region to change something about.')
            .setRequired(true)
            .setAutocomplete(true)
        )
        .addStringOption(option =>
          option
            .setName('name_new')
            .setDescription('The new name of the region.')
        )
        .addStringOption(option =>
          option
            .setName('rulinghouse_new')
            .setDescription('The new ruling house of the region.')
            .setAutocomplete(true)
        )
        .addRoleOption(option =>
          option
            .setName('role_new')
            .setDescription('The new role that is given to characters in the region.')
        )
        .addStringOption(option =>
          option
            .setName('role1_new')
            .setDescription('The first role that the region is in need of.')
            .addChoices(
              { name: 'None', value: 'None' },
              { name: 'Smiths', value: 'Smiths' },
              { name: 'Builders', value: 'Builders' },
              { name: 'Cooks', value: 'Cooks' },
              { name: 'Lumberjacks', value: 'Lumberjacks' },
              { name: 'Soldiers', value: 'Soldiers' },
              { name: 'Potters', value: 'Potters' },
              { name: 'Miners', value: 'Miners' },
              { name: 'Carpenters', value: 'Carpenters' },
              { name: 'Tailors', value: 'Tailors' },
              { name: 'Healears', value: 'Healers' },
              { name: 'Farmers', value: 'Farmers' },
              { name: 'Hunters', value: 'Hunters' },
              { name: 'Clockmakers', value: 'Clockmakers' }
            )
        )
        .addStringOption(option =>
          option
            .setName('role2_new')
            .setDescription('The second role that the region is in need of.')
            .addChoices(
              { name: 'None', value: 'None' },
              { name: 'Smiths', value: 'Smiths' },
              { name: 'Builders', value: 'Builders' },
              { name: 'Cooks', value: 'Cooks' },
              { name: 'Lumberjacks', value: 'Lumberjacks' },
              { name: 'Soldiers', value: 'Soldiers' },
              { name: 'Potters', value: 'Potters' },
              { name: 'Miners', value: 'Miners' },
              { name: 'Carpenters', value: 'Carpenters' },
              { name: 'Tailors', value: 'Tailors' },
              { name: 'Healears', value: 'Healers' },
              { name: 'Farmers', value: 'Farmers' },
              { name: 'Hunters', value: 'Hunters' },
              { name: 'Clockmakers', value: 'Clockmakers' }
            )
        )
        .addStringOption(option =>
          option
            .setName('role3_new')
            .setDescription('The third role that the region is in need of.')
            .addChoices(
              { name: 'None', value: 'None' },
              { name: 'Smiths', value: 'Smiths' },
              { name: 'Builders', value: 'Builders' },
              { name: 'Cooks', value: 'Cooks' },
              { name: 'Lumberjacks', value: 'Lumberjacks' },
              { name: 'Soldiers', value: 'Soldiers' },
              { name: 'Potters', value: 'Potters' },
              { name: 'Miners', value: 'Miners' },
              { name: 'Carpenters', value: 'Carpenters' },
              { name: 'Tailors', value: 'Tailors' },
              { name: 'Healears', value: 'Healers' },
              { name: 'Farmers', value: 'Farmers' },
              { name: 'Hunters', value: 'Hunters' },
              { name: 'Clockmakers', value: 'Clockmakers' }
            )
        )
        .addChannelOption(option =>
          option
            .setName('generalchannel_new')
            .setDescription('The new general channel for the region.')
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
        .addStringOption(option =>
          option
            .setName('parent1_new')
            .setDescription('The new first parent.')
            .setAutocomplete(true)
        )
        .addStringOption(option =>
          option
            .setName('parent2_new')
            .setDescription('The new second parent.')
            .setAutocomplete(true)
        )
        .addStringOption(option =>
          option
            .setName('hidden_new')
            .setDescription('The new hidden status of the child.')
            .addChoices(
              { name: 'Yes', value: 'Yes' },
              { name: 'No', value: 'No' }
            )
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
        .addStringOption(option =>
          option
            .setName('bearingcharacter_new')
            .setDescription('The new bearing character for the relationship.')
            .setAutocomplete(true)
        )
        .addStringOption(option =>
          option
            .setName('conceivingcharacter_new')
            .setDescription('The new conceiving character for the relationship.')
            .setAutocomplete(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('deathrolls')
        .setDescription('Change a death roll for a character.')
        .addStringOption(option =>
          option
            .setName('character')
            .setDescription('The character whose death roll to change.')
            .setRequired(true)
            .setAutocomplete(true)
        )
        .addIntegerOption(option =>
          option
            .setName('deathroll1_new')
            .setDescription('The new first death roll.')
        )
        .addIntegerOption(option =>
          option
            .setName('deathroll2_new')
            .setDescription('The new second death roll.')
        )
        .addIntegerOption(option =>
          option
            .setName('deathroll3_new')
            .setDescription('The new third death roll.')
        )
        .addIntegerOption(option =>
          option
            .setName('deathroll4_new')
            .setDescription('The new fourth death roll.')
        )
        .addIntegerOption(option =>
          option
            .setName('deathroll5_new')
            .setDescription('The new fifth death roll.')
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('duchy')
        .setDescription('Change something about a duchy.')
        .addStringOption(option =>
          option
            .setName('duchy')
            .setDescription('The duchy to change something about.')
            .setRequired(true)
            .setAutocomplete(true)
        )
        .addStringOption(option =>
          option
            .setName('name_new')
            .setDescription('The new name of the duchy.')
        )
        .addStringOption(option =>
          option
            .setName('region_new')
            .setDescription('The new region of the duchy.')
            .setAutocomplete(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('deceased')
        .setDescription('Change something about a deceased entry for a character.')
        .addStringOption(option =>
          option
            .setName('character')
            .setDescription('The character whose deceased entry to change.')
            .setRequired(true)
            .setAutocomplete(true)
        )
        .addIntegerOption(option =>
          option
            .setName('yearofdeath_new')
            .setDescription('The new year of death.')
        )
        .addStringOption(option =>
          option
            .setName('monthofdeath_new')
            .setDescription('The new month of death.')
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
            .setName('dayofdeath_new')
            .setDescription('The new day of death.')
            .setMinValue(1)
            .setMaxValue(24)
        )
        .addStringOption(option =>
          option
            .setName('causeofdeath_new')
            .setDescription('The new cause of death.')
        )
        .addUserOption(option =>
          option
            .setName('playedby_new')
            .setDescription('The new player who played the character.')
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('socialclass')
        .setDescription('Change something about a social class.')
        .addStringOption(option =>
          option
            .setName('socialclass')
            .setDescription('The social class to change something about.')
            .setRequired(true)
            .setAutocomplete(true)
        )
        .addRoleOption(option =>
          option
            .setName('role_new')
            .setDescription('The new role for the social class.')
        )
    )
  ,
  async autocomplete(interaction) {
    let choices = [];
    const subcommand = interaction.options.getSubcommand();

    // Handle autocompletes for character subcommand
    if (subcommand === 'character') {
      const focusedOption = interaction.options.getFocused(true);

      if (focusedOption.name === 'name' || focusedOption.name === 'parent1_new' || focusedOption.name === 'parent2_new') {
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

      if (focusedOption.name === 'region') {
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
          if (child.character.parent1) {
            parentNames.push(child.character.parent1.name.substring(0, 30));
          }

          if (child.character.parent2) {
            parentNames.push(child.character.parent2.name.substring(0, 30));
          }

          return ({
            name: (child.character.name.substring(0, 30) + ' | ' + (parentNames.join(' & ') || 'Unknown Parents')),
            value: child.id
          })
        }
        );
      }
      if (focusedOption.name === 'parent1_new' || focusedOption.name === 'parent2_new') {
        const focusedValue = interaction.options.getFocused();

        const characters = await Characters.findAll({
          where: { name: { [Op.startsWith]: focusedValue } },
          attributes: ['name', 'id'],
          limit: 25
        });

        choices = characters.map(character => ({ name: character.name, value: character.id }));
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

      const focusedOption = interaction.options.getFocused(true);

      if (focusedOption.name === 'relationship') {
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
      else if (focusedOption.name === 'bearingcharacter_new' || focusedOption.name === 'conceivingcharacter_new') {
        const characters = await Characters.findAll({
          where: { name: { [Op.startsWith]: focusedValue } },
          attributes: ['name', 'id'],
          limit: 25
        });

        choices = characters.map(character => ({ name: character.name, value: character.id }));
      }

    }

    // Handle autocompletes for deathrolls subcommand
    if (subcommand === 'deathrolls') {
      const focusedValue = interaction.options.getFocused();

      const characters = await Characters.findAll({
        where: { name: { [Op.startsWith]: focusedValue } },
        attributes: ['name', 'id'],
        limit: 25
      });

      choices = characters.map(character => ({ name: character.name, value: character.id }));
    }

    // Handle autocompletes for duchy subcommand
    if (subcommand === 'duchy') {
      const focusedOption = interaction.options.getFocused(true);
      const focusedValue = interaction.options.getFocused();

      // Handle autocomplete for duchy name
      if (focusedOption.name === 'duchy') {

        const duchies = await Duchies.findAll({
          where: { name: { [Op.startsWith]: focusedValue } },
          include: { model: Regions, as: 'region' },
          attributes: ['name', 'id'],
          limit: 25
        });

        for (const duchy of duchies) {
          choices.push({ name: duchy.name + ` (${duchy.region ? duchy.region.name : 'Unknown Region'})`, value: duchy.id });
        }
      }

      // Handle autocomplete for duchy region
      if (focusedOption.name === 'region_new') {
        const regions = await Regions.findAll({
          where: { name: { [Op.startsWith]: focusedValue } },
          attributes: ['name', 'id'],
          limit: 25
        });

        choices = regions.map(region => ({ name: region.name, value: region.id }));
      }
    }

    // Handle autocompletes for deceased subcommand
    if (subcommand === 'deceased') {
      const focusedValue = interaction.options.getFocused();
      const characters = await Deceased.findAll({
        include: { model: Characters, as: 'character' },
        where: { '$character.name$': { [Op.startsWith]: focusedValue } },
        limit: 25
      });

      choices = characters.map(deceased => ({ name: deceased.character ? deceased.character.name : 'Unknown', value: deceased.id }));
    }

    if (subcommand === 'socialclass') {
      const focusedValue = interaction.options.getFocused();

      const socialClasses = await SocialClasses.findAll({
        where: { name: { [Op.startsWith]: focusedValue } },
        attributes: ['name', 'roleId'],
        limit: 25
      });

      choices = socialClasses.map(socialClass => ({ name: socialClass.name, value: socialClass.name }));
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
      const newGamertag = interaction.options.getString('gamertag_new');
      const newTimezone = interaction.options.getString('timezone_new');

      const toUpdate = {};
      if (newIgn) toUpdate.newIgn = newIgn;
      if (newGamertag) toUpdate.newGamertag = newGamertag;
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
      const newTitle = interaction.options.getString('title_new');
      const newSex = interaction.options.getString('sex_new');
      const newRegionId = interaction.options.getString('region_new');
      const newHouseId = interaction.options.getString('house_new');
      const newSocialClassName = interaction.options.getString('socialclass_new');
      const newYearOfMaturity = interaction.options.getNumber('yearofmaturity_new');
      const newYearOfCreation = interaction.options.getNumber('yearofcreation_new');
      const newPveDeaths = interaction.options.getNumber('pvedeaths_new');
      const newRole = interaction.options.getString('role_new');
      const newComments = interaction.options.getString('comments_new');
      const newIsRollingForBastards = interaction.options.getString('rollingforbastards_new') === null ? null : (interaction.options.getString('rollingforbastards_new') === 'Yes' ? true : false);
      const newParent1Id = interaction.options.getString('parent1_new');
      const newParent2Id = interaction.options.getString('parent2_new');
      const forceChange = interaction.options.getBoolean('forcechange') || false;

      const character = await Characters.findByPk(characterId);

      try {
        const { character: updatedCharacter, embed: characterChangedEmbed } = await changeCharacterInDatabase(interaction.user, character, true, {
          newName: newName,
          newTitle: newTitle,
          newSex: newSex,
          newRegionId: newRegionId,
          newHouseId: newHouseId,
          newSocialClassName: newSocialClassName,
          newYearOfMaturity: newYearOfMaturity,
          newYearOfCreation: newYearOfCreation,
          newPveDeaths: newPveDeaths,
          newRole: newRole,
          newComments: newComments,
          newIsRollingForBastards: newIsRollingForBastards,
          newParent1Id: newParent1Id,
          newParent2Id: newParent2Id,
          forceChange: forceChange
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
     * Handle changing world info
     */
    if (subcommand === 'world') {
      const newName = interaction.options.getString('name_new');
      const newCurrentYear = interaction.options.getInteger('currentyear_new');

      const world = await Worlds.findByPk(WORLD_ID);

      try {
        const { world: updatedWorld, embeds: embeds } = await changeWorldInDatabase(interaction.user, world, {
          newName: newName,
          newCurrentYear: newCurrentYear
        });
        return interaction.editReply({ embeds: embeds, flags: MessageFlags.Ephemeral });
      }
      catch (error) {
        console.log(error);
        const worldNotChangedEmbed = new EmbedBuilder()
          .setTitle('World Not Changed')
          .setDescription(`An error occured while trying to change the world: ${error.message}`)
          .setColor(COLORS.RED);
        return interaction.editReply({ embeds: [worldNotChangedEmbed], flags: MessageFlags.Ephemeral });
      }
    }

    /**
     * Handle changing region info
     */
    if (subcommand === 'region') {
      const regionId = interaction.options.getString('region');
      const newName = interaction.options.getString('name_new');
      const newRulingHouseId = interaction.options.getString('rulinghouse_new');
      const newRole = interaction.options.getRole('role_new');
      const newRole1 = interaction.options.getString('role1_new');
      const newRole2 = interaction.options.getString('role2_new');
      const newRole3 = interaction.options.getString('role3_new');
      const newGeneralChannel = interaction.options.getChannel('generalchannel_new');

      const region = await Regions.findByPk(regionId);

      if (!region) {
        return interaction.editReply({ content: 'The specified region does not exist in the database.', flags: MessageFlags.Ephemeral });
      }

      try {
        const { region: updatedRegion, embed: regionChangedEmbed } = await changeRegionInDatabase(interaction.user, region, {
          newName: newName,
          newRoleId: newRole ? newRole.id : null,
          newRulingHouseId: newRulingHouseId,
          newRole1: newRole1,
          newRole2: newRole2,
          newRole3: newRole3,
          newGeneralChannelId: newGeneralChannel ? newGeneralChannel.id : null
        });

        await interaction.editReply({ embeds: [regionChangedEmbed], flags: MessageFlags.Ephemeral });

        // If any of the roles were changed, send additional message asking if
        // would like for the recruitment post to be updated
        if (newRole1 || newRole2 || newRole3) {
          const container = new ContainerBuilder()
            .addTextDisplayComponents(
              new TextDisplayBuilder()
                .setContent('# Update recruitment post?\nWould you like for the recruitment post to be updated with the new roles?\nIf you do not want this, then just dismiss this message.')
            )
            .addActionRowComponents(
              new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                  .setCustomId('update-recruitment-post-button')
                  .setLabel('Yes')
                  .setStyle(ButtonStyle.Success)
              )
            )
          return interaction.followUp({ components: [container], flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] });
        }
        return;
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
      const newParent1Id = interaction.options.getString('parent1_new');
      const newParent2Id = interaction.options.getString('parent2_new');
      const newHidden = interaction.options.getString('hidden_new') === null ? null : (interaction.options.getString('hidden_new') === 'Yes' ? true : false);

      const playableChild = await PlayableChildren.findByPk(playableChildId);

      if (!playableChild) {
        return interaction.editReply({ content: 'The specified playable child does not exist in the database.', flags: MessageFlags.Ephemeral });
      }

      const embeds = [];
      try {
        const character = await playableChild.getCharacter();
        const { character: updatedCharacter, embed: characterChangedEmbed } = await changeCharacterInDatabase(interaction.user, await playableChild.getCharacter(), true, {
          newName: newName,
          newSex: newSex,
          newYearOfMaturity: newYearOfMaturity,
          newParent1Id: newParent1Id,
          newParent2Id: newParent2Id,
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
          newContact2Snowflake: newContact2 ? newContact2.id : null,
          newHidden: newHidden
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
      const newBearingCharacterId = interaction.options.getString('bearingcharacter_new');
      const newConceivingCharacterId = interaction.options.getString('conceivingcharacter_new');

      const relationship = await Relationships.findByPk(relationshipId);

      try {
        const { relationship: updatedRelationship, embed: relationshipChangedEmbed } = await changeRelationshipInDatabase(interaction.user, relationship, {
          newIsCommitted: newCommitted === null ? null : (newCommitted === 'Yes' ? true : false),
          newInheritedTitle: newInheritedTitle,
          newBearingCharacterId: newBearingCharacterId,
          newConceivingCharacterId: newConceivingCharacterId
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
    }

    /**
     * Handle changing death rolls
     */
    if (subcommand === 'deathrolls') {
      const characterId = interaction.options.getString('character');
      const newDeathRoll1 = interaction.options.getInteger('deathroll1_new');
      const newDeathRoll2 = interaction.options.getInteger('deathroll2_new');
      const newDeathRoll3 = interaction.options.getInteger('deathroll3_new');
      const newDeathRoll4 = interaction.options.getInteger('deathroll4_new');
      const newDeathRoll5 = interaction.options.getInteger('deathroll5_new');

      const character = await Characters.findByPk(characterId);

      try {
        const { character: updatedCharacter, embed } = await changeCharacterInDatabase(interaction.user, character, true, {
          newDeathRoll1: newDeathRoll1,
          newDeathRoll2: newDeathRoll2,
          newDeathRoll3: newDeathRoll3,
          newDeathRoll4: newDeathRoll4,
          newDeathRoll5: newDeathRoll5
        });
        return interaction.editReply({ embeds: [embed], flags: MessageFlags.Ephemeral });
      }
      catch (error) {
        console.log(error);
        const deathRollsNotChangedEmbed = new EmbedBuilder()
          .setTitle('Death Rolls Not Changed')
          .setDescription(`An error occurred while trying to change the death rolls: ${error.message}`)
          .setColor(COLORS.RED);
        return interaction.editReply({
          embeds: [deathRollsNotChangedEmbed], flags: MessageFlags.Ephemeral
        })
      }

    }

    /**
     * Handle changing duchy info
     */
    if (subcommand === 'duchy') {
      const duchyId = interaction.options.getString('duchy');
      const newName = interaction.options.getString('name_new');
      const newRegionId = interaction.options.getString('region_new');

      const duchy = await Duchies.findByPk(duchyId);

      try {
        const { duchy: updatedDuchy, embed: duchyChangedEmbed } = await changeDuchyInDatabase(interaction.user, duchy, {
          newName: newName,
          newRegionId: newRegionId
        });
        return interaction.editReply({ embeds: [duchyChangedEmbed], flags: MessageFlags.Ephemeral });
      }
      catch (error) {
        console.log(error);
        const duchyNotChangedEmbed = new EmbedBuilder()
          .setTitle('Duchy Not Changed')
          .setDescription(`An error occurred while trying to change the duchy: ${error.message}`)
          .setColor(COLORS.RED);
        return interaction.editReply({ embeds: [duchyNotChangedEmbed], flags: MessageFlags.Ephemeral });
      }
    }

    /**
     * Handle changing deceased info
     */
    if (subcommand === 'deceased') {
      const deceasedId = interaction.options.getString('character');
      const newYearOfDeath = interaction.options.getInteger('yearofdeath_new');
      const newMonthOfDeath = interaction.options.getString('monthofdeath_new');
      const newDayOfDeath = interaction.options.getInteger('dayofdeath_new');
      const newCauseOfDeath = interaction.options.getString('causeofdeath_new');
      const newPlayedBy = interaction.options.getUser('playedby_new');

      const deceased = await Deceased.findByPk(deceasedId);

      try {
        const { deceased: updatedDeceased, embed: deceasedChangedEmbed } = await changeDeceasedInDatabase(interaction.user, deceased, {
          newYearOfDeath: newYearOfDeath,
          newMonthOfDeath: newMonthOfDeath,
          newDayOfDeath: newDayOfDeath,
          newCauseOfDeath: newCauseOfDeath,
          newPlayedById: newPlayedBy ? newPlayedBy.id : null
        });
        return interaction.editReply({ embeds: [deceasedChangedEmbed], flags: MessageFlags.Ephemeral });
      }
      catch (error) {
        console.log(error);
        const deceasedNotChangedEmbed = new EmbedBuilder()
          .setTitle('Deceased Not Changed')
          .setDescription(`An error occurred while trying to change the deceased entry: ${error.message}`)
          .setColor(COLORS.RED);
        return interaction.editReply({ embeds: [deceasedNotChangedEmbed], flags: MessageFlags.Ephemeral });
      }
    }

    /**
     * Handle changing social class info
     */
    if (subcommand === 'socialclass') {
      const socialClassName = interaction.options.getString('socialclass');
      const newRole = interaction.options.getRole('role_new');

      const socialClass = await SocialClasses.findByPk(socialClassName);

      try {
        const { socialClass: updatedSocialClass, embed: socialClassChangedEmbed } = await changeSocialClassInDatabase(interaction.user, socialClass, {
          newRoleId: newRole ? newRole.id : null
        });
        return interaction.editReply({ embeds: [socialClassChangedEmbed], flags: MessageFlags.Ephemeral });
      }
      catch (error) {
        console.log(error);
        const socialClassNotChangedEmbed = new EmbedBuilder()
          .setTitle('Social Class Not Changed')
          .setDescription(`An error occurred while trying to change the social class: ${error.message}`)
          .setColor(COLORS.RED);
        return interaction.editReply({ embeds: [socialClassNotChangedEmbed], flags: MessageFlags.Ephemeral });
      }
    }

    return interaction.editReply({ content: 'Hmm, whatever you just did shouldn\'t be possible. What did you do?', flags: MessageFlags.Ephemeral })
  }
}