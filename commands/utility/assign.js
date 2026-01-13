const { SlashCommandBuilder, InteractionContextType, MessageFlags, userMention, inlineCode } = require('discord.js');
const { Players, Characters, SocialClasses, Worlds, Regions } = require('../../dbObjects.js');
const { roles } = require('../../configs/ids.json');
const { Op } = require('sequelize');
const { assignCharacterToPlayer, assignSteelbearerToRegion } = require('../../misc.js');


module.exports = {
  data: new SlashCommandBuilder()
    .setName('assign')
    .setDescription('Assign something to someone.')
    .setContexts(InteractionContextType.Guild)
    .setDefaultMemberPermissions(0)
    .addSubcommand(subcommand =>
      subcommand
        .setName('character')
        .setDescription('Assign a character to a player.')
        .addStringOption(option =>
          option
            .setName('character')
            .setDescription('The character to be assigned to a player.')
            .setRequired(true)
            .setAutocomplete(true)
        )
        .addUserOption(option =>
          option
            .setName('player')
            .setDescription('The player that the character is to be assigned to.')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('steelbearer')
        .setDescription('Assign a steelbearer character to a region.')
        .addStringOption(option =>
          option
            .setName('character')
            .setDescription('The steelbearer character to be assigned to a region.')
            .setRequired(true)
            .setAutocomplete(true)
        )
        .addStringOption(option =>
          option
            .setName('type')
            .setDescription('The type of steelbearer assignment.')
            .setRequired(true)
            .addChoices(
              { name: 'Ruler', value: 'Ruler' },
              { name: 'General-purpose', value: 'General-purpose' },
              { name: 'Duchy', value: 'Duchy' },
              { name: 'Vassal', value: 'Vassal' },
            )
        )
        .addStringOption(option =>
          option
            .setName('duchy')
            .setDescription('The duchy to assign the steelbearer to (if type is Duchy).')
            .setRequired(false)
            .setAutocomplete(true)
        )
    )

  ,
  async autocomplete(interaction) {
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'character') {
      const focusedValue = interaction.options.getFocused();

      const characters = await Characters.findAll({
        where: { name: { [Op.startsWith]: focusedValue } },
        attributes: ['name', 'id'],
        limit: 25
      });

      choices = characters.map(character => ({ name: character.name, value: character.id }));
      await interaction.respond(choices);
    }

    if (subcommand === 'steelbearer') {
      const focusedOption = interaction.options.getFocused(true);

      if (focusedOption.name === 'character') {
        const focusedValue = focusedOption.value;

        const characters = await Characters.findAll({
          where: {
            name: { [Op.startsWith]: focusedValue }
          },
          attributes: ['name', 'id'],
          limit: 25
        });

        choices = characters.map(character => ({ name: character.name, value: character.id }));
        await interaction.respond(choices);
      }
      else if (focusedOption.name === 'duchy') {
        const focusedValue = focusedOption.value;

        // Get duchies from the region that the character belongs to
        const characterId = interaction.options.getString('character');
        const character = await Characters.findByPk(characterId);
        const region = await Regions.findByPk(character.regionId);
        if (!region) {
          return interaction.respond([]);
        }
        const duchies = await region.getDuchies({
          where: {
            name: { [Op.startsWith]: focusedValue }
          },
          attributes: ['name', 'id'],
          limit: 25
        });

        choices = duchies.map(duchy => ({ name: duchy.name, value: duchy.id }));
        await interaction.respond(choices);
      }
    }

  },
  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const subcommand = interaction.options.getSubcommand();

    /**
     * Assign character to player
     */
    if (subcommand === 'character') {
      const characterId = interaction.options.getString('character');
      const user = interaction.options.getUser('player');

      try {
        const character = await Characters.findByPk(characterId);

        const assignedEmbed = await assignCharacterToPlayer(character.id, user.id, interaction.user);

        return interaction.editReply({ embeds: [assignedEmbed], flags: MessageFlags.Ephemeral });
      }
      catch (error) {
        return interaction.editReply({ content: error.message, flags: MessageFlags.Ephemeral });
      }
    }

    else if (subcommand === 'steelbearer') {
      const characterId = interaction.options.getString('character');
      const regionId = interaction.options.getString('region');
      const type = interaction.options.getString('type');
      const duchyId = interaction.options.getString('duchy');

      try {
        const character = await Characters.findByPk(characterId);

        // Assign steelbearer to region
        const { steelbearer, embed: steelbearerAssignedEmbed } = await assignSteelbearerToRegion(interaction.user, character, type, duchyId);

        return interaction.editReply({ embeds: [steelbearerAssignedEmbed], flags: MessageFlags.Ephemeral });
      }
      catch (error) {
        return interaction.editReply({ content: error.message, flags: MessageFlags.Ephemeral });
      }
    }
  }
}