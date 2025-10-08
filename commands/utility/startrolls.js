const { SlashCommandBuilder, InteractionContextType, MessageFlags, userMention, inlineCode, ButtonBuilder, ActionRowBuilder, ButtonStyle, subtext, EmbedBuilder, WorkerContextFetchingStrategy } = require('discord.js');
const { Players, Characters, Affiliations, SocialClasses, Worlds, Relationships, PlayableChildren } = require('../../dbObjects.js');
const { roles } = require('../../configs/ids.json');
const { Op } = require('sequelize');
const { postInLogChannel, assignCharacterToPlayer, ageToFertilityModifier, addCharacterToDatabase } = require('../../misc.js');

function randomInteger(max) {
  return Math.floor(Math.random() * max + 1);
}

function calculateFromThresholds(childless, son, daughter, twinDaughters, twinSons, twinFraternal) {
  const offspringCheck = randomInteger(100)

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
    if (isBastardRoll) {
      // Handle bastard roll chances
      return calculateFromThresholds(61, 79, 97, 98, 99, 100)
    }
    else {
      // Handle relationship roll chances
      return calculateFromThresholds(41, 66, 91, 94, 97, 100)
    }
  }
  else {
    return ['Failed Fertility Roll']
  }
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


    const embed = new EmbedBuilder()
      .setTitle('**Offspring rolls**')
      .setDescription(
        '**The following couples are rolling for children:**\n' +
        relationshipRollsText.join('\n') + '\n\n' +
        '**The following characters are rolling for bastards with an NPC:**\n' +
        bastardRollsTexs.join('\n') + '\n\n' +
        'Please press Start when you are ready to start the offspring rolls.'
      )
      .setColor(0x0000FF)

    const response = await interaction.reply({
      embeds: [embed],
      components: [startRow],
      withResponse: true
    });

    const collectorFilter = i => i.user.id === interaction.user.id;

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
              'Bearing partner: ' + inlineCode(bearingCharacter.name) + '\n' +
              'Conceiving partner(s): ' + conceivingCharacters.map(character => inlineCode(character.name)).join(', ') + bastardNPC
            )
            .setColor(0x0000FF)

          const rollMessage = await interaction.editReply({
            embeds: [embed],
            components: [rollRow],
            withResponse: true
          })

          try {
            const roll = await rollMessage.awaitMessageComponent({ filter: collectorFilter, time: 300_000 });

            if (roll.customId === 'roll') {
              const bearingCharacterAge = world.currentYear - bearingCharacter.yearOfMaturity

              const offspringResults = [];
              for (const conceivingCharacter of conceivingCharacters) {
                const rollRes = calculateRoll({ age1: bearingCharacterAge, age2: world.currentYear - conceivingCharacter.yearOfMaturity })
                offspringResults.push({ rollRes: rollRes, conceivingCharacter: conceivingCharacter })
              }

              if (bearingCharacter.isRollingForBastards) {
                const rollRes = calculateRoll({ age1: bearingCharacterAge, isBastardRoll: true })
                offspringResults.push({ rollRes: rollRes, conceivingCharacter: undefined })
              }

              const offspringRollsText = offspringResults.map(({ rollRes, conceivingCharacter }, _) => {
                if (conceivingCharacter) {
                  return inlineCode(bearingCharacter.name) + ' & ' + inlineCode(conceivingCharacter.name) + ': ' + rollRes.join(', ')
                }
                else {
                  return inlineCode(bearingCharacter.name) + ' & ' + inlineCode('NPC') + ': ' + rollRes.join(', ')
                }
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
                const numberSuccessful = randomInteger(successfulRolls.length) - 1
                const rollRes = successfulRolls[numberSuccessful].rollRes;
                const conceivingCharacter = successfulRolls[numberSuccessful].conceivingCharacter;


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


                // Calculate number of sons and daughters for text
                let amountOfSons = 0
                let amountOfDaughters = 0
                let childrenText = [];

                for (const roll of rollRes) {
                  if (roll === 'Son') amountOfSons++;
                  if (roll === 'Daughter') amountOfDaughters++;
                }

                if (amountOfSons > 1) {
                  childrenText.push(amountOfSons + ' Sons');
                }
                else if (amountOfSons === 1) {
                  childrenText.push(amountOfSons + ' Son');
                }

                if (amountOfDaughters > 1) {
                  childrenText.push(amountOfDaughters + ' Daughters');
                }
                else if (amountOfDaughters === 1) {
                  childrenText.push(amountOfDaughters + ' Daughter');
                }

                const offspringText = childrenText.join(' and ');

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

              await roll.update({});

              const resultMessage = await roll.editReply({
                embeds: [embed],
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
                      const parent1Player = await Players.findOne({ where: { characterId: bearingCharacter.id } })
                      let parent1Snowflake = parent1Player ? parent1Player.id : null;

                      let parent2Snowflake = null;

                      if (offspringResult.relationship) {
                        const parent1Player = await Players.findOne({ where: { characterId: offspringResult.relationship.bearingCharacter.id } });
                        parent1Snowflake = parent1Player ? parent1Player.id : null

                        const parent2Player = await Players.findOne({ where: { characterId: offspringResult.relationship.conceivingCharacter.id } });
                        parent2Snowflake = parent2Player ? parent2Player.id : null
                      }

                      const playableChild = await PlayableChildren.create({
                        characterId: childCharacter.id,
                        legitimacy: offspringResult.relationship ? (offspringResult.relationship.isCommitted ? 'Legitimate' : 'Illegitimate') : 'Illegitimate',
                        contact1Snowflake: parent1Snowflake,
                        contact2Snowflake: parent2Snowflake,
                      })

                      await postInLogChannel(
                        'Playable Child Created',
                        '**Created by: ' + userMention(interaction.user.id) + '** (during offspring rolls)\n\n' +
                        'Name: ' + inlineCode(childCharacter.name) + '\n' +
                        'Legitimacy: ' + inlineCode(playableChild.legitimacy) + '\n' +
                        'Parent1: ' + inlineCode(bearingCharacter.name) + '\n' +
                        'Parent2: ' + inlineCode(offspringResult.relationship ? offspringResult.relationship.conceivingCharacter.name : 'NPC') + '\n' +
                        'Contact1: ' + userMention(playableChild.contact1Snowflake) + '\n' +
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
            embeds: [embed],
            components: [rollRow],
            withResponse: true
          })

          try {
            const roll = await rollMessage.awaitMessageComponent({ filter: collectorFilter, time: 300_000 });

            if (roll.customId === 'roll') {
              const characterAge = world.currentYear - character.yearOfMaturity
              const rollRes = calculateRoll({ age1: characterAge, isBastardRoll: true })
              const offspringRollsText = inlineCode(character.name) + ' & ' + inlineCode('NPC') + ': ' + rollRes.join(', ')

              const successfulRoll = rollRes.includes('Son') || rollRes.includes('Daughter')

              let color = 0xFF0000;
              let offspringResultText = inlineCode(character.name) + ' did **not** get a child with an NPC.';
              if (successfulRoll) {
                color = 0x00FF00;

                let amountOfSons = 0
                let amountOfDaughters = 0
                let finalText = [];

                for (const roll of rollRes) {
                  if (roll === 'Son') amountOfSons++;
                  if (roll === 'Daughter') amountOfDaughters++;
                }

                if (amountOfSons > 1) {
                  finalText.push(amountOfSons + ' Sons');
                }
                else if (amountOfSons === 1) {
                  finalText.push(amountOfSons + ' Son');
                }

                if (amountOfDaughters > 1) {
                  finalText.push(amountOfDaughters + ' Daughters');
                }
                else if (amountOfDaughters === 1) {
                  finalText.push(amountOfDaughters + ' Daughter');
                }

                const offspringText = finalText.join(' and ');

                offspringResultText = inlineCode(character.name) + ' got the following with an NPC:\n' + offspringText
              }

              const embed = new EmbedBuilder()
                .setTitle('Result of roll')
                .setDescription(offspringRollsText + '\n\n' + offspringResultText)
                .setColor(color)

              await roll.update({});

              const resultMessage = await roll.editReply({
                embeds: [embed],
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
                        const parent1Snowflake = (await Players.findOne({ where: { characterId: character.id } })).id

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
    return interaction.editReply({ content: 'Finished offspring rolls.', components: [], embeds: [] });
  }
}