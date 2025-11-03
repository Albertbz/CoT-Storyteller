const { SlashCommandBuilder, InteractionContextType, MessageFlags, userMention, inlineCode, ButtonBuilder, ActionRowBuilder, ButtonStyle, subtext, EmbedBuilder, WorkerContextFetchingStrategy, italic, bold } = require('discord.js');
const { Players, Characters, Affiliations, SocialClasses, Worlds, Relationships, PlayableChildren } = require('../../dbObjects.js');
const { roles } = require('../../configs/ids.json');
const { Op } = require('sequelize');
const { postInLogChannel, assignCharacterToPlayer, ageToFertilityModifier, addCharacterToDatabase, addPlayableChildToDatabase } = require('../../misc.js');

function randomInteger(max) {
  return Math.floor(Math.random() * max + 1);
}

const { REL_THRESHOLDS, BAST_THRESHOLDS, OFFSPRING_LABELS, calculateFromThresholds, calculateRoll, formatOffspringCounts, getPlayerSnowflakeForCharacter } = require('../../helpers/rollHelper.js');
// Centralized messages
const CANCEL_MESSAGE = 'Something went wrong, or no button was interacted with for 5 minutes.';

// --- Helper utilities to reduce duplication ---
function buildOffspringPairLine(bearingName, conceivingName, rollRes, checks = {}) {
  let offspringText = '';
  if (Array.isArray(rollRes) && rollRes.length > 0) {
    const { text } = formatOffspringCounts(rollRes);
    offspringText = text || rollRes.join(', ');
  } else {
    offspringText = Array.isArray(rollRes) ? rollRes.join(', ') : String(rollRes);
  }

  let line = inlineCode(bearingName) + ' & ' + inlineCode(conceivingName) + ' (' + checks.fertilityModifier + '% fertile)' + ':\n' + bold(offspringText)
  const parts = []
  if (typeof checks.fertilityCheck !== 'undefined') parts.push('Fertility: ' + checks.fertilityCheck)
  if (typeof checks.offspringCheck !== 'undefined') parts.push('Offspring: ' + checks.offspringCheck)
  if (parts.length > 0) line += ' ' + italic('(' + parts.join(' / ') + ')')
  return line
}

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
  ,
  async execute(interaction) {
    const world = await Worlds.findOne({ where: { name: 'Elstrand' } })

    const startButton = new ButtonBuilder()
      .setCustomId('start')
      .setLabel('Start')
      .setStyle(ButtonStyle.Primary);

    const startRow = new ActionRowBuilder()
      .addComponents(startButton);

    const rollButton = new ButtonBuilder()
      .setCustomId('roll')
      .setLabel('Roll')
      .setStyle(ButtonStyle.Primary);
    const rollRow = new ActionRowBuilder()
      .addComponents(rollButton);

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
      .setColor(0x0000FF);

    const bastEmbed = new EmbedBuilder()
      .setTitle('**Offspring rolls — Bastards**')
      .setDescription(bastardsDescription)
      .setColor(0x0000FF);

    // Build an embed that shows the roll chance thresholds for relationships and bastards
    function buildChanceDescription(thresholds, labels) {
      let desc = '';
      let prev = 1;
      for (let i = 0; i < thresholds.length; i++) {
        const t = thresholds[i];
        const label = labels[i];
        if (t === 100) {
          const end = t - 1;
          if (prev < end) desc += `**${label}:** ${prev}-${end}\n`;
          else if (prev === end) desc += `**${label}:** ${prev}\n`;
          desc += `**Triplets+ (3-6 children):** 100\n`;
        } else {
          const end = t - 1;
          if (prev < end) desc += `**${label}:** ${prev}-${end}\n`;
          else if (prev === end) desc += `**${label}:** ${prev}\n`;
          prev = t;
        }
      }
      return desc;
    }

    const rollChancesDescription = '**Relationships**\n' + buildChanceDescription(REL_THRESHOLDS, OFFSPRING_LABELS) + '\n**Bastards**\n' + buildChanceDescription(BAST_THRESHOLDS, OFFSPRING_LABELS);

    const rollChancesEmbed = new EmbedBuilder()
      .setTitle('Offspring roll chances')
      .setDescription(rollChancesDescription)
      .setColor(0x0000FF);

    const controlEmbed = new EmbedBuilder()
      .setTitle('Ready to start')
      .setDescription('Please press Start when you are ready to start the offspring rolls.')
      .setColor(0x0000FF);

    const response = await interaction.reply({
      embeds: [relEmbed, bastEmbed, rollChancesEmbed, controlEmbed],
      components: [startRow],
      withResponse: true
    });

    const collectorFilter = i => i.user.id === interaction.user.id;
    const finalRelationshipSummaries = [];
    const finalBastardSummaries = [];

    try {
      const start = await response.resource.message.awaitMessageComponent({ filter: collectorFilter, time: 300_000 });
      await start.deferUpdate();

      if (start.customId === 'start') {
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
            .setColor(0x0000FF)

          const rollMessage = await interaction.editReply({
            embeds: [relEmbed, bastEmbed, rollChancesEmbed, embed],
            components: [rollRow],
            withResponse: true
          })

          try {
            const roll = await rollMessage.awaitMessageComponent({ filter: collectorFilter, time: 300_000 });
            await roll.deferUpdate();

            if (roll.customId === 'roll') {
              const bearingCharacterAge = world.currentYear - bearingCharacter.yearOfMaturity

              const offspringResults = [];
              for (const conceivingCharacter of conceivingCharacters) {
                const roll = calculateRoll({ age1: bearingCharacterAge, age2: world.currentYear - conceivingCharacter.yearOfMaturity })
                offspringResults.push({ rollRes: roll.result, checks: { fertilityCheck: roll.fertilityCheck, offspringCheck: roll.offspringCheck, fertilityModifier: roll.fertilityModifier }, conceivingCharacter: conceivingCharacter })
              }

              if (bearingCharacter.isRollingForBastards) {
                const roll = calculateRoll({ age1: bearingCharacterAge, isBastardRoll: true })
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
              let color = 0xFF0000

              if (successfulRolls.length > 0) {
                color = 0x00FF00
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
                    return interaction.editReply({ content: 'Something went wrong when trying to find the relationship for the successful roll.', components: [], embeds: [] })
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

              const resultMessage = await roll.editReply({
                embeds: [relEmbed, bastEmbed, rollChancesEmbed, embed],
                components: [continueRow],
                withResponse: true
              })

              try {
                const result = await resultMessage.awaitMessageComponent({ filter: collectorFilter, time: 300_000 });
                await result.deferUpdate();

                if (result.customId === 'continue') {

                  for (const childType of offspringResult.rolls) {
                    // Make the character
                    let affiliationId = (await Affiliations.findOne({ where: { name: 'Wanderer' } })).id;

                    if (offspringResult.relationship) {
                      // By default takes the affiliation of the conceiving parent
                      affiliationId = offspringResult.relationship.conceivingCharacter.affiliationId;
                    }

                    const childCharacter = await addCharacterToDatabase(result.user, {
                      name: childType,
                      sex: childType === 'Son' ? 'Male' : 'Female',
                      affiliationId: affiliationId,
                      socialClassName: offspringResult.relationship ? (offspringResult.relationship.inheritingTitle === 'Noble' ? 'Noble' : 'Notable') : 'Notable',
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

                      const playableChild = await addPlayableChildToDatabase(interaction.user, {
                        characterId: childCharacter.id,
                        legitimacy: offspringResult.relationship ? (offspringResult.relationship.isCommitted ? 'Legitimate' : 'Illegitimate') : 'Illegitimate',
                        contact1Snowflake: contact1Snowflake,
                        contact2Snowflake: contact2Snowflake,
                      });
                    }
                    catch (error) {
                      console.log(error)
                      return interaction.editReply({ content: 'Something went wrong when creating the playable child.', components: [], embeds: [] })
                    }
                  }
                }
              }
              catch (error) {
                console.log(error)
                return interaction.editReply({ content: CANCEL_MESSAGE, components: [], embeds: [] })
              }
            }
          }
          catch (error) {
            console.log(error)
            return interaction.editReply({ content: CANCEL_MESSAGE, components: [], embeds: [] });
          }
        }

        // Do bastard rolls
        for (const character of charactersRollingForBastardsFiltered) {
          // Calculate fertility modifier
          const fertilityModifier = ageToFertilityModifier(world.currentYear - character.yearOfMaturity) * 100;

          const embed = new EmbedBuilder()
            .setTitle('Bastard NPC roll')
            .setDescription('Rolling character: ' + inlineCode(character.name) + ' (' + fertilityModifier + '% fertile)')
            .setColor(0x0000FF);

          const rollMessage = await start.editReply({
            embeds: [relEmbed, bastEmbed, rollChancesEmbed, embed],
            components: [rollRow],
            withResponse: true
          });

          try {
            const rollMessageRes = await rollMessage.awaitMessageComponent({ filter: collectorFilter, time: 300_000 });
            await rollMessageRes.deferUpdate();

            if (rollMessageRes.customId === 'roll') {
              const characterAge = world.currentYear - character.yearOfMaturity;
              const roll = calculateRoll({ age1: characterAge, isBastardRoll: true });
              const rollRes = roll.result;
              const checks = { fertilityCheck: roll.fertilityCheck, offspringCheck: roll.offspringCheck, fertilityModifier: roll.fertilityModifier };
              const offspringRollsText = buildOffspringPairLine(character.name, 'NPC', rollRes, checks);

              const successfulRoll = rollRes.includes('Son') || rollRes.includes('Daughter');

              let color = 0xFF0000;
              let offspringResultText = inlineCode(character.name) + ' did **not** get a child with an NPC.';
              if (successfulRoll) {
                color = 0x00FF00;
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

              const resultMessage = await rollMessageRes.editReply({
                embeds: [relEmbed, bastEmbed, rollChancesEmbed, resultEmbed],
                components: [continueRow],
                withResponse: true
              });

              try {
                const result = await resultMessage.awaitMessageComponent({ filter: collectorFilter, time: 300_000 });
                await result.deferUpdate();

                if (result.customId === 'continue') {
                  if (successfulRoll) {
                    for (const childRoll of rollRes) {
                      let affiliationId = (await Affiliations.findOne({ where: { name: 'Wanderer' } })).id;

                      const childCharacter = await Characters.create({
                        name: childRoll,
                        sex: childRoll === 'Son' ? 'Male' : 'Female',
                        affiliationId: affiliationId,
                        socialClassName: 'Notable',
                        yearOfMaturity: world.currentYear + 3,
                        parent1Id: character.id,
                      });

                      await postInLogChannel(
                        'Character Created',
                        '**Created by: ' + userMention(interaction.user.id) + '** (during offspring rolls)\n\n' +
                        'Name: `' + childCharacter.name + '`\n' +
                        'Sex: `' + childCharacter.sex + '`\n' +
                        'Affiliation: `' + (await childCharacter.getAffiliation()).name + '`\n' +
                        'Social class: `' + childCharacter.socialClassName + '`\n' +
                        'Year of Maturity: `' + childCharacter.yearOfMaturity + '`',
                        0x008000
                      );

                      try {
                        const parent1Snowflake = await getPlayerSnowflakeForCharacter(character.id);
                        const playableChild = await PlayableChildren.create({
                          characterId: childCharacter.id,
                          legitimacy: 'Illegitimate',
                          contact1Snowflake: parent1Snowflake,
                        });

                        await postInLogChannel(
                          'Playable Child Created',
                          '**Created by: ' + userMention(interaction.user.id) + '** (during offspring rolls)\n\n' +
                          'Name: ' + inlineCode(childCharacter.name) + '\n' +
                          'Legitimacy: ' + inlineCode(playableChild.legitimacy) + '\n' +
                          'Parent1: ' + inlineCode(character.name) + '\n' +
                          'Contact1: ' + (playableChild.contact1Snowflake ? userMention(playableChild.contact1Snowflake) : 'None'),
                          0x008000
                        );
                      } catch (error) {
                        console.log(error);
                        return interaction.editReply({ content: 'Something went wrong when creating the playable child.', components: [], embeds: [] });
                      }
                    }
                  }
                }
              } catch (error) {
                console.log(error);
                return interaction.editReply({ content: CANCEL_MESSAGE, components: [], embeds: [] });
              }
            }
          } catch (error) {
            console.log(error);
            return interaction.editReply({ content: CANCEL_MESSAGE, components: [], embeds: [] });
          }
        }

      }
    } catch (error) {
      console.log(error);
      return interaction.editReply({ content: CANCEL_MESSAGE, components: [], embeds: [] });
    }

    if (finalRelationshipSummaries.length === 0 && finalBastardSummaries.length === 0) {
      return interaction.editReply({ content: 'Finished offspring rolls. No children were produced.', components: [], embeds: [] });
    }

    // Build embeds array and send both summaries in the same message
    const embedsToSend = [];
    if (finalRelationshipSummaries.length > 0) {
      const relSummaryEmbed = new EmbedBuilder()
        .setTitle('Offspring summary — Relationships')
        .setDescription(finalRelationshipSummaries.join('\n'))
        .setColor(0x0000FF);
      embedsToSend.push(relSummaryEmbed);
    }

    if (finalBastardSummaries.length > 0) {
      const bastSummaryEmbed = new EmbedBuilder()
        .setTitle('Offspring summary — Bastards')
        .setDescription(finalBastardSummaries.join('\n'))
        .setColor(0x0000FF);
      embedsToSend.push(bastSummaryEmbed);
    }

    if (embedsToSend.length > 0) {
      await interaction.editReply({ embeds: embedsToSend, components: [] });
    }

    return null;
  }
}

// Expose internals for unit tests (no public API change)
module.exports.__test = {
  formatOffspringCounts,
  buildOffspringPairLine,
  calculateFromThresholds,
};