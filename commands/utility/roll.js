const { SlashCommandBuilder, InteractionContextType, MessageFlags, userMention, inlineCode, ButtonBuilder, ActionRowBuilder, ButtonStyle, subtext, EmbedBuilder, WorkerContextFetchingStrategy, italic, bold } = require('discord.js');
const { Players, Characters, Affiliations, SocialClasses, Worlds, Relationships, PlayableChildren } = require('../../dbObjects.js');
const { roles } = require('../../configs/ids.json');
const { Op, where } = require('sequelize');
const { postInLogChannel, assignCharacterToPlayer, ageToFertilityModifier, addCharacterToDatabase, addPlayableChildToDatabase } = require('../../misc.js');
const { calculateOffspringRoll, formatOffspringCounts, getPlayerSnowflakeForCharacter } = require('../../helpers/rollHelper.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('roll')
    .setDescription('Do a single offspring or death roll.')
    .setContexts(InteractionContextType.Guild)
    .setDefaultMemberPermissions(0)
    .addSubcommandGroup(subcommandGroup =>
      subcommandGroup
        .setName('offspring')
        .setDescription('Roll for offspring.')
        .addSubcommand(subcommand =>
          subcommand
            .setName('relationship')
            .setDescription('Roll for offspring for a relationship.')
            .addStringOption(option =>
              option
                .setName('relationship')
                .setDescription('The relationship to roll offspring for.')
                .setRequired(true)
                .setAutocomplete(true)
            )
        )
    )
  ,
  async autocomplete(interaction) {
    // Autocomplete for relationships
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

    const choices = relationships.map(rel => {
      const bearingCharacterName = rel.bearingCharacter ? rel.bearingCharacter.name : 'Unknown';
      const conceivingCharacterName = rel.conceivingCharacter ? rel.conceivingCharacter.name : 'Unknown';
      return {
        name: `${bearingCharacterName} & ${conceivingCharacterName}`,
        value: rel.id
      };
    });
    await interaction.respond(choices);
  },
  async execute(interaction) {
    // Handle offspring roll for relationship
    if (interaction.options.getSubcommand() === 'relationship') {
      const relationshipId = interaction.options.getString('relationship');

      const relationship = await Relationships.findOne({
        where: { id: relationshipId },
        include: [
          { model: Characters, as: 'bearingCharacter' },
          { model: Characters, as: 'conceivingCharacter' }
        ]
      });

      if (!relationship) {
        return interaction.reply({ content: 'Relationship not found.', flags: MessageFlags.Ephemeral });
      }

      // Perform offspring roll using the shared helper
      const world = await Worlds.findOne({ where: { name: 'Elstrand' } });
      const age1 = world ? (world.currentYear - relationship.bearingCharacter.yearOfMaturity) : 0;
      const age2 = world ? (world.currentYear - relationship.conceivingCharacter.yearOfMaturity) : 0;

      const roll = calculateOffspringRoll({ age1, age2, isBastardRoll: false });

      let description = '';
      if (Array.isArray(roll.result) && (roll.result.includes('Son') || roll.result.includes('Daughter'))) {
        description = relationship.bearingCharacter.name + ' & ' + relationship.conceivingCharacter.name + ' produced: ' + formatOffspringCounts(roll.result).text;
      } else if (Array.isArray(roll.result) && roll.result[0] === 'Failed Fertility Roll') {
        description = relationship.bearingCharacter.name + ' & ' + relationship.conceivingCharacter.name + ' did not conceive (failed fertility roll).';
      } else {
        description = relationship.bearingCharacter.name + ' & ' + relationship.conceivingCharacter.name + ' result: ' + String(roll.result);
      }

      const embed = new EmbedBuilder()
        .setTitle('Offspring single roll')
        .setDescription(description)
        .addFields(
          { name: 'Fertility modifier', value: String(Math.round(roll.fertilityModifier)), inline: true },
          { name: 'Fertility roll', value: String(roll.fertilityCheck), inline: true },
          { name: 'Offspring roll', value: String(roll.offspringCheck || '-'), inline: true }
        )
        .setColor(0x0000FF);

      const saveButton = new ButtonBuilder()
        .setCustomId(`save_offspring_${relationship.id}`)
        .setLabel('Save Offspring')
        .setStyle(ButtonStyle.Primary);

      const startRow = new ActionRowBuilder()
        .addComponents(saveButton);

      const response = await interaction.reply({
        embeds: [embed],
        components: [startRow],
        withResponse: true
      });

      const collectorFilter = i => i.user.id === interaction.user.id;

      try {
        const buttonInteraction = await response.resource.message.awaitMessageComponent({ filter: collectorFilter, time: 60000 });
        await buttonInteraction.update({});

        if (buttonInteraction.customId === `save_offspring_${relationship.id}`) {
          if (!Array.isArray(roll.result) || (!roll.result.includes('Son') && !roll.result.includes('Daughter'))) {
            return buttonInteraction.editReply({ content: 'No offspring to save from this roll.', embeds: [], components: [] });
          }

          const affiliationId = relationship.conceivingCharacter.affiliationId;

          for (const childType of roll.result) {
            let childCharacter = null;
            try {
              childCharacter = await addCharacterToDatabase(buttonInteraction.user, {
                name: childType,
                sex: childType === 'Son' ? 'Male' : 'Female',
                affiliationId: affiliationId,
                socialClassName: relationship.inheritingTitle === 'Noble' ? 'Noble' : 'Notable',
                yearOfMaturity: world.currentYear + 3,
                parent1Id: relationship.bearingCharacter.id,
                parent2Id: relationship.conceivingCharacter.id,
              });
            }
            catch (error) {
              console.log(error);
              return buttonInteraction.editReply({ content: error.message, embeds: [], components: [] });
            }

            try {
              // Resolve player snowflakes for both parents (may be null)
              const parent1Snowflake = relationship
                ? await getPlayerSnowflakeForCharacter(relationship.bearingCharacter.id)
                : await getPlayerSnowflakeForCharacter(bearingCharacter.id);

              const parent2Snowflake = relationship
                ? await getPlayerSnowflakeForCharacter(relationship.conceivingCharacter.id)
                : null;

              // Ensure contact1Snowflake holds an existing snowflake even if it's the second parent only
              const contact1Snowflake = parent1Snowflake ?? parent2Snowflake ?? null;
              const contact2Snowflake = (parent1Snowflake && parent2Snowflake) ? parent2Snowflake : null;

              const newPlayableChild = await addPlayableChildToDatabase(buttonInteraction.user, {
                characterId: childCharacter.id,
                legitimacy: relationship ? (relationship.isCommitted ? 'Legitimate' : 'Illegitimate') : 'Illegitimate',
                contact1Snowflake: contact1Snowflake,
                contact2Snowflake: contact2Snowflake,
              });
            }
            catch (error) {
              console.log(error);
              return buttonInteraction.editReply({ content: error.message, embeds: [], components: [] });
            }
          }

          return buttonInteraction.editReply({ content: 'Saved offspring.', embeds: [], components: [] });
        }

      } catch (error) {
        console.log(error);
        return interaction.editReply({ content: 'Something went wrong when saving offspring.', embeds: [], components: [] });
      }
    }

    return interaction.editReply({ content: 'No operation performed.', embeds: [], components: [] });
  }
};