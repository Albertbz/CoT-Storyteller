const { SlashCommandBuilder, InteractionContextType, EmbedBuilder, MessageFlags, userMention, inlineCode } = require('discord.js');
const { Players, Characters, SocialClasses, Regions, Worlds } = require('../../dbObjects.js');
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