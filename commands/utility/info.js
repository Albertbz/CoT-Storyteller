const { SlashCommandBuilder, InteractionContextType, EmbedBuilder, MessageFlags, userMention, inlineCode } = require('discord.js');
const { Players, Characters, SocialClasses, Regions, Worlds, PlayableChildren, Relationships } = require('../../dbObjects.js');
const { Op } = require('sequelize');
const { COLORS } = require('../../misc.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('info')
    .setDescription('Get info about a player or a character.')
    .setContexts(InteractionContextType.Guild)
    .setDefaultMemberPermissions(0)
    .addSubcommand(subcommand =>
      subcommand
        .setName('player')
        .setDescription('Get info about a player.')
        .addUserOption(option =>
          option
            .setName('user')
            .setDescription('The user.')
            .setRequired(true))
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('character')
        .setDescription('Get info about a character.')
        .addStringOption(option =>
          option
            .setName('name')
            .setDescription('The name of the character.')
            .setRequired(true)
            .setAutocomplete(true))
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('region')
        .setDescription('Get info about a region.')
        .addStringOption(option =>
          option
            .setName('name')
            .setDescription('The name of the region.')
            .setRequired(true)
            .setAutocomplete(true))
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('child')
        .setDescription('Get info about a child.')
        .addStringOption(option =>
          option
            .setName('child')
            .setDescription('The child.')
            .setRequired(true)
            .setAutocomplete(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('relationship')
        .setDescription('Get info about a relationship.')
        .addStringOption(option =>
          option
            .setName('relationship')
            .setDescription('The relationship.')
            .setRequired(true)
            .setAutocomplete(true)
        )
    )
  ,
  async autocomplete(interaction) {
    const subcommand = interaction.options.getSubcommand();

    // Autocomplete for character names
    if (subcommand === 'character') {
      const focusedValue = interaction.options.getFocused();
      const characters = await Characters.findAll({
        where: { name: { [Op.startsWith]: focusedValue } },
        attributes: ['name', 'id'],
        limit: 25
      });
      await interaction.respond(characters.map(character => ({ name: character.name, value: character.id })))
    }

    // Autocomplete for region names
    if (subcommand === 'region') {
      const focusedValue = interaction.options.getFocused();
      const regions = await Regions.findAll({
        where: { name: { [Op.startsWith]: focusedValue } },
        attributes: ['name', 'id'],
        limit: 25
      });
      await interaction.respond(regions.map(region => ({ name: region.name, value: region.id })))
    }

    // Autocomplete for children
    if (subcommand === 'child') {
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

      const choices = children.map(child => {
        const parentNames = []
        if (child.character.parent1) {
          parentNames.push(child.character.parent1.name.substring(0, 30));
        }

        if (child.character.parent2) {
          parentNames.push(child.character.parent2.name.substring(0, 30));
        }

        return ({
          name: (child.character.name.substring(0, 30) + ' | ' + parentNames.join(' & ')),
          value: child.id
        })
      }
      );

      await interaction.respond(choices);
    }

    if (subcommand === 'relationship') {
      const focusedValue = interaction.options.getFocused();

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

      const choices = relationships.map(rel => {
        const bearingCharacterName = rel.bearingCharacter ? rel.bearingCharacter.name : 'Unknown';
        const conceivingCharacterName = rel.conceivingCharacter ? rel.conceivingCharacter.name : 'Unknown';
        return {
          name: `${bearingCharacterName} & ${conceivingCharacterName}`,
          value: rel.id
        };
      });

      await interaction.respond(choices);
    }
  },
  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const subcommand = interaction.options.getSubcommand();

    // Embeds to be sent
    const infoEmbeds = [];

    /**
     * Get info about a player
     */
    if (subcommand === 'player') {
      const user = interaction.options.getUser('user');

      // Get the player from the database
      const player = await Players.findByPk(user.id);
      if (!player) {
        return interaction.editReply({ content: 'That user is not a player.', flags: MessageFlags.Ephemeral });
      }

      const playerInfoEmbed = await getPlayerInfoEmbed(player);
      infoEmbeds.push(playerInfoEmbed);

      // If they have a character, make an embed for that too
      const character = await player.getCharacter();
      if (character) {
        const characterInfoEmbed = await getCharacterInfoEmbed(character);
        infoEmbeds.push(characterInfoEmbed);
      }
    }

    /**
     * Get info about a character
     */
    else if (subcommand === 'character') {
      const characterId = interaction.options.getString('name');

      // Get the character from the database
      const character = await Characters.findByPk(characterId);
      if (!character) {
        return interaction.editReply({ content: 'That character does not exist.', flags: MessageFlags.Ephemeral });
      }

      const characterInfoEmbed = await getCharacterInfoEmbed(character);
      infoEmbeds.push(characterInfoEmbed);
    }

    /**
     * Get info about a region
     */
    else if (subcommand === 'region') {
      const regionId = interaction.options.getString('name');

      // Get the region from the database
      const region = await Regions.findByPk(regionId);
      if (!region) {
        return interaction.editReply({ content: 'That region does not exist.', flags: MessageFlags.Ephemeral });
      }

      const regionInfoEmbed = await getRegionInfoEmbed(region);
      infoEmbeds.push(regionInfoEmbed);
    }

    /**
     * Get info about a child
     */
    else if (subcommand === 'child') {
      const childId = interaction.options.getString('child');

      // Get the child from the database
      const child = await PlayableChildren.findByPk(childId, {
        include: {
          model: Characters, as: 'character'
        }
      });
      if (!child) {
        return interaction.editReply({ content: 'That child does not exist.', flags: MessageFlags.Ephemeral });
      }

      const childInfoEmbed = await getChildInfoEmbed(child);
      infoEmbeds.push(childInfoEmbed);
    }

    /**
     * Get info about a relationship
     */
    else if (subcommand === 'relationship') {
      const relationshipId = interaction.options.getString('relationship');

      // Get the relationship from the database
      const relationship = await Relationships.findByPk(relationshipId, {
        include: [
          { model: Characters, as: 'bearingCharacter' },
          { model: Characters, as: 'conceivingCharacter' }
        ]
      });
      if (!relationship) {
        return interaction.editReply({ content: 'That relationship does not exist.', flags: MessageFlags.Ephemeral });
      }

      const relationshipInfoEmbed = await getRelationshipInfoEmbed(relationship);
      infoEmbeds.push(relationshipInfoEmbed);
    }

    // Send the embeds
    return interaction.editReply({ embeds: infoEmbeds, flags: MessageFlags.Ephemeral });
  }
}

async function getPlayerInfoEmbed(player) {
  const user = client.users.cache.get(player.id);

  return new EmbedBuilder()
    .setTitle(`Player Info: ${user.username}`)
    .setDescription(await player.formattedInfo)
    .setThumbnail(user.displayAvatarURL())
    .setColor(COLORS.BLUE);
}

async function getCharacterInfoEmbed(character) {
  return new EmbedBuilder()
    .setTitle(`Character Info: ${character.name}`)
    .setDescription(await character.formattedInfo)
    .setColor(COLORS.BLUE);
}

async function getRegionInfoEmbed(region) {
  return new EmbedBuilder()
    .setTitle(`Region Info: ${region.name}`)
    .setDescription(await region.formattedInfo)
    .setColor(COLORS.BLUE);
}

async function getChildInfoEmbed(child) {
  return new EmbedBuilder()
    .setTitle(`Child Info: ${child.character.name}`)
    .setDescription(await child.formattedInfo)
    .setColor(COLORS.BLUE);
}

async function getRelationshipInfoEmbed(relationship) {
  return new EmbedBuilder()
    .setTitle(`Relationship Info: ${relationship.bearingCharacter ? relationship.bearingCharacter.name : 'Unknown'} & ${relationship.conceivingCharacter ? relationship.conceivingCharacter.name : 'Unknown'}`)
    .setDescription(await relationship.formattedInfo)
    .setColor(COLORS.BLUE);
}