const { SlashCommandBuilder, InteractionContextType, MessageFlags, userMention, inlineCode, ButtonBuilder, ActionRowBuilder, ButtonStyle, subtext, EmbedBuilder, WorkerContextFetchingStrategy, italic, bold, spoiler } = require('discord.js');
const { Players, Characters, Regions, Houses, SocialClasses, Worlds, Relationships, PlayableChildren, Deceased, DeathRollDeaths } = require('../../dbObjects.js');
const { roles } = require('../../configs/ids.json');
const { Op } = require('sequelize');
const { postInLogChannel, ageToFertilityModifier, addCharacterToDatabase, addPlayableChildToDatabase, COLORS } = require('../../misc.js');
const { REL_THRESHOLDS, BAST_THRESHOLDS, OFFSPRING_LABELS, calculateOffspringRoll, formatOffspringCounts, getPlayerSnowflakeForCharacter, buildOffspringPairLine, calculateDeathRoll, rollDeathAndGetResult, saveDeathResultToDatabase, makeDeathRollsSummaryEmbeds, buildOffspringChanceEmbed } = require('../../helpers/rollHelper.js');

// Centralized messages
const CANCEL_MESSAGE = 'Something went wrong. Please let Albert know.';
const TIMEOUT_MESSAGE = 'No response received for 5 minutes, cancelling the rolls.';

// Picks a random element from an array
function pickRandomElement(arr) {
  if (!arr || arr.length === 0) return null;
  return arr[Math.floor(Math.random() * arr.length)];
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('start_rolls')
    .setDescription('Start either offspring or death rolls.')
    .setContexts(InteractionContextType.Guild)
    .setDefaultMemberPermissions(0)
    .addSubcommand(subcommand =>
      subcommand
        .setName('offspring')
        .setDescription('Start offspring rolls.')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('death')
        .setDescription('Start death rolls.')
        .addBooleanOption(option =>
          option
            .setName('skip_interactions')
            .setDescription('If true, will not wait for user interactions and will process all death rolls automatically.')
        )
        .addBooleanOption(option =>
          option
            .setName('should_log')
            .setDescription('If false, will disable all logging for these rolls.')
        )
    ),
  async execute(interaction) {
    await interaction.deferReply();

    const world = await Worlds.findOne({ where: { name: 'Elstrand' } })

    // Do offspring rolls
    if (interaction.options.getSubcommand() === 'offspring') {
      const startButton = new ButtonBuilder()
        .setCustomId('start')
        .setLabel('Start')
        .setStyle(ButtonStyle.Primary);

      const cancelButton = new ButtonBuilder()
        .setCustomId('cancel')
        .setLabel('Cancel')
        .setStyle(ButtonStyle.Danger);

      const startRow = new ActionRowBuilder()
        .addComponents(startButton, cancelButton);

      const rollButton = new ButtonBuilder()
        .setCustomId('roll')
        .setLabel('Roll')
        .setStyle(ButtonStyle.Primary);

      const skipButton = new ButtonBuilder()
        .setCustomId('skip_offspring_rolls')
        .setLabel('Skip')
        .setStyle(ButtonStyle.Secondary);

      const rollRow = new ActionRowBuilder()
        .addComponents(rollButton, skipButton);

      const continueButton = new ButtonBuilder()
        .setCustomId('continue')
        .setLabel('Save and Continue')
        .setStyle(ButtonStyle.Primary);
      const continueRow = new ActionRowBuilder()
        .addComponents(continueButton);

      // Handle all relationships
      const relationships = await Relationships.findAll({
        include: [
          { model: Characters, as: 'bearingCharacter' },
          { model: Characters, as: 'conceivingCharacter' },
        ]
      });

      const relationshipRollsText = []
      const bearingCharacters = new Map();

      for (const relationship of relationships) {
        relationshipRollsText.push(subtext(inlineCode(relationship.bearingCharacter.name) + ' & ' + inlineCode(relationship.conceivingCharacter.name)))
        bearingCharacters.set(relationship.bearingCharacter.id, relationship.bearingCharacter)
      }

      // Get all bastard rolls
      const charactersRollingForBastards = await Characters.findAll({ where: { isRollingForBastards: true } });

      const charactersRollingForBastardsFiltered = charactersRollingForBastards.filter(character => {
        return !bearingCharacters.has(character.id);
      })

      const bastardRollsTexs = []

      for (const character of charactersRollingForBastards) {
        bastardRollsTexs.push(subtext(inlineCode(character.name)));
      }


      // Split listing into two embeds: relationships and bastards
      const relationshipsDescription = '**The following couples are rolling for children:**\n' +
        (relationshipRollsText.length > 0 ? relationshipRollsText.join('\n') : '*None*');

      const bastardsDescription = '**The following characters are rolling for bastards with an NPC:**\n' +
        (bastardRollsTexs.length > 0 ? bastardRollsTexs.join('\n') : '*None*');

      const relEmbed = new EmbedBuilder()
        .setTitle('**Offspring rolls — Relationships**')
        .setDescription(relationshipsDescription)
        .setColor(COLORS.BLUE);

      const bastEmbed = new EmbedBuilder()
        .setTitle('**Offspring rolls — Bastards**')
        .setDescription(bastardsDescription)
        .setColor(COLORS.BLUE);

      // Build an embed that shows the roll chance thresholds for relationships and bastards
      const rollChancesEmbed = buildOffspringChanceEmbed();

      const controlEmbed = new EmbedBuilder()
        .setTitle('Ready to start')
        .setDescription('Please press Start when you are ready to start the offspring rolls.\n\nIf you do not interact with the buttons for 5 minutes, the rolls will stop.')
        .setColor(COLORS.BLUE);

      const startMessage = await interaction.editReply({
        embeds: [relEmbed, bastEmbed, rollChancesEmbed, controlEmbed],
        components: [startRow],
        withResponse: true
      });

      const interactionUser = interaction.user;
      const collectorFilter = i => {
        try {
          console.log(`Collector received interaction from user ID: ${i.user.id} (${i.user.username}), expected user ID: ${interactionUser.id} (${interactionUser.username})`);
          return i.user.id === interactionUser.id;
        }
        catch (error) {
          console.error('Error in collector filter:', error);
        }
      };
      const finalRelationshipSummaries = [];
      const finalBastardSummaries = [];

      try {
        const startInteraction = await startMessage.awaitMessageComponent({ filter: collectorFilter, time: 300_000 });
        try {
          await startInteraction.deferUpdate();
        }
        catch (error) {
          console.log('Error deferring startInteraction:', error);
        }

        if (startInteraction.customId === 'cancel') {
          // Handle cancellation
          console.log('Offspring rolls cancelled by user.');
          await startMessage.edit({ content: 'Offspring rolls have been cancelled.', components: [], embeds: [] });
          return;
        }

        if (startInteraction.customId === 'start') {
          for (const [_, bearingCharacter] of bearingCharacters) {
            const relationships = await Relationships.findAll({
              where: { bearingCharacterId: bearingCharacter.id },
              include: { model: Characters, as: 'conceivingCharacter' }
            })

            const conceivingCharacters = []
            for (const relationship of relationships) {
              conceivingCharacters.push(relationship.conceivingCharacter)
            }

            let bastardNPC = ''
            if (bearingCharacter.isRollingForBastards) {
              bastardNPC = '\n' + inlineCode('NPC')
            }

            // Calculate fertility modifier
            const fertilityModifierBearing = ageToFertilityModifier(world.currentYear - bearingCharacter.yearOfMaturity) * 100;

            const embed = new EmbedBuilder()
              .setTitle('Relationship roll')
              .setDescription(
                'Bearing partner:\n' +
                inlineCode(bearingCharacter.name) + ' (' + fertilityModifierBearing + '% fertile)\n\n' +
                'Conceiving partner(s):\n' +
                conceivingCharacters.map(character => inlineCode(character.name) + ' (' + ageToFertilityModifier((world.currentYear - character.yearOfMaturity)) * 100 + '% fertile)').join('\n') + bastardNPC
              )
              .setColor(COLORS.BLUE)

            const rollMessage = await startMessage.edit({
              embeds: [relEmbed, bastEmbed, rollChancesEmbed, embed],
              components: [rollRow],
              withResponse: true
            })

            try {
              const rollInteraction = await rollMessage.awaitMessageComponent({ filter: collectorFilter, time: 300_000 });
              try {
                await rollInteraction.deferUpdate();
              }
              catch (error) {
                console.log('Error deferring rollInteraction:', error);
              }

              if (rollInteraction.customId === 'skip_offspring_rolls') {
                // Just continue to next roll
                continue;
              }

              if (rollInteraction.customId === 'roll') {
                const bearingCharacterAge = world.currentYear - bearingCharacter.yearOfMaturity

                const offspringResults = [];
                for (const conceivingCharacter of conceivingCharacters) {
                  const roll = calculateOffspringRoll({ age1: bearingCharacterAge, age2: world.currentYear - conceivingCharacter.yearOfMaturity })
                  offspringResults.push({ rollRes: roll.result, checks: { fertilityCheck: roll.fertilityCheck, offspringCheck: roll.offspringCheck, fertilityModifier: roll.fertilityModifier }, conceivingCharacter: conceivingCharacter })
                }

                if (bearingCharacter.isRollingForBastards) {
                  const roll = calculateOffspringRoll({ age1: bearingCharacterAge, isBastardRoll: true })
                  offspringResults.push({ rollRes: roll.result, checks: { fertilityCheck: roll.fertilityCheck, offspringCheck: roll.offspringCheck, fertilityModifier: roll.fertilityModifier }, conceivingCharacter: undefined })
                }

                const offspringRollsText = offspringResults.map(({ rollRes, conceivingCharacter, checks }, _) => {
                  return buildOffspringPairLine(bearingCharacter.name, conceivingCharacter ? conceivingCharacter.name : 'NPC', rollRes, checks)
                })

                const successfulRolls = []
                for (const { rollRes, conceivingCharacter } of offspringResults) {
                  if (rollRes.includes('Son') || rollRes.includes('Daughter')) {
                    successfulRolls.push({ rollRes: rollRes, conceivingCharacter: conceivingCharacter })
                  }
                }

                let offspringResultText = inlineCode(bearingCharacter.name) + ' did **not** get pregnant.';
                const offspringResult = {
                  relationship: null,
                  rolls: []
                }
                let color = COLORS.RED

                if (successfulRolls.length > 0) {
                  color = COLORS.GREEN
                  const chosen = pickRandomElement(successfulRolls)
                  const rollRes = chosen.rollRes
                  const conceivingCharacter = chosen.conceivingCharacter


                  // Update offspringResult
                  if (conceivingCharacter) {
                    try {
                      const relationship = await Relationships.findOne({
                        where: { bearingCharacterId: bearingCharacter.id, conceivingCharacterId: conceivingCharacter.id },
                        include: [
                          { model: Characters, as: 'bearingCharacter' },
                          { model: Characters, as: 'conceivingCharacter' }
                        ]
                      })
                      if (relationship) {
                        offspringResult.relationship = relationship
                      }
                    }
                    catch (error) {
                      console.log(error)
                      throw new Error('Something went wrong when trying to find the relationship for the successful roll.')
                    }
                  }
                  offspringResult.rolls = rollRes


                  const { amountOfSons, amountOfDaughters, text: offspringText } = formatOffspringCounts(rollRes)

                  if (conceivingCharacter) {
                    offspringResultText = inlineCode(bearingCharacter.name) + ' got pregnant with ' + inlineCode(conceivingCharacter.name) + ', and got:\n' + offspringText
                  }
                  else {
                    offspringResultText = inlineCode(bearingCharacter.name) + ' got pregnant with an NPC, and got:\n' + offspringText
                  }
                }

                const embed = new EmbedBuilder()
                  .setTitle('Result of roll')
                  .setDescription(
                    bold('Rolls:') + '\n' +
                    offspringRollsText.join('\n\n') +
                    '\n\n\n' +
                    bold('Result:') + '\n' +
                    offspringResultText)
                  .setColor(color)

                // Save compact summary for final report (relationships only if children were produced)
                let partnerName = 'NPC';
                if (offspringResult.relationship && offspringResult.relationship.conceivingCharacter) {
                  partnerName = offspringResult.relationship.conceivingCharacter.name;
                }
                const offspringTextCompact = (offspringResult.rolls && offspringResult.rolls.length) ? formatOffspringCounts(offspringResult.rolls).text : 'No children';
                if (offspringTextCompact !== 'No children') {
                  finalRelationshipSummaries.push(inlineCode(bearingCharacter.name) + ' & ' + inlineCode(partnerName) + ': ' + offspringTextCompact);
                }

                const resultMessage = await rollMessage.edit({
                  embeds: [relEmbed, bastEmbed, rollChancesEmbed, embed],
                  components: [continueRow],
                  withResponse: true
                })

                try {
                  const resultInteraction = await resultMessage.awaitMessageComponent({ filter: collectorFilter, time: 300_000 });
                  try {
                    await resultInteraction.deferUpdate();

                    if (successfulRolls.length > 0) {
                      const savingEmbed = new EmbedBuilder()
                        .setTitle('Result of roll')
                        .setDescription(
                          bold('Rolls:') + '\n' +
                          offspringRollsText.join('\n\n') +
                          '\n\n\n' +
                          bold('Result:') + '\n' +
                          offspringResultText + '\n\n' +
                          italic('Saving result to database...'))
                        .setColor(color)
                      await resultMessage.edit({ embeds: [relEmbed, bastEmbed, rollChancesEmbed, savingEmbed] });
                    }

                  }
                  catch (error) {
                    console.log('Error deferring resultInteraction:', error);
                  }

                  if (resultInteraction.customId === 'continue') {

                    for (const childType of offspringResult.rolls) {
                      // Make the character
                      const wandererRegion = await Regions.findOne({ where: { name: 'Wanderer' } });
                      let regionId = wandererRegion.id;
                      let houseId = null;

                      if (offspringResult.relationship) {
                        // By default takes the region and house of the conceiving parent
                        regionId = offspringResult.relationship.conceivingCharacter.regionId;
                        houseId = offspringResult.relationship.conceivingCharacter.houseId;
                      }

                      const { character: childCharacter, _ } = await addCharacterToDatabase(interactionUser, {
                        name: childType,
                        sex: childType === 'Son' ? 'Male' : 'Female',
                        regionId: regionId,
                        houseId: houseId,
                        socialClassName: offspringResult.relationship ? (offspringResult.relationship.inheritedTitle === 'Noble' ? 'Noble' : 'Notable') : 'Notable',
                        yearOfMaturity: world.currentYear + 3,
                        parent1Id: offspringResult.relationship ? offspringResult.relationship.bearingCharacter.id : bearingCharacter.id,
                        parent2Id: offspringResult.relationship ? offspringResult.relationship.conceivingCharacter.id : null,
                      })

                      // Make the playable child
                      try {
                        // Resolve player snowflakes for both parents (may be null)
                        const parent1Snowflake = offspringResult.relationship
                          ? await getPlayerSnowflakeForCharacter(offspringResult.relationship.bearingCharacter.id)
                          : await getPlayerSnowflakeForCharacter(bearingCharacter.id);

                        const parent2Snowflake = offspringResult.relationship
                          ? await getPlayerSnowflakeForCharacter(offspringResult.relationship.conceivingCharacter.id)
                          : null;

                        // Ensure contact1Snowflake holds an existing snowflake even if it's the second parent only
                        const contact1Snowflake = parent1Snowflake ?? parent2Snowflake ?? null;
                        const contact2Snowflake = (parent1Snowflake && parent2Snowflake) ? parent2Snowflake : null;

                        const playableChild = await addPlayableChildToDatabase(interactionUser, {
                          characterId: childCharacter.id,
                          legitimacy: offspringResult.relationship ? (offspringResult.relationship.isCommitted ? 'Legitimate' : 'Illegitimate') : 'Illegitimate',
                          contact1Snowflake: contact1Snowflake,
                          contact2Snowflake: contact2Snowflake,
                        });
                      }
                      catch (error) {
                        console.log(error)
                        throw new Error('Something went wrong when creating the playable child.')
                      }
                    }
                  }
                }
                catch (error) {
                  if (error.code === 'InteractionCollectorError') {
                    console.log('Result interaction collector timed out.', error.message);
                    return resultMessage.edit({ content: TIMEOUT_MESSAGE, components: [], embeds: [] })
                  }
                  console.log(error)
                  return resultMessage.edit({ content: CANCEL_MESSAGE, components: [], embeds: [] })
                }
              }
            }
            catch (error) {
              if (error.code === 'InteractionCollectorError') {
                console.log('Roll interaction collector timed out.', error.message);
                return rollMessage.edit({ content: TIMEOUT_MESSAGE, components: [], embeds: [] });
              }
              console.log(error)
              return rollMessage.edit({ content: CANCEL_MESSAGE, components: [], embeds: [] });
            }
          }

          // Do bastard rolls
          for (const character of charactersRollingForBastardsFiltered) {
            // Calculate fertility modifier
            const fertilityModifier = ageToFertilityModifier(world.currentYear - character.yearOfMaturity) * 100;

            const embed = new EmbedBuilder()
              .setTitle('Bastard NPC roll')
              .setDescription('Rolling character: ' + inlineCode(character.name) + ' (' + fertilityModifier + '% fertile)')
              .setColor(COLORS.BLUE);

            const rollMessage = await startMessage.edit({
              embeds: [relEmbed, bastEmbed, rollChancesEmbed, embed],
              components: [rollRow],
              withResponse: true
            });

            try {
              const rollInteraction = await rollMessage.awaitMessageComponent({ filter: collectorFilter, time: 300_000 });
              try {
                await rollInteraction.deferUpdate();
              }
              catch (error) {
                console.log('Error deferring rollInteraction (bastard):', error);
              }

              if (rollInteraction.customId === 'skip_offspring_rolls') {
                // Just continue to next roll
                continue;
              }

              if (rollInteraction.customId === 'roll') {
                const characterAge = world.currentYear - character.yearOfMaturity;
                const roll = calculateOffspringRoll({ age1: characterAge, isBastardRoll: true });
                const rollRes = roll.result;
                const checks = { fertilityCheck: roll.fertilityCheck, offspringCheck: roll.offspringCheck, fertilityModifier: roll.fertilityModifier };
                const offspringRollsText = buildOffspringPairLine(character.name, 'NPC', rollRes, checks);

                const successfulRoll = rollRes.includes('Son') || rollRes.includes('Daughter');

                let color = COLORS.RED;
                let offspringResultText = inlineCode(character.name) + ' did **not** get a child with an NPC.';
                if (successfulRoll) {
                  color = COLORS.GREEN;
                  const { text: offspringText } = formatOffspringCounts(rollRes);
                  offspringResultText = inlineCode(character.name) + ' got the following with an NPC:\n' + offspringText;
                }

                const resultEmbed = new EmbedBuilder()
                  .setTitle('Result of roll')
                  .setDescription(offspringRollsText + '\n\n' + offspringResultText)
                  .setColor(color);

                // Save compact summary for final report (bastards only if children were produced)
                const offspringTextCompactBastard = successfulRoll ? formatOffspringCounts(rollRes).text : 'No children';
                if (offspringTextCompactBastard !== 'No children') {
                  finalBastardSummaries.push(inlineCode(character.name) + ': ' + offspringTextCompactBastard);
                }

                const resultMessage = await rollMessage.edit({
                  embeds: [relEmbed, bastEmbed, rollChancesEmbed, resultEmbed],
                  components: [continueRow],
                  withResponse: true
                });

                try {
                  const resultInteraction = await resultMessage.awaitMessageComponent({ filter: collectorFilter, time: 300_000 });
                  try {
                    await resultInteraction.deferUpdate();

                    if (successfulRoll) {
                      const savingEmbed = new EmbedBuilder()
                        .setTitle('Result of roll')
                        .setDescription(offspringRollsText + '\n\n' + offspringResultText + '\n\n' + italic('Saving result to database...'))
                        .setColor(color)
                      await resultMessage.edit({ embeds: [relEmbed, bastEmbed, rollChancesEmbed, savingEmbed] });
                    }

                  }
                  catch (error) {
                    console.log('Error deferring resultInteraction (bastard):', error);
                  }

                  if (resultInteraction.customId === 'continue') {
                    if (successfulRoll) {
                      for (const childRoll of rollRes) {
                        const wandererRegion = await Regions.findOne({ where: { name: 'Wanderer' } });
                        let regionId = wandererRegion.id;

                        const { character: childCharacter } = await addCharacterToDatabase(interactionUser, {
                          name: childRoll,
                          sex: childRoll === 'Son' ? 'Male' : 'Female',
                          regionId: regionId,
                          socialClassName: 'Notable',
                          yearOfMaturity: world.currentYear + 3,
                          parent1Id: character.id
                        });

                        try {
                          const parent1Snowflake = await getPlayerSnowflakeForCharacter(character.id);

                          await addPlayableChildToDatabase(interactionUser, { characterId: childCharacter.id, legitimacy: 'Illegitimate', contact1Snowflake: parent1Snowflake });
                        } catch (error) {
                          console.log(error);
                          throw new Error('Something went wrong when creating the playable child.');
                        }
                      }
                    }
                  }
                }
                catch (error) {
                  if (error.code === 'InteractionCollectorError') {
                    return resultMessage.edit({ content: TIMEOUT_MESSAGE, components: [], embeds: [] });
                  }
                  console.log(error);
                  return resultMessage.edit({ content: CANCEL_MESSAGE, components: [], embeds: [] });
                }
              }
            }
            catch (error) {
              if (error.code === 'InteractionCollectorError') {
                return rollMessage.edit({ content: TIMEOUT_MESSAGE, components: [], embeds: [] });
              }
              console.log(error);
              return rollMessage.edit({ content: CANCEL_MESSAGE, components: [], embeds: [] });
            }
          }

        }
      } catch (error) {
        if (error.code === 'InteractionCollectorError') {
          console.log('Start interaction collector timed out.', error.message);
          return startMessage.edit({ content: TIMEOUT_MESSAGE, components: [], embeds: [] });
        }
        console.log(error);
        return startMessage.edit({ content: CANCEL_MESSAGE, components: [], embeds: [] });
      }

      if (finalRelationshipSummaries.length === 0 && finalBastardSummaries.length === 0) {
        return startMessage.edit({ content: 'Finished offspring rolls. No children were produced.', components: [], embeds: [] });
      }

      // Build embeds array and send both summaries in the same message
      const embedsToSend = [];
      if (finalRelationshipSummaries.length > 0) {
        const relSummaryEmbed = new EmbedBuilder()
          .setTitle('Offspring summary — Relationships')
          .setDescription(finalRelationshipSummaries.join('\n'))
          .setColor(COLORS.BLUE);
        embedsToSend.push(relSummaryEmbed);
      }

      if (finalBastardSummaries.length > 0) {
        const bastSummaryEmbed = new EmbedBuilder()
          .setTitle('Offspring summary — Bastards')
          .setDescription(finalBastardSummaries.join('\n'))
          .setColor(COLORS.BLUE);
        embedsToSend.push(bastSummaryEmbed);
      }

      if (embedsToSend.length > 0) {
        return startMessage.edit({ embeds: embedsToSend, components: [] });
      }

      return null;
    }


    /**
     * Do death rolls
     */
    else if (interaction.options.getSubcommand() === 'death') {
      const skipInteractions = interaction.options.getBoolean('skip_interactions') ?? false;
      const shouldLog = interaction.options.getBoolean('should_log') ?? true;

      const nextYear = world.currentYear + 1;

      // Get all characters that are eligible for death rolls
      // Eligible if: age > 3, not commoner (if not wanderer region), 
      // not in Deceased table, and not a playable child
      const characters = await Characters.findAll({
        include: [
          { model: Regions, as: 'region' },
          { model: SocialClasses, as: 'socialClass' }
        ]
      });

      const deceasedCharacters = await Deceased.findAll({ attributes: ['characterId'] });
      const playableChildren = await PlayableChildren.findAll({ attributes: ['characterId'] });

      const eligibleCharacters = characters.filter(character => {
        const age = nextYear - character.yearOfMaturity;
        const isCommoner = character.socialClass.name === 'Commoner';
        const isWanderer = character.region.name === 'Wanderer';
        return age > 3 && (isWanderer || !isCommoner) && !deceasedCharacters.some(deceased => deceased.characterId === character.id) && !playableChildren.some(child => child.characterId === character.id);
      });

      // Sort the eligible characters by age ascending
      eligibleCharacters.sort((a, b) => {
        const ageA = nextYear - a.yearOfMaturity;
        const ageB = nextYear - b.yearOfMaturity;
        return ageA - ageB;
      });

      console.log(`Found ${eligibleCharacters.length} eligible characters for death rolls.`);

      if (eligibleCharacters.length === 0) {
        return interaction.editReply({ content: `There are no eligible characters for death rolls.`, components: [], embeds: [] });
      }

      // Make embeds with all of the dying characters, about 50 in each embed
      const embeds = [];
      const chunkSize = 50;
      for (let i = 0; i < eligibleCharacters.length; i += chunkSize) {
        const chunk = eligibleCharacters.slice(i, i + chunkSize);
        let description = `The Age specified here is the age the character will be turning in Year ${nextYear}.\n\n`;
        description += chunk.map(character => {
          const age = nextYear - character.yearOfMaturity;
          return `${inlineCode(character.name)} - Age: ${age}`;
        }).join('\n');

        // If not last chunk, add "and X more..." at the end
        if (i + chunk.length < eligibleCharacters.length) {
          const moreCount = eligibleCharacters.length - (i + chunk.length);
          description += `\n\nAnd ${moreCount} more...`;
        }

        const embed = new EmbedBuilder()
          .setTitle(`Eligible Characters for Death Rolls in Year ${nextYear} (Showing ${i + 1}-${i + chunk.length} of ${eligibleCharacters.length})`)
          .setDescription(description)
          .setColor(COLORS.BLUE);

        embeds.push(embed);
      }

      // Make an embed with the death roll chances wrt. age
      const deathRollChancesDescription =
        `**Death Roll Chances by Age:**\n` +
        `**Age 4:** 1-5 (1 PvE death)\n` +
        `**Age 5:** 1-25 (2 PvE deaths)\n` +
        `**Age 6:** 1-50 (3 PvE deaths)\n` +
        `**Age 7:** 1-75 (Guaranteed death)\n` +
        `**Age 8 or older:** 1-90 (Guaranteed death)\n\n` +
        `If a character accumulates more than 3 PvE deaths, they die.`;
      const deathRollChancesEmbed = new EmbedBuilder()
        .setTitle('Death Roll Chances')
        .setDescription(deathRollChancesDescription)
        .setColor(COLORS.BLUE);

      // Make a start embed
      const startEmbed = new EmbedBuilder()
        .setTitle('Ready to start')
        .setDescription('Please press Start when you are ready to start the death rolls.')
        .setColor(COLORS.BLUE);

      // Make continue button
      const saveAndContinueButton = new ButtonBuilder()
        .setCustomId('save_and_continue_death_rolls')
        .setLabel('Save and Continue')
        .setStyle(ButtonStyle.Primary);

      const saveAndContinueRow = new ActionRowBuilder()
        .addComponents(saveAndContinueButton);

      // Make roll button
      const rollButton = new ButtonBuilder()
        .setCustomId('roll_death_rolls')
        .setLabel('Roll')
        .setStyle(ButtonStyle.Primary);

      const skipButton = new ButtonBuilder()
        .setCustomId('skip_death_rolls')
        .setLabel('Skip')
        .setStyle(ButtonStyle.Secondary);

      const rollRow = new ActionRowBuilder()
        .addComponents(rollButton, skipButton);

      // Make a button to start the rolls
      const startButton = new ButtonBuilder()
        .setCustomId('start_death_rolls')
        .setLabel('Start Death Rolls')
        .setStyle(ButtonStyle.Primary);

      const startRow = new ActionRowBuilder()
        .addComponents(startButton);

      const startMessage = await interaction.editReply({
        embeds: [embeds[0], deathRollChancesEmbed, startEmbed],
        components: [startRow],
        withResponse: true
      });

      // Save channel for later use
      const channel = interaction.channel;

      const interactionUser = interaction.user;
      const collectorFilter = i => i.user.id === interactionUser.id;

      // Track who lost lives or died for final summary
      const lost1PveLife = [];
      const lost2PveLives = [];
      const lost3PveLives = [];
      const diedCharacters = [];

      try {
        const startInteraction = await startMessage.awaitMessageComponent({ filter: collectorFilter, time: 300_000 });
        try {
          await startInteraction.deferUpdate();
        }
        catch (error) {
          console.log('Failed to defer startInteraction (death rolls):', error);
        }

        if (startInteraction.customId === 'start_death_rolls') {
          if (skipInteractions && shouldLog) {
            // Make embed saying that death rolls are being processed without
            // interactions, and that results will be logged so it will take some time
            const processingEmbed = new EmbedBuilder()
              .setTitle('Processing Death Rolls')
              .setDescription('Death rolls are being processed without interactions. This may take some time. Results will be logged when complete.')
              .setColor(COLORS.BLUE);

            await startMessage.edit({
              embeds: [processingEmbed],
              components: [],
            });
          }

          // For each character, calculate death roll and show the embed that the character is in
          for (const [index, character] of eligibleCharacters.entries()) {
            // Skip interactions if specified
            if (skipInteractions) {
              const { resultDescription, color, roll, deathsFromRoll, status, dayOfDeath, monthOfDeath, yearOfDeath } = rollDeathAndGetResult(character, nextYear);
              await saveDeathResultToDatabase(character, interactionUser, nextYear, roll, deathsFromRoll, status, dayOfDeath, monthOfDeath, yearOfDeath, diedCharacters, lost1PveLife, lost2PveLives, lost3PveLives, shouldLog);
              continue;
            }

            const currentCharactersEmbed = embeds[Math.floor(index / chunkSize)];

            // Make embed for the current character with their name and their age
            const age = nextYear - character.yearOfMaturity;
            const player = await Players.findOne({ where: { characterId: character.id } });
            const description =
              `
              Name: ${inlineCode(character.name)}
              Age: ${inlineCode(age)}
              PvE Deaths: ${inlineCode(character.pveDeaths)}
              Played by: ${player ? userMention(player.id) : inlineCode('None')}
              `;
            const characterEmbed = new EmbedBuilder()
              .setTitle('Death Roll for ' + character.name)
              .setDescription(description)
              .setColor(COLORS.BLUE);

            // Add the character embed and change the button to roll
            const rollMessage = await startMessage.edit({
              embeds: [currentCharactersEmbed, deathRollChancesEmbed, characterEmbed],
              components: [rollRow],
              withResponse: true
            });

            try {
              const rollInteraction = await rollMessage.awaitMessageComponent({ filter: collectorFilter, time: 300_000 });
              try {
                await rollInteraction.deferUpdate();
              }
              catch (error) {
                console.log('Failed to defer rollInteraction (death):', error);
              }

              if (rollInteraction.customId === 'skip_death_rolls') {
                // Just continue to next character
                continue;
              }

              if (rollInteraction.customId === 'roll_death_rolls') {
                const { resultDescription, color, roll, deathsFromRoll, status, dayOfDeath, monthOfDeath, yearOfDeath } = rollDeathAndGetResult(character, nextYear);

                const resultEmbed = new EmbedBuilder()
                  .setTitle('Result of Death Roll')
                  .setDescription(resultDescription)
                  .setColor(color);

                // Show the result and the continue button
                const resultMessage = await rollMessage.edit({
                  embeds: [currentCharactersEmbed, deathRollChancesEmbed, resultEmbed],
                  components: [saveAndContinueRow],
                  withResponse: true
                });

                try {
                  const saveAndContinueInteraction = await resultMessage.awaitMessageComponent({ filter: collectorFilter, time: 300_000 });
                  try {
                    await saveAndContinueInteraction.deferUpdate();
                  }
                  catch (error) {
                    console.log('Failed to defer saveAndContinueInteraction:', error);
                  }

                  if (saveAndContinueInteraction.customId === 'save_and_continue_death_rolls') {
                    await saveDeathResultToDatabase(character, interactionUser, nextYear, roll, deathsFromRoll, status, dayOfDeath, monthOfDeath, yearOfDeath, diedCharacters, lost1PveLife, lost2PveLives, lost3PveLives, shouldLog);
                  }
                }
                catch (error) {
                  if (error.code === 'InteractionCollectorError') {
                    return resultMessage.edit({ content: TIMEOUT_MESSAGE, components: [], embeds: [] });
                  }
                  console.log(error);
                  return resultMessage.edit({ content: CANCEL_MESSAGE, components: [], embeds: [] });
                }
              }
            }
            catch (error) {
              if (error.code === 'InteractionCollectorError') {
                return rollMessage.edit({ content: TIMEOUT_MESSAGE, components: [], embeds: [] });
              }
              console.log(error);
              return rollMessage.edit({ content: CANCEL_MESSAGE, components: [], embeds: [] });
            }
          }
        }
      }
      catch (error) {
        if (error.code === 'InteractionCollectorError') {
          return startMessage.edit({ content: TIMEOUT_MESSAGE, components: [], embeds: [] });
        }
        console.log(error);
        return startMessage.edit({ content: CANCEL_MESSAGE, components: [], embeds: [] });
      }

      // Print the number of characters that lost lives or died
      console.log(`Death rolls complete. ${diedCharacters.length} characters died, ${lost3PveLives.length} lost 3 PvE lives, ${lost2PveLives.length} lost 2 PvE lives, ${lost1PveLife.length} lost 1 PvE life.`);

      // Summarize results
      // Make embeds for each category, these categories being:
      // - Died
      // - Lost 3 PvE lives
      // - Lost 2 PvE lives
      // - Lost 1 PvE life
      const summaryEmbeds = [];

      if (diedCharacters.length > 0) {
        const diedCharactersList = diedCharacters.map(({ character, player, dayOfDeath, monthOfDeath, yearOfDeath }) => `${inlineCode(character.name)} | ${inlineCode(`${dayOfDeath} ${monthOfDeath} ${yearOfDeath}`)} (${spoiler(player ? userMention(player.id) : 'None')})`);
        const diedCharactersEmbeds = makeDeathRollsSummaryEmbeds(diedCharactersList, 'Characters that will die in Year ' + nextYear, COLORS.RED);
        summaryEmbeds.push(...diedCharactersEmbeds);
      }

      if (lost3PveLives.length > 0) {
        const lost3PveLivesList = lost3PveLives.map(({ character, player }) => `${inlineCode(character.name)} (${spoiler(player ? userMention(player.id) : 'None')})`);
        const lost3PveLivesEmbeds = makeDeathRollsSummaryEmbeds(lost3PveLivesList, 'Characters that have lost 3 PvE lives', COLORS.ORANGE);
        summaryEmbeds.push(...lost3PveLivesEmbeds);
      }

      if (lost2PveLives.length > 0) {
        const lost2PveLivesList = lost2PveLives.map(({ character, player }) => `${inlineCode(character.name)} (${spoiler(player ? userMention(player.id) : 'None')})`);
        const lost2PveLivesEmbeds = makeDeathRollsSummaryEmbeds(lost2PveLivesList, 'Characters that have lost 2 PvE lives', COLORS.YELLOW);
        summaryEmbeds.push(...lost2PveLivesEmbeds);
      }

      if (lost1PveLife.length > 0) {
        const lost1PveLifeList = lost1PveLife.map(({ character, player }) => `${inlineCode(character.name)} (${spoiler(player ? userMention(player.id) : 'None')})`);
        const lost1PveLifeEmbeds = makeDeathRollsSummaryEmbeds(lost1PveLifeList, 'Characters that have lost 1 PvE life', COLORS.LIGHT_YELLOW);
        summaryEmbeds.push(...lost1PveLifeEmbeds);
      }

      const MAX_EMBEDS = 10;
      const MAX_EMBEDS_LENGTH_TOTAL = 6000;

      const summaryMessageURLs = [];

      // Send the summary embeds if any
      if (summaryEmbeds.length > 0) {
        let currentMessageEmbeds = [];
        let currentMessageEmbedsTotalLength = 0;

        // If too many embeds, or embeds exceed Discord's limit, split into multiple messages
        for (const embed of summaryEmbeds) {
          if (currentMessageEmbeds.length >= MAX_EMBEDS || currentMessageEmbedsTotalLength + embed.length > MAX_EMBEDS_LENGTH_TOTAL) {
            // Send current message
            const sentMessage = await channel.send({ embeds: currentMessageEmbeds });
            summaryMessageURLs.push(sentMessage.url);
            // Start new message
            currentMessageEmbeds = [embed];
            currentMessageEmbedsTotalLength = embed.length;
          } else {
            currentMessageEmbeds.push(embed);
            currentMessageEmbedsTotalLength += embed.length;
          }
        }

        if (currentMessageEmbeds.length > 0) {
          const sentMessage = await channel.send({ embeds: currentMessageEmbeds });
          summaryMessageURLs.push(sentMessage.url);
        }

        // Make an embed for the original message with link to the summary messages
        const summaryEmbed = new EmbedBuilder()
          .setColor(COLORS.GREEN)
          .setTitle('Death Rolls Summary')
          .setDescription(
            'See the summary messages here:\n\n' +
            summaryMessageURLs.map((url, index) => `**Summary Message ${index + 1}:** ${url}`).join('\n')
          );

        return startMessage.edit({ components: [], embeds: [summaryEmbed] });
      } else {
        return startMessage.edit({ content: 'Finished death rolls. No characters lost PvE lives or died.', components: [], embeds: [] });
      }
    }
  }
}