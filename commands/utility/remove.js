const { SlashCommandBuilder, InteractionContextType, MessageFlags, userMention, inlineCode, ButtonBuilder, ActionRowBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const { Players, Characters, Affiliations, SocialClasses, Worlds, PlayableChildren, Relationships } = require('../../dbObjects.js');
const { roles } = require('../../configs/ids.json');
const { Op } = require('sequelize');
const { postInLogChannel, COLORS } = require('../../misc.js');


module.exports = {
  data: new SlashCommandBuilder()
    .setName('remove')
    .setDescription('Remove something from the database.')
    .setContexts(InteractionContextType.Guild)
    .setDefaultMemberPermissions(0)
    .addSubcommand(subcommand =>
      subcommand
        .setName('player')
        .setDescription('Remove a player.')
        .addUserOption(option =>
          option
            .setName('user')
            .setDescription('The user to remove as a player.')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('character')
        .setDescription('Remove a character.')
        .addStringOption(option =>
          option
            .setName('name')
            .setDescription('The name of the character to remove.')
            .setRequired(true)
            .setAutocomplete(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('affiliation')
        .setDescription('Remove an affiliation.')
        .addStringOption(option =>
          option
            .setName('name')
            .setDescription('The name of the affiliation to remove.')
            .setRequired(true)
            .setAutocomplete(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('child')
        .setDescription('Remove a playable child.')
        .addStringOption(option =>
          option
            .setName('name')
            .setDescription('The name of the child to remove.')
            .setRequired(true)
            .setAutocomplete(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('relationship')
        .setDescription('Remove a relationship.')
        .addStringOption(option =>
          option
            .setName('relationship')
            .setDescription('The relationship to remove.')
            .setRequired(true)
            .setAutocomplete(true)
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
    }

    // Handle autocompletes for affiliation subcommand
    if (subcommand === 'affiliation') {
      const focusedValue = interaction.options.getFocused();

      const affilations = await Affiliations.findAll({
        where: { name: { [Op.startsWith]: focusedValue } },
        attributes: ['name', 'id'],
        limit: 25
      })

      choices = affilations.map(affiliation => ({ name: affiliation.name, value: affiliation.id }));
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

    let toRemove = null;
    let entityName = '';
    let embedTitle = ''
    const interactionUserId = interaction.user.id;


    /**
     * Handle 'player' subcommand
     */
    if (subcommand === 'player') {
      const user = interaction.options.getUser('user');

      toRemove = await Players.findByPk(user.id);

      entityName = `player ${userMention(user.id)}`;
      embedTitle = 'Player Removed';
    }


    /**
     * Handle 'character' subcommand
     */
    if (subcommand === 'character') {
      const characterId = interaction.options.getString('name');

      toRemove = await Characters.findByPk(characterId);

      entityName = `character ${inlineCode(toRemove.name)}`;
      embedTitle = 'Character Removed';
    }

    /**
     * Handle 'affiliation' subcommand
     */
    if (subcommand === 'affiliation') {
      const affiliationId = interaction.options.getString('name');

      toRemove = await Affiliations.findByPk(affiliationId);
      entityName = `affiliation ${inlineCode(toRemove.name)}`;
      embedTitle = 'Affiliation Removed';
    }

    /**
     * Handle 'child' subcommand
     */
    if (subcommand === 'child') {
      const childId = interaction.options.getString('name');

      toRemove = await PlayableChildren.findByPk(childId);
      const childCharacter = await toRemove.getCharacter();
      entityName = `playable child ${inlineCode(childCharacter.name)}`;
      embedTitle = 'Playable Child Removed';
    }

    /**
     * Handle 'relationship' subcommand
     */
    if (subcommand === 'relationship') {
      const relationshipId = interaction.options.getString('relationship');

      toRemove = await Relationships.findByPk(relationshipId);
      const bearingCharacter = await toRemove.getBearingCharacter();
      const conceivingCharacter = await toRemove.getConceivingCharacter();
      entityName = `relationship between ${inlineCode(bearingCharacter.name)} and ${inlineCode(conceivingCharacter.name)}`;
      embedTitle = 'Relationship Removed';
    }

    if (!toRemove) {
      return interaction.editReply('Could not find the specified entity to remove.');
    }

    // Make button to confirm removal
    const confirmButton = new ButtonBuilder()
      .setCustomId('confirm_remove')
      .setLabel('Confirm Removal')
      .setStyle(ButtonStyle.Danger);

    // Make button to cancel removal
    const cancelButton = new ButtonBuilder()
      .setCustomId('cancel_remove')
      .setLabel('Cancel Removal')
      .setStyle(ButtonStyle.Secondary);

    const row = new ActionRowBuilder()
      .addComponents(confirmButton, cancelButton);

    // Make embed to ask for confirmation with info about the entity to be removed
    const embed = new EmbedBuilder()
      .setTitle(`Confirm Removal of ${subcommand.charAt(0).toUpperCase() + subcommand.slice(1)}`)
      .setDescription(`Are you sure you want to remove the ${entityName}? This action cannot be undone.\n\n${(await toRemove.formattedDescription)}`)
      .setColor(COLORS.BLUE);

    const confirmMessage = await interaction.editReply({
      embeds: [embed],
      components: [row],
      withResponse: true
    });

    const collectorFilter = i => i.user.id === interactionUserId;

    try {
      const confirmInteraction = await confirmMessage.awaitMessageComponent({
        filter: collectorFilter,
        time: 60_000
      });

      if (confirmInteraction.customId === 'cancel_remove') {
        return interaction.editReply({ content: `Cancelled removal of ${entityName}.`, components: [], embeds: [] });
      }

      if (confirmInteraction.customId === 'confirm_remove') {
        await postInLogChannel(
          embedTitle,
          `The ${entityName} was removed from the database by ${userMention(interactionUserId)}.
          
          ${(await toRemove.formattedDescription)}`,
          COLORS.RED
        );

        await toRemove.destroy();

        const confirmationEmbed = new EmbedBuilder()
          .setTitle(embedTitle)
          .setDescription(`The ${entityName} has been successfully removed from the database:\n\n${(await toRemove.formattedDescription)}`)
          .setColor(COLORS.GREEN);

        await interaction.editReply({ embeds: [confirmationEmbed], components: [] });
      }
    }
    catch (error) {
      if (error.code === 'InteractionCollectorError') {
        return interaction.editReply({ content: `No response received. Cancelled removal of the ${entityName}.`, components: [], embeds: [] });
      }
      console.error('Error removing entity:', error);
      return interaction.editReply({ content: `There was an error removing the ${entityName} from the database.`, components: [], embeds: [] });
    }
  }
}