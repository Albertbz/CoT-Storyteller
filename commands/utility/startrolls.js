const { SlashCommandBuilder, InteractionContextType, MessageFlags, userMention, inlineCode, ButtonBuilder, ActionRowBuilder, ButtonStyle, subtext, EmbedBuilder, WorkerContextFetchingStrategy, italic, bold } = require('discord.js');
const { Players, Characters, Affiliations, SocialClasses, Worlds, Relationships, PlayableChildren } = require('../../dbObjects.js');
const { roles } = require('../../configs/ids.json');
const { Op } = require('sequelize');
const { postInLogChannel, assignCharacterToPlayer, ageToFertilityModifier, addCharacterToDatabase } = require('../../misc.js');

function randomInteger(max) {
  return Math.floor(Math.random() * max + 1);
}

function calculateFromThresholds(childless, son, daughter, twinDaughters, twinSons, twinFraternal, offspringCheck) {
  // offspringCheck is provided by the caller to make checks observable
  if (offspringCheck < childless) {
    return ['Childless']
  }
  else if (offspringCheck < son) {
    return ['Son']
  }
  else if (offspringCheck < daughter) {
    return ['Daughter']
  }
  else if (offspringCheck < twinDaughters) {
    return ['Daughter', 'Daughter']
  }
  else if (offspringCheck < twinSons) {
    return ['Son', 'Son']
  }
  else if (offspringCheck < twinFraternal) {
    return ['Son', 'Daughter']
  }
  else if (offspringCheck === 100) {
    const offspringAmount = randomInteger(4);

    const offspring = []
    for (let i = 0; i < offspringAmount; i++) {
      const sex = randomInteger(2) === 1 ? 'Son' : 'Daughter';
      offspring.push(sex);
    }
    return offspring
  }
}

function calculateRoll({ age1, age2 = 0, isBastardRoll = false } = {}) {
  const fertilityModifier = ageToFertilityModifier(age1) * ageToFertilityModifier(age2) * 100
  const fertilityCheck = randomInteger(100)

  if (fertilityCheck <= fertilityModifier) {
    const offspringCheck = randomInteger(100)
    if (isBastardRoll) {
      // Handle bastard roll chances
      const result = calculateFromThresholds(61, 79, 97, 98, 99, 100, offspringCheck)
      return { result, fertilityCheck, offspringCheck, fertilityModifier }
    }
    else {
      // Handle relationship roll chances
      const result = calculateFromThresholds(41, 66, 91, 94, 97, 100, offspringCheck)
      return { result, fertilityCheck, offspringCheck, fertilityModifier }
    }
  }
  else {
    return { result: ['Failed Fertility Roll'], fertilityCheck, fertilityModifier }
  }
}

// --- Helper utilities to reduce duplication ---
function buildOffspringPairLine(bearingName, conceivingName, rollRes, checks = {}) {
  let offspringText = '';
  if (Array.isArray(rollRes) && rollRes.length > 0) {
    const { text } = formatOffspringCounts(rollRes);
    offspringText = text || rollRes.join(', ');
  } else {
    offspringText = Array.isArray(rollRes) ? rollRes.join(', ') : String(rollRes);
  }

  let line = inlineCode(bearingName) + ' & ' + inlineCode(conceivingName) + ': ' + bold(offspringText)
  const parts = []
  if (typeof checks.fertilityCheck !== 'undefined') parts.push('Fertility: ' + checks.fertilityCheck)
  if (typeof checks.offspringCheck !== 'undefined') parts.push('Offspring: ' + checks.offspringCheck)
  if (parts.length > 0) line += ' ' + italic('(' + parts.join(' / ') + ')')
  return line
}

function formatOffspringCounts(rollRes) {
  let amountOfSons = 0
  let amountOfDaughters = 0
  for (const r of rollRes) {
    if (r === 'Son') amountOfSons++;
    if (r === 'Daughter') amountOfDaughters++;
  }

  // Special phrasing for twins/fraternal twins
  let text = '';
  if (rollRes.length === 2) {
    if (amountOfSons === 2) text = 'Twin Sons';
    else if (amountOfDaughters === 2) text = 'Twin Daughters';
    else if (amountOfSons === 1 && amountOfDaughters === 1) text = 'Fraternal Twins';
  }

  // Triplets and quadruplets
  if (rollRes.length === 3) {
    if (amountOfSons === 3) text = 'Triplet Sons';
    else if (amountOfDaughters === 3) text = 'Triplet Daughters';
    else text = 'Triplets (' + (amountOfSons + ' Son' + (amountOfSons !== 1 ? 's' : '')) + (amountOfDaughters > 0 ? ' and ' + amountOfDaughters + ' Daughter' + (amountOfDaughters !== 1 ? 's' : '') : '') + ')';
  }

  if (rollRes.length === 4) {
    if (amountOfSons === 4) text = 'Quadruplet Sons';
    else if (amountOfDaughters === 4) text = 'Quadruplet Daughters';
    else text = 'Quadruplets (' + (amountOfSons + ' Son' + (amountOfSons !== 1 ? 's' : '')) + (amountOfDaughters > 0 ? ' and ' + amountOfDaughters + ' Daughter' + (amountOfDaughters !== 1 ? 's' : '') : '') + ')';
  }

  if (!text) {
    const childrenText = [];
    if (amountOfSons > 1) childrenText.push(amountOfSons + ' Sons');
    else if (amountOfSons === 1) childrenText.push('Son');

    if (amountOfDaughters > 1) childrenText.push(amountOfDaughters + ' Daughters');
    else if (amountOfDaughters === 1) childrenText.push('Daughter');

    text = childrenText.join(' and ');
  }

  return { amountOfSons, amountOfDaughters, text };
}

async function getPlayerSnowflakeForCharacter(characterId) {
  const player = await Players.findOne({ where: { characterId } });
  return player ? player.id : null;
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

    const controlEmbed = new EmbedBuilder()
      .setTitle('Ready to start')
      .setDescription('Please press Start when you are ready to start the offspring rolls.')
      .setColor(0x0000FF);

    const response = await interaction.reply({
      embeds: [relEmbed, bastEmbed, controlEmbed],
      components: [startRow],
      withResponse: true
    });

    const collectorFilter = i => i.user.id === interaction.user.id;
    const finalRelationshipSummaries = [];
    const finalBastardSummaries = [];

    try {
      const start = await response.resource.message.awaitMessageComponent({ filter: collectorFilter, time: 300_000 });
      await start.update({})

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
            bastardNPC = ', `NPC`'
          }

          const embed = new EmbedBuilder()
            .setTitle('Relationship roll')
            .setDescription(
              'Bearing partner:\n' +
              inlineCode(bearingCharacter.name) + '\n\n' +
              'Conceiving partner(s):\n' +
              conceivingCharacters.map(character => inlineCode(character.name)).join('\n') + bastardNPC
            )
            .setColor(0x0000FF)

          const rollMessage = await interaction.editReply({
            embeds: [relEmbed, bastEmbed, embed],
            components: [rollRow],
            withResponse: true
          })

          try {
            const roll = await rollMessage.awaitMessageComponent({ filter: collectorFilter, time: 300_000 });

            if (roll.customId === 'roll') {
              const bearingCharacterAge = world.currentYear - bearingCharacter.yearOfMaturity

              const offspringResults = [];
              for (const conceivingCharacter of conceivingCharacters) {
                const roll = calculateRoll({ age1: bearingCharacterAge, age2: world.currentYear - conceivingCharacter.yearOfMaturity })
                offspringResults.push({ rollRes: roll.result, checks: { fertilityCheck: roll.fertilityCheck, offspringCheck: roll.offspringCheck }, conceivingCharacter: conceivingCharacter })
              }

              if (bearingCharacter.isRollingForBastards) {
                const roll = calculateRoll({ age1: bearingCharacterAge, isBastardRoll: true })
                offspringResults.push({ rollRes: roll.result, checks: { fertilityCheck: roll.fertilityCheck, offspringCheck: roll.offspringCheck }, conceivingCharacter: undefined })
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
                .setDescription(offspringRollsText.join('\n') + '\n\n' + offspringResultText)
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

              await roll.update({});

              const resultMessage = await roll.editReply({
                embeds: [relEmbed, bastEmbed, embed],
                components: [continueRow],
                withResponse: true
              })

              try {
                const result = await resultMessage.awaitMessageComponent({ filter: collectorFilter, time: 300_000 });

                if (result.customId === 'continue') {

                  for (const roll of offspringResult.rolls) {
                    // Make the character
                    let affiliationId = (await Affiliations.findOne({ where: { name: 'Wanderer' } })).id;

                    if (offspringResult.relationship) {
                      // By default takes the affiliation of the conceiving parent
                      affiliationId = offspringResult.relationship.conceivingCharacter.affiliationId;
                    }

                    const childCharacter = await Characters.create({
                      name: roll,
                      sex: roll === 'Son' ? 'Male' : 'Female',
                      affiliationId: affiliationId,
                      socialClassName: offspringResult.relationship ? (offspringResult.relationship.inheritingTitle === 'Noble' ? 'Noble' : 'Notable') : 'Notable',
                      yearOfMaturity: world.currentYear + 3,
                      parent1Id: offspringResult.relationship ? offspringResult.relationship.bearingCharacter.id : bearingCharacter.id,
                      parent2Id: offspringResult.relationship ? offspringResult.relationship.conceivingCharacter.id : null,
                    })

                    await postInLogChannel(
                      'Character Created',
                      '**Created by: ' + userMention(interaction.user.id) + '** (during offspring rolls)\n\n' +
                      'Name: `' + childCharacter.name + '`\n' +
                      'Sex: `' + childCharacter.sex + '`\n' +
                      'Affiliation: `' + (await childCharacter.getAffiliation()).name + '`\n' +
                      'Social class: `' + childCharacter.socialClassName + '`\n' +
                      'Year of Maturity: `' + childCharacter.yearOfMaturity + '`',
                      0x008000
                    )

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

                      const playableChild = await PlayableChildren.create({
                        characterId: childCharacter.id,
                        legitimacy: offspringResult.relationship ? (offspringResult.relationship.isCommitted ? 'Legitimate' : 'Illegitimate') : 'Illegitimate',
                        contact1Snowflake: contact1Snowflake,
                        contact2Snowflake: contact2Snowflake,
                      })

                      await postInLogChannel(
                        'Playable Child Created',
                        '**Created by: ' + userMention(interaction.user.id) + '** (during offspring rolls)\n\n' +
                        'Name: ' + inlineCode(childCharacter.name) + '\n' +
                        'Legitimacy: ' + inlineCode(playableChild.legitimacy) + '\n' +
                        'Parent1: ' + inlineCode(bearingCharacter.name) + '\n' +
                        'Parent2: ' + inlineCode(offspringResult.relationship ? offspringResult.relationship.conceivingCharacter.name : 'NPC') + '\n' +
                        'Contact1: ' + (playableChild.contact1Snowflake ? userMention(playableChild.contact1Snowflake) : 'None') + '\n' +
                        'Contact2: ' + (playableChild.contact2Snowflake ? userMention(playableChild.contact2Snowflake) : 'None'),
                        0x008000
                      )
                    }
                    catch (error) {
                      console.log(error)
                      return interaction.editReply({ content: 'Something went wrong when creating the playable child.', components: [], embeds: [] })
                    }
                  }

                  await result.update({})
                }
              }
              catch (error) {
                console.log(error)
                return interaction.editReply({ content: 'Confirmation not received within 5 minutes, cancelling.', components: [], embeds: [] })
              }
            }
          }
          catch (error) {
            console.log(error)
            return interaction.editReply({ content: 'Confirmation not received within 5 minutes, cancelling.', components: [], embeds: [] });
          }
        }

        // Do bastard rolls
        for (const character of charactersRollingForBastardsFiltered) {
          const embed = new EmbedBuilder()
            .setTitle('Bastard NPC roll')
            .setDescription(
              'Rolling character: ' + inlineCode(character.name)
            )
            .setColor(0x0000FF)


          const rollMessage = await start.editReply({
            embeds: [relEmbed, bastEmbed, embed],
            components: [rollRow],
            withResponse: true
          })

          try {
            const rollMessageRes = await rollMessage.awaitMessageComponent({ filter: collectorFilter, time: 300_000 });

            if (rollMessageRes.customId === 'roll') {
              const characterAge = world.currentYear - character.yearOfMaturity
              const roll = calculateRoll({ age1: characterAge, isBastardRoll: true })
              const rollRes = roll.result
              const checks = { fertilityCheck: roll.fertilityCheck, offspringCheck: roll.offspringCheck }
              const offspringRollsText = buildOffspringPairLine(character.name, 'NPC', rollRes, checks)

              const successfulRoll = rollRes.includes('Son') || rollRes.includes('Daughter')

              let color = 0xFF0000;
              let offspringResultText = inlineCode(character.name) + ' did **not** get a child with an NPC.';
              if (successfulRoll) {
                color = 0x00FF00;

                const { amountOfSons, amountOfDaughters, text: offspringText } = formatOffspringCounts(rollRes)

                offspringResultText = inlineCode(character.name) + ' got the following with an NPC:\n' + offspringText
              }

              const embed = new EmbedBuilder()
                .setTitle('Result of roll')
                .setDescription(offspringRollsText + '\n\n' + offspringResultText)
                .setColor(color)

              // Save compact summary for final report (bastards only if children were produced)
              const offspringTextCompactBastard = successfulRoll ? formatOffspringCounts(rollRes).text : 'No children';
              if (offspringTextCompactBastard !== 'No children') {
                finalBastardSummaries.push(inlineCode(character.name) + ': ' + offspringTextCompactBastard);
              }

              await rollMessageRes.update({});

              const resultMessage = await rollMessageRes.editReply({
                embeds: [relEmbed, bastEmbed, embed],
                components: [continueRow],
                withResponse: true
              })

              try {
                const result = await resultMessage.awaitMessageComponent({ filter: collectorFilter, time: 300_000 });

                if (result.customId === 'continue') {

                  if (successfulRoll) {
                    for (const roll of rollRes) {
                      // Make the character
                      let affiliationId = (await Affiliations.findOne({ where: { name: 'Wanderer' } })).id;

                      const childCharacter = await Characters.create({
                        name: roll,
                        sex: roll === 'Son' ? 'Male' : 'Female',
                        affiliationId: affiliationId,
                        socialClassName: 'Notable',
                        yearOfMaturity: world.currentYear + 3,
                        parent1Id: character.id,
                      })

                      await postInLogChannel(
                        'Character Created',
                        '**Created by: ' + userMention(interaction.user.id) + '** (during offspring rolls)\n\n' +
                        'Name: `' + childCharacter.name + '`\n' +
                        'Sex: `' + childCharacter.sex + '`\n' +
                        'Affiliation: `' + (await childCharacter.getAffiliation()).name + '`\n' +
                        'Social class: `' + childCharacter.socialClassName + '`\n' +
                        'Year of Maturity: `' + childCharacter.yearOfMaturity + '`',
                        0x008000
                      )

                      // Make the playable child
                      try {
                        const parent1Snowflake = await getPlayerSnowflakeForCharacter(character.id)

                        const playableChild = await PlayableChildren.create({
                          characterId: childCharacter.id,
                          legitimacy: 'Illegitimate',
                          contact1Snowflake: parent1Snowflake,
                        })

                        await postInLogChannel(
                          'Playable Child Created',
                          '**Created by: ' + userMention(interaction.user.id) + '** (during offspring rolls)\n\n' +
                          'Name: ' + inlineCode(childCharacter.name) + '\n' +
                          'Legitimacy: ' + inlineCode(playableChild.legitimacy) + '\n' +
                          'Parent1: ' + inlineCode(character.name) + '\n' +
                          'Contact1: ' + userMention(playableChild.contact1Snowflake),
                          0x008000
                        )
                      }
                      catch (error) {
                        console.log(error)
                        return interaction.editReply({ content: 'Something went wrong when creating the playable child.', components: [], embeds: [] })
                      }
                    }
                  }

                  await result.update({})
                }
              }
              catch (error) {
                console.log(error)
                return interaction.editReply({ content: 'Confirmation not received within 5 minutes, cancelling.', components: [], embeds: [] })
              }
            }
          }
          catch (error) {
            console.log(error)
            return interaction.editReply({ content: 'Confirmation not received within 5 minutes, cancelling.', components: [], embeds: [] });
          }
        }

      }
    }
    catch (error) {
      console.log(error)
      return interaction.editReply({ content: 'Confirmation not received within 5 minutes, cancelling.', components: [], embeds: [] });
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
};