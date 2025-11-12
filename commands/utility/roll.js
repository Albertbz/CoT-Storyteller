const { SlashCommandBuilder, InteractionContextType, MessageFlags, userMention, inlineCode, ButtonBuilder, ActionRowBuilder, ButtonStyle, subtext, EmbedBuilder, italic, bold } = require('discord.js');
const { Players, Characters, Affiliations, SocialClasses, Worlds, Relationships, PlayableChildren } = require('../../dbObjects.js');
const { roles } = require('../../configs/ids.json');
const { Op } = require('sequelize');
const { postInLogChannel, assignCharacterToPlayer, ageToFertilityModifier, addCharacterToDatabase, addPlayableChildToDatabase } = require('../../misc.js');
const { calculateOffspringRoll, formatOffspringCounts, getPlayerSnowflakeForCharacter, buildOffspringChanceEmbed, getFertilityModifier, COLORS } = require('../../helpers/rollHelper.js');

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
        .addSubcommand(subcommand =>
          subcommand
            .setName('bastard')
            .setDescription('Roll for bastard offspring.')
            .addStringOption(option =>
              option
                .setName('character')
                .setDescription('The character to roll bastard offspring for. Must be rolling for bastards.')
                .setRequired(true)
                .setAutocomplete(true)
            )
        )
    )
  ,
  async autocomplete(interaction) {
    // Get focused subcommand and option
    const optionName = interaction.options.getFocused(true).name;

    // Autocomplete for relationships
    if (optionName === 'relationship') {
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
    }

    // Autocomplete for characters (bastard roll)
    else if (optionName === 'character') {
      const focusedValue = interaction.options.getFocused();

      // Find characters whose name starts with the focused value and are 
      // rolling for bastards
      const characters = await Characters.findAll({
        where: {
          name: { [Op.startsWith]: focusedValue },
          isRollingForBastards: true
        },
        limit: 25
      });

      const choices = characters.map(char => ({
        name: char.name,
        value: char.id
      }));
      await interaction.respond(choices);
    }
  },
  async execute(interaction) {
    await interaction.deferReply();

    // Set up shared variables
    const world = await Worlds.findOne({ where: { name: 'Elstrand' } });

    const interactionUser = interaction.user;
    const collectorFilter = i => i.user.id === interactionUser.id;
    const rollChancesEmbed = buildOffspringChanceEmbed();

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
        return interaction.editReply({ content: 'Relationship not found.', flags: MessageFlags.Ephemeral });
      }

      // Calculate ages and fertility modifiers
      const fertilityModifiers = await getFertilityModifier(relationship.bearingCharacter.yearOfMaturity, relationship.conceivingCharacter.yearOfMaturity);

      const age1 = world.currentYear - relationship.bearingCharacter.yearOfMaturity;
      const age2 = world.currentYear - relationship.conceivingCharacter.yearOfMaturity;

      // Make buttons to roll or cancel
      const rollButton = new ButtonBuilder()
        .setCustomId(`roll_offspring_${relationship.id}`)
        .setLabel('Roll Offspring')
        .setStyle(ButtonStyle.Primary);

      const cancelButton = new ButtonBuilder()
        .setCustomId(`cancel_offspring_${relationship.id}`)
        .setLabel('Cancel')
        .setStyle(ButtonStyle.Secondary);

      const rollRow = new ActionRowBuilder()
        .addComponents(rollButton, cancelButton);

      // Make button to save offspring
      const saveButton = new ButtonBuilder()
        .setCustomId(`save_offspring_${relationship.id}`)
        .setLabel('Save Offspring')
        .setStyle(ButtonStyle.Primary);

      const saveRow = new ActionRowBuilder()
        .addComponents(saveButton);

      // Make an embed showing the relationship info
      const rollDescription = `
        Rolling for offspring between:
        ${inlineCode(relationship.bearingCharacter.name)} (${fertilityModifiers.fertilityModifier1 * 100}% fertile) and 
        ${inlineCode(relationship.conceivingCharacter.name)} (${fertilityModifiers.fertilityModifier2 * 100}% fertile).
        Combined Fertility Modifier: ${fertilityModifiers.combinedFertilityModifier * 100}%
        `;

      const rollEmbed = new EmbedBuilder()
        .setTitle('Offspring Roll for Relationship')
        .setDescription(rollDescription)
        .setColor(COLORS.BLUE_COLOR);


      // Make the initial reply
      const rollMessage = await interaction.editReply({
        embeds: [rollChancesEmbed, rollEmbed],
        components: [rollRow],
        withResponse: true
      });

      try {
        const rollInteraction = await rollMessage.awaitMessageComponent({ filter: collectorFilter, time: 60000 });
        await rollInteraction.deferUpdate();

        if (rollInteraction.customId === `cancel_offspring_${relationship.id}`) {
          return rollInteraction.editReply({ content: 'Offspring roll cancelled.', embeds: [], components: [] });
        }

        if (rollInteraction.customId === `roll_offspring_${relationship.id}`) {
          // Calculate the offspring roll
          const roll = calculateOffspringRoll({ age1, age2, isBastardRoll: false });

          // Prepare result embed with: 
          // color based on result (red if no offspring, green if offspring)
          // description based on offspring result (offspring produced or failed)
          // as well as the the rolls themselves (fertility and offspring checks)
          let color = COLORS.RED_COLOR;
          let resultDescription = ``;
          let isSuccessfulRoll = false;

          if (roll.result.includes('Son') || roll.result.includes('Daughter')) {
            resultDescription = `
              ${inlineCode(relationship.bearingCharacter.name)} & ${inlineCode(relationship.conceivingCharacter.name)} (${roll.fertilityModifier}% fertile) produced:
              ${bold(formatOffspringCounts(roll.result).text)} *(Fertility: ${roll.fertilityCheck} / Offspring: ${roll.offspringCheck})*
            `;
            color = COLORS.GREEN_COLOR;
            isSuccessfulRoll = true;
          }
          else if (roll.result[0] === 'Failed Fertility Roll') {
            resultDescription = `
              ${inlineCode(relationship.bearingCharacter.name)} & ${inlineCode(relationship.conceivingCharacter.name)} (${roll.fertilityModifier}% fertile) did **not conceive** (failed fertility roll).
              *(Fertility: ${roll.fertilityCheck})*
            `;
          }
          else {
            resultDescription = `
              ${inlineCode(relationship.bearingCharacter.name)} & ${inlineCode(relationship.conceivingCharacter.name)} (${roll.fertilityModifier}% fertile) did **not conceive**.
              *(Fertility: ${roll.fertilityCheck} / Offspring: ${roll.offspringCheck})*
            `;
          }


          // Make embed with result
          const resultEmbed = new EmbedBuilder()
            .setTitle('Offspring Roll Result')
            .setDescription(resultDescription)
            .setColor(color);

          if (isSuccessfulRoll) {
            const resultMessage = await rollInteraction.editReply({
              embeds: [rollChancesEmbed, resultEmbed],
              components: [saveRow],
              withResponse: true
            });

            try {
              const saveInteraction = await resultMessage.awaitMessageComponent({ filter: collectorFilter, time: 60000 });
              await saveInteraction.deferUpdate();

              if (saveInteraction.customId === `save_offspring_${relationship.id}`) {
                // Edit reply to indicate saving offspring by making a new embed
                const savingEmbed = new EmbedBuilder()
                  .setTitle('Offspring Roll Result')
                  .setDescription(resultDescription + '\n\n**Saving offspring to database...**')
                  .setColor(color);

                await saveInteraction.editReply({ embeds: [rollChancesEmbed, savingEmbed], components: [] });

                // Save each child to database
                const affiliationId = relationship.conceivingCharacter.affiliationId;

                for (const childType of roll.result) {
                  // Make character for each child
                  let childCharacter = null;
                  try {
                    childCharacter = await addCharacterToDatabase(interactionUser, {
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
                    return saveInteraction.editReply({ content: error.message, embeds: [], components: [] });
                  }

                  // Make playable child entry for each child
                  try {
                    // Resolve player snowflakes for both parents (may be null)
                    const parent1Snowflake = await getPlayerSnowflakeForCharacter(relationship.bearingCharacter.id);
                    const parent2Snowflake = await getPlayerSnowflakeForCharacter(relationship.conceivingCharacter.id);

                    // Ensure contact1Snowflake holds an existing snowflake even if it's the second parent only
                    const contact1Snowflake = parent1Snowflake ?? parent2Snowflake ?? null;
                    const contact2Snowflake = (parent1Snowflake && parent2Snowflake) ? parent2Snowflake : null;

                    const newPlayableChild = await addPlayableChildToDatabase(interactionUser, {
                      characterId: childCharacter.id,
                      legitimacy: relationship.isCommitted ? 'Legitimate' : 'Illegitimate',
                      contact1Snowflake: contact1Snowflake,
                      contact2Snowflake: contact2Snowflake,
                    });
                  }
                  catch (error) {
                    console.log(error);
                    return saveInteraction.editReply({ content: error.message, embeds: [], components: [] });
                  }
                }

                // Confirm saved offspring to user by editing reply with added
                // text at bottom of embed description and removing buttons
                const savedDescription = resultDescription + '\n\n**Offspring saved to database.**';
                const savedEmbed = new EmbedBuilder()
                  .setTitle('Offspring Roll Result')
                  .setDescription(savedDescription)
                  .setColor(color);

                return saveInteraction.editReply({ embeds: [rollChancesEmbed, savedEmbed], components: [] });
              }
            }
            catch (error) {
              if (error.code === 'InteractionCollectorError') {
                return interaction.editReply({ content: 'No response received. Offspring roll finalised without saving.', embeds: [], components: [] });
              }
              console.log(error);
              return interaction.editReply({ content: 'Something went wrong. Please let Albert know.', embeds: [], components: [] });
            }
          }
          else {
            return await rollInteraction.editReply({
              embeds: [rollChancesEmbed, resultEmbed],
              components: [],
              withResponse: true
            });
          }
        }
      }
      catch (error) {
        if (error.code === 'InteractionCollectorError') {
          return interaction.editReply({ content: 'No response received. Offspring roll cancelled.', embeds: [], components: [] });
        }
        console.log(error);
        return interaction.editReply({ content: 'Something went wrong. Please let Albert know.', embeds: [], components: [] });
      }
    }

    // Handle offspring roll for bastard
    else if (interaction.options.getSubcommand() === 'bastard') {
      const characterId = interaction.options.getString('character');

      const character = await Characters.findOne({ where: { id: characterId } });
      if (!character) {
        return interaction.editReply({ content: 'Character not found.', embeds: [], components: [] });
      }

      if (!character.isRollingForBastards) {
        return interaction.editReply({ content: 'This character is not set to roll for bastards.', embeds: [], components: [] });
      }

      // Make buttons to roll or cancel
      const rollButton = new ButtonBuilder()
        .setCustomId(`roll_bastard_${character.id}`)
        .setLabel('Roll Bastard Offspring')
        .setStyle(ButtonStyle.Primary);

      const cancelButton = new ButtonBuilder()
        .setCustomId(`cancel_bastard_${character.id}`)
        .setLabel('Cancel')
        .setStyle(ButtonStyle.Secondary);

      const rollRow = new ActionRowBuilder()
        .addComponents(rollButton, cancelButton);

      // Make button to save offspring
      const saveButton = new ButtonBuilder()
        .setCustomId(`save_bastard_${character.id}`)
        .setLabel('Save Offspring')
        .setStyle(ButtonStyle.Primary);

      const saveRow = new ActionRowBuilder()
        .addComponents(saveButton);

      const fertilityModifier = ageToFertilityModifier(world.currentYear - character.yearOfMaturity);

      // Make an embed showing the character info
      const rollDescription = `
        Rolling for bastard offspring for ${inlineCode(character.name)} (${fertilityModifier * 100}% fertile).
        `;

      const rollEmbed = new EmbedBuilder()
        .setTitle('Bastard Offspring Roll')
        .setDescription(rollDescription)
        .setColor(COLORS.BLUE_COLOR);

      // Make the initial reply
      const rollMessage = await interaction.editReply({
        embeds: [rollChancesEmbed, rollEmbed],
        components: [rollRow],
        withResponse: true
      });

      try {
        const rollInteraction = await rollMessage.awaitMessageComponent({ filter: collectorFilter, time: 60000 });
        await rollInteraction.deferUpdate();

        if (rollInteraction.customId === `cancel_bastard_${character.id}`) {
          return rollInteraction.editReply({ content: 'Bastard offspring roll cancelled.', embeds: [], components: [] });
        }

        if (rollInteraction.customId === `roll_bastard_${character.id}`) {
          // Calculate the offspring roll
          const roll = calculateOffspringRoll({ age1: world.currentYear - character.yearOfMaturity, age2: null, isBastardRoll: true });

          // Prepare result embed with: 
          // color based on result (red if no offspring, green if offspring)
          // description based on offspring result (offspring produced or failed)
          // as well as the the rolls themselves (fertility and offspring checks)
          let color = COLORS.RED_COLOR;
          let resultDescription = ``;
          let isSuccessfulRoll = false;

          if (roll.result.includes('Son') || roll.result.includes('Daughter')) {
            resultDescription = `
              ${inlineCode(character.name)} (${roll.fertilityModifier}% fertile) produced: 
              ${bold(formatOffspringCounts(roll.result).text)} *(Fertility: ${roll.fertilityCheck} / Offspring: ${roll.offspringCheck})*
            `;
            color = COLORS.GREEN_COLOR;
            isSuccessfulRoll = true;
          }
          else if (roll.result[0] === 'Failed Fertility Roll') {
            resultDescription = `
              ${inlineCode(character.name)} (${roll.fertilityModifier}% fertile) did **not conceive** (failed fertility roll).
              *(Fertility: ${roll.fertilityCheck})*
            `;
          }
          else {
            resultDescription = `
              ${inlineCode(character.name)} (${roll.fertilityModifier}% fertile) did **not conceive**.
              *(Fertility: ${roll.fertilityCheck} / Offspring: ${roll.offspringCheck})*
            `;
          }

          // Make embed with result
          const resultEmbed = new EmbedBuilder()
            .setTitle('Bastard Offspring Roll Result')
            .setDescription(resultDescription)
            .setColor(color);

          if (isSuccessfulRoll) {
            const resultMessage = await rollInteraction.editReply({
              embeds: [rollChancesEmbed, resultEmbed],
              components: [saveRow],
              withResponse: true
            });

            try {
              const saveInteraction = await resultMessage.awaitMessageComponent({ filter: collectorFilter, time: 60000 });
              await saveInteraction.deferUpdate();

              if (saveInteraction.customId === `save_bastard_${character.id}`) {
                // Edit reply to indicate saving offspring by making a new embed
                const savingEmbed = new EmbedBuilder()
                  .setTitle('Bastard Offspring Roll Result')
                  .setDescription(resultDescription + '\n\n**Saving bastard offspring to database...**')
                  .setColor(color);

                await saveInteraction.editReply({ embeds: [rollChancesEmbed, savingEmbed], components: [] });

                // Save each child to database
                const affiliationId = character.affiliationId;

                for (const childType of roll.result) {
                  // Make character for each child
                  let childCharacter = null;
                  try {
                    childCharacter = await addCharacterToDatabase(interactionUser, {
                      name: childType,
                      sex: childType === 'Son' ? 'Male' : 'Female',
                      affiliationId: affiliationId,
                      socialClassName: 'Notable',
                      yearOfMaturity: world.currentYear + 3,
                      parent1Id: character.id
                    });
                  }
                  catch (error) {
                    console.log(error);
                    return saveInteraction.editReply({ content: error.message, embeds: [], components: [] });
                  }

                  // Make playable child entry for each child
                  try {
                    // Resolve player snowflake for the parent (may be null)
                    const parentSnowflake = await getPlayerSnowflakeForCharacter(character.id);

                    const newPlayableChild = await addPlayableChildToDatabase(interactionUser, {
                      characterId: childCharacter.id,
                      legitimacy: 'Illegitimate',
                      contact1Snowflake: parentSnowflake,
                    });
                  }
                  catch (error) {
                    console.log(error);
                    return saveInteraction.editReply({ content: error.message, embeds: [], components: [] });
                  }
                }

                // Confirm saved offspring to user by editing reply with added
                // text at bottom of embed description and removing buttons
                const savedDescription = resultDescription + '\n\n**Bastard offspring saved to database.**';
                const savedEmbed = new EmbedBuilder()
                  .setTitle('Bastard Offspring Roll Result')
                  .setDescription(savedDescription)
                  .setColor(color);

                return saveInteraction.editReply({ embeds: [rollChancesEmbed, savedEmbed], components: [] });
              }
            }
            catch (error) {
              if (error.code === 'InteractionCollectorError') {
                return interaction.editReply({ content: 'No response received. Bastard offspring roll finalised without saving.', embeds: [], components: [] });
              }
              console.log(error);
              return interaction.editReply({ content: 'Something went wrong. Please let Albert know.', embeds: [], components: [] });
            }
          }
          else {
            return await rollInteraction.editReply({
              embeds: [rollChancesEmbed, resultEmbed],
              components: [],
              withResponse: true
            });
          }
        }
      }
      catch (error) {
        if (error.code === 'InteractionCollectorError') {
          return interaction.editReply({ content: 'No response received. Bastard offspring roll cancelled.', embeds: [], components: [] });
        }
        console.log(error);
        return interaction.editReply({ content: 'Something went wrong. Please let Albert know.', embeds: [], components: [] });
      }
    }

    // Fallback reply if no operation performed

    return interaction.editReply({ content: 'No operation performed.', embeds: [], components: [] });
  }
};