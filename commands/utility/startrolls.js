const { SlashCommandBuilder, InteractionContextType, MessageFlags, userMention, inlineCode, ButtonBuilder, ActionRowBuilder, ButtonStyle, subtext, EmbedBuilder, italic, bold, spoiler, ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, Client } = require('discord.js');
const { Players, Characters, Regions, Houses, SocialClasses, Worlds, Relationships, PlayableChildren, Deceased, DeathRollDeaths } = require('../../dbObjects.js');
const { addCharacterToDatabase, addPlayableChildToDatabase, COLORS } = require('../../misc.js');
const { ageToFertilityModifier } = require('../../helpers/fertility.js');
const { REL_THRESHOLDS, BAST_THRESHOLDS, OFFSPRING_LABELS, calculateOffspringRoll, formatOffspringCounts, getPlayerSnowflakeForCharacter, buildOffspringPairLine, calculateDeathRoll, rollDeathAndGetResult, saveDeathRollResultToDatabase, makeDeathRollsSummaryMessages, buildOffspringChanceTextDisplay } = require('../../helpers/rollHelper.js');
const { WANDERER_REGION_ID, WORLD_ID } = require('../../constants.js');

// Centralized messages
const CANCEL_CONTAINER = new ContainerBuilder()
  .addTextDisplayComponents(
    new TextDisplayBuilder()
      .setContent(
        `# Stopping Rolls\n` +
        `An error occurred. Please let Albert know.`
      )
  )
const CANCEL_MESSAGE = 'Something went wrong. Please let Albert know.';
const TIMEOUT_CONTAINER = new ContainerBuilder()
  .addTextDisplayComponents(
    new TextDisplayBuilder()
      .setContent(
        `# Stopping Rolls\n` +
        'No response received for 5 minutes, stopping the rolls.'
      )
  );
const TIMEOUT_MESSAGE = 'No response received for 5 minutes, stopping the rolls.';

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
        .addChannelOption(option =>
          option
            .setName('summary_channel')
            .setDescription('The channel to post the summary of death rolls to.')
            .setRequired(true)
        )
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

    const world = await Worlds.findByPk(WORLD_ID)

    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'offspring') {
      // Get all intercharacter rolls, and make a textdisplay listing them
      const intercharacterRolls = await Relationships.findAll({
        include: [
          { model: Characters, as: 'bearingCharacter' },
          { model: Characters, as: 'conceivingCharacter' }
        ]
      })

      // Sort by bearing character name, then conceiving character name, alphabetically
      intercharacterRolls.sort((a, b) => {
        const aBearingName = a.bearingCharacter.name.toLowerCase();
        const bBearingName = b.bearingCharacter.name.toLowerCase();
        if (aBearingName < bBearingName) return -1;
        if (aBearingName > bBearingName) return 1;
        const aConceivingName = a.conceivingCharacter.name.toLowerCase();
        const bConceivingName = b.conceivingCharacter.name.toLowerCase();
        if (aConceivingName < bConceivingName) return -1;
        if (aConceivingName > bConceivingName) return 1;
        return 0;
      })

      const intercharacterRollsTextDisplay = new TextDisplayBuilder().setContent(
        `# Intercharacter Rolls\n` +
        `${intercharacterRolls.length > 0 ? intercharacterRolls.map(relationship => `***${relationship.bearingCharacter.name}*** & ***${relationship.conceivingCharacter.name}***`).join('\n') : '*None*'}\n\n` +
        `-# All of these characters are rolling for offspring with another character.`
      )

      // Get all NPC rolls, and make a textdisplay listing them
      const npcRollCharacters = await Characters.findAll({ where: { isRollingForBastards: true } });
      // Sort by character name alphabetically
      npcRollCharacters.sort((a, b) => {
        const aName = a.name.toLowerCase();
        const bName = b.name.toLowerCase();
        if (aName < bName) return -1;
        if (aName > bName) return 1;
        return 0;
      })

      const npcRollsTextDisplay = new TextDisplayBuilder().setContent(
        `# NPC Rolls\n` +
        `${npcRollCharacters.length > 0 ? npcRollCharacters.map(character => `***${character.name}***`).join('\n') : '*None*'}\n\n` +
        `-# All of these characters are rolling for offspring with an NPC.`
      )

      if (intercharacterRolls.length === 0 && npcRollCharacters.length === 0) {
        const noRollsContainer = new ContainerBuilder()
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
              `# No Offspring Rolls\n` +
              `There are no offspring rolls to process.`
            )
          )
        return interaction.editReply({ components: [noRollsContainer], flags: [MessageFlags.IsComponentsV2] });
      }

      // Make a container with the list of rolls to do, as well as the chance
      // thresholds for each type of roll
      const rollsAndChancesContainer = new ContainerBuilder()
        .addTextDisplayComponents(intercharacterRollsTextDisplay)
        .addSeparatorComponents(new SeparatorBuilder())
        .addTextDisplayComponents(npcRollsTextDisplay)
        .addSeparatorComponents(new SeparatorBuilder())
        .addTextDisplayComponents(buildOffspringChanceTextDisplay())

      // Make a container for the control buttons (start, cancel, skip)
      const controlsContainer = new ContainerBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `# Ready to start\n` +
            `Please press Start when you are ready to start the offspring rolls.\n` +
            `If you do not interact with the buttons for 5 minutes, the rolls will stop.`
          )
        )
        .addActionRowComponents(
          new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId('offspring-rolls-start')
              .setLabel('Start')
              .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
              .setCustomId('offspring-rolls-cancel')
              .setLabel('Cancel')
              .setStyle(ButtonStyle.Danger)
          )
        )

      // Send the initial message
      const message = await interaction.editReply({ components: [rollsAndChancesContainer, controlsContainer], flags: [MessageFlags.IsComponentsV2] });

      // Make a list of objects representing the rolls to do, with containers for
      // each roll, with info on the roll and the buttons to roll, skip, and cancel
      const rollsList = [];

      // Get all characters that are bearing in intercharacter rolls, making sure
      // not to include duplicates if a character is bearing in multiple rolls
      const bearingCharactersMap = new Map();
      for (const icr of intercharacterRolls) {
        if (!bearingCharactersMap.has(icr.bearingCharacter.id)) {
          bearingCharactersMap.set(icr.bearingCharacter.id, icr.bearingCharacter);
        }
      }

      const bearingCharacters = Array.from(bearingCharactersMap.values());

      for (const bearingCharacter of bearingCharacters) {
        // Get the rolls that the bearing character is participating in
        const intercharacterRollsForBearingCharacter = intercharacterRolls.filter(icr => icr.bearingCharacter.id === bearingCharacter.id);

        const isRollingWithNPC = npcRollCharacters.some(npcRoll => npcRoll.id === bearingCharacter.id);
        // If the bearing character is rolling with an NPC, remove from the NPC rolls list so that it doesn't get rolled for again when we loop through the NPC rolls
        if (isRollingWithNPC) {
          const npcRollIndex = npcRollCharacters.findIndex(npcRoll => npcRoll.id === bearingCharacter.id);
          if (npcRollIndex !== -1) {
            npcRollCharacters.splice(npcRollIndex, 1);
          }
        }

        const rollsText = [];
        for (const icr of intercharacterRollsForBearingCharacter) {
          const bearerFertility = await icr.bearingCharacter.fertility;
          const conceiverFertility = await icr.conceivingCharacter.fertility;

          rollsText.push(`- ***${icr.bearingCharacter.name}*** *(${bearerFertility * 100}% fertile)* & ***${icr.conceivingCharacter.name}*** *(${conceiverFertility * 100}% fertile)* | *Combined Fertility: ${(bearerFertility * conceiverFertility) * 100}%*`);
        }

        if (isRollingWithNPC) {
          const bearerFertility = (await intercharacterRollsForBearingCharacter[0].bearingCharacter.fertility) * 100;
          rollsText.push(`- ***${intercharacterRollsForBearingCharacter[0].bearingCharacter.name}*** *(${bearerFertility}% fertile)* & *NPC* | *Combined fertility: ${bearerFertility}%*`)
        }

        const container = new ContainerBuilder()
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
              `# Offspring Roll\n` +
              `### Offspring Rolls for ***${intercharacterRollsForBearingCharacter[0].bearingCharacter.name}***\n` +
              `This character is part of the following offspring rolls:\n` +
              `${rollsText.join('\n')}\n\n`
            )
          )
          .addActionRowComponents(
            new ActionRowBuilder().addComponents(
              new ButtonBuilder()
                .setCustomId(`offspring-rolls-roll`)
                .setLabel('Roll')
                .setStyle(ButtonStyle.Primary),
              new ButtonBuilder()
                .setCustomId(`offspring-rolls-skip`)
                .setLabel('Skip')
                .setStyle(ButtonStyle.Secondary),
              new ButtonBuilder()
                .setCustomId(`offspring-rolls-cancel`)
                .setLabel('Cancel')
                .setStyle(ButtonStyle.Danger)
            )
          )

        const performRoll = async () => {
          const offspringResults = [];
          for (const icr of intercharacterRollsForBearingCharacter) {
            const bearingCharacterAge = world.currentYear - icr.bearingCharacter.yearOfMaturity;
            const conceivingCharacterAge = world.currentYear - icr.conceivingCharacter.yearOfMaturity;
            const roll = calculateOffspringRoll({ age1: bearingCharacterAge, age2: conceivingCharacterAge })

            // If monogamous, give another roll if first did not produce children
            const isMonogamous = await icr.isMonogamous;
            if (isMonogamous && !(roll.result.includes('Son') || roll.result.includes('Daughter'))) {
              const secondRoll = calculateOffspringRoll({ age1: bearingCharacterAge, age2: conceivingCharacterAge })
              offspringResults.push({ result: secondRoll.result, checks: { fertilityCheck: secondRoll.fertilityCheck, offspringCheck: secondRoll.offspringCheck, fertilityModifier: secondRoll.fertilityModifier }, parent1Character: icr.bearingCharacter, parent2Character: icr.conceivingCharacter })
            }
            else {
              offspringResults.push({ result: roll.result, checks: { fertilityCheck: roll.fertilityCheck, offspringCheck: roll.offspringCheck, fertilityModifier: roll.fertilityModifier }, parent1Character: icr.bearingCharacter, parent2Character: icr.conceivingCharacter })
            }
          }

          if (isRollingWithNPC) {
            const bearingCharacterAge = world.currentYear - bearingCharacter.yearOfMaturity;
            const roll = calculateOffspringRoll({ age1: bearingCharacterAge, isBastardRoll: true })
            offspringResults.push({ result: roll.result, checks: { fertilityCheck: roll.fertilityCheck, offspringCheck: roll.offspringCheck, fertilityModifier: roll.fertilityModifier }, parent1Character: bearingCharacter, parent2Character: undefined })
          }

          // Filter for successful rolls (those that resulted in at least one child), and failed rolls
          const successfulRolls = offspringResults.filter(or => or.result.includes('Son') || or.result.includes('Daughter'));
          const failedRolls = offspringResults.filter(or => !or.result.includes('Son') && !or.result.includes('Daughter'));
          // Choose a successful roll at random if there are multiple, otherwise set to null
          const successfulRoll = successfulRolls.length > 0 ? pickRandomElement(successfulRolls) : null;

          // Change any other successful rolls to failed rolls, with new result "Other Roll Was Successful"
          for (const roll of successfulRolls) {
            if (successfulRoll !== roll) {
              roll.result = ['Other Roll Was Successful'];
              failedRolls.push(roll);
            }
          }

          const offspringResult = {
            successfulRoll: successfulRoll,
            failedRolls: failedRolls
          }

          const offspringRollsText = offspringResults.map(({ result, checks, parent1Character, parent2Character }) => {
            return buildOffspringPairLine(parent1Character.name, parent2Character ? parent2Character.name : 'NPC', result, checks)
          });

          const offspringResultText = successfulRoll ? `***${successfulRoll.parent1Character.name}*** and ${successfulRoll.parent2Character ? `***${successfulRoll.parent2Character.name}***` : '*an NPC*'} have succeeded in having **${formatOffspringCounts(successfulRoll.result).text}**!` : `***${bearingCharacter.name}*** did not have any offspring.`;
          const color = successfulRoll ? COLORS.GREEN : COLORS.RED;

          const resultContainer = new ContainerBuilder()
            .addTextDisplayComponents(
              new TextDisplayBuilder().setContent(
                `# Result of roll\n` +
                `### Roll(s)\n` +
                offspringRollsText.join('\n\n') +
                `\n` +
                `### Result\n` +
                offspringResultText
              )
            )
            .addActionRowComponents(
              new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                  .setCustomId('offspring-rolls-save')
                  .setLabel('Save and Continue')
                  .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                  .setCustomId('offspring-rolls-skip')
                  .setLabel('Skip')
                  .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                  .setCustomId('offspring-rolls-cancel')
                  .setLabel('Cancel')
                  .setStyle(ButtonStyle.Danger)
              )
            )
            .setAccentColor(color);

          return { resultContainer: resultContainer, offspringResult: offspringResult };
        }

        rollsList.push({ container: container, performRoll: performRoll });
      }

      // Do the same for NPC rolls
      for (const character of npcRollCharacters) {
        const characterFertility = await character.fertility;
        const rollsText = `- ***${character.name}*** *(${characterFertility * 100}% fertile)* & *NPC* | *Combined fertility: ${characterFertility * 100}%*`;

        const container = new ContainerBuilder()
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
              `# Offspring Roll\n` +
              `### Offspring Roll for ***${character.name}***\n` +
              `This character is part of the following offspring roll:\n` +
              `${rollsText}\n\n`
            )
          )
          .addActionRowComponents(
            new ActionRowBuilder().addComponents(
              new ButtonBuilder()
                .setCustomId(`offspring-rolls-roll`)
                .setLabel('Roll')
                .setStyle(ButtonStyle.Primary),
              new ButtonBuilder()
                .setCustomId(`offspring-rolls-skip`)
                .setLabel('Skip')
                .setStyle(ButtonStyle.Secondary),
              new ButtonBuilder()
                .setCustomId(`offspring-rolls-cancel`)
                .setLabel('Cancel')
                .setStyle(ButtonStyle.Danger)
            )
          )

        const performRoll = async () => {
          const characterAge = world.currentYear - character.yearOfMaturity;
          const roll = calculateOffspringRoll({ age1: characterAge, isBastardRoll: true })

          const isSuccessful = roll.result.includes('Son') || roll.result.includes('Daughter');

          const offspringResult = {
            successfulRoll: isSuccessful ? { result: roll.result, checks: { fertilityCheck: roll.fertilityCheck, offspringCheck: roll.offspringCheck, fertilityModifier: roll.fertilityModifier }, parent1Character: character, parent2Character: undefined } : null,
            failedRolls: !isSuccessful ? [{ result: roll.result, checks: { fertilityCheck: roll.fertilityCheck, offspringCheck: roll.offspringCheck, fertilityModifier: roll.fertilityModifier }, parent1Character: character, parent2Character: undefined }] : []
          }

          const offspringResultText = isSuccessful ? `***${character.name}*** and *an NPC* have succeeded in having **${formatOffspringCounts(roll.result).text}**!` : `***${character.name}*** did not have any offspring.`;
          const color = isSuccessful ? COLORS.GREEN : COLORS.RED;

          const resultContainer = new ContainerBuilder()
            .addTextDisplayComponents(
              new TextDisplayBuilder().setContent(
                `# Result of roll\n` +
                `### Roll\n` +
                buildOffspringPairLine(character.name, 'NPC', roll.result, { fertilityCheck: roll.fertilityCheck, offspringCheck: roll.offspringCheck, fertilityModifier: roll.fertilityModifier }) +
                `\n` +
                `### Result\n` +
                offspringResultText
              )
            )
            .addActionRowComponents(
              new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                  .setCustomId('offspring-rolls-save')
                  .setLabel('Save and Continue')
                  .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                  .setCustomId('offspring-rolls-skip')
                  .setLabel('Skip')
                  .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                  .setCustomId('offspring-rolls-cancel')
                  .setLabel('Cancel')
                  .setStyle(ButtonStyle.Danger)
              )
            )
            .setAccentColor(color);

          return { resultContainer: resultContainer, offspringResult: offspringResult };
        }

        rollsList.push({ container: container, performRoll: performRoll });
      }


      let rollIndex = 0;
      let currentOffspringResult = null;
      let currentResultContainer = null;

      // Create a listener for the control buttons that will handle starting the 
      // rolls, cancelling, and skipping. If start is pressed, show a 
      // confirmation message and then start the rolls. If cancel is pressed, 
      // show a cancellation message and stop. If skip is pressed, skip to the 
      // next roll.
      const filter = i => {
        try {
          return i.user.id === interaction.user.id;
        }
        catch (error) {
          console.error('Error in control buttons collector filter:', error);
        }
      };
      const collector = message.createMessageComponentCollector({ filter, time: 300_000 });

      collector.on('ignore', i => {
        i.reply({ content: 'You cannot interact with these buttons because you were not the one to initiate the rolls.', flags: [MessageFlags.Ephemeral] });
      })

      collector.on('collect', async i => {
        await i.deferUpdate();

        // Cancel rolls
        if (i.customId === 'offspring-rolls-cancel') {
          collector.stop();

          const cancelledContainer = new ContainerBuilder()
            .addTextDisplayComponents(
              new TextDisplayBuilder().setContent(
                `# Cancelled Offspring Rolls\n` +
                `The offspring rolls have been cancelled. Any rolls that were already done will not be undone, but no further rolls will be processed.`
              )
            )

          return message.edit({ components: [cancelledContainer], flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] });
        }

        // Start rolls
        if (i.customId === 'offspring-rolls-start') {
          // Restart the timer on the collector
          collector.resetTimer();
          // Show the first roll container
          await message.edit({ components: [rollsAndChancesContainer, rollsList[rollIndex].container], flags: [MessageFlags.IsComponentsV2] })
        }

        // Skip rolls
        if (i.customId === 'offspring-rolls-skip') {
          // Restart the timer on the collector
          collector.resetTimer();

          // Increment roll index, show next roll container if there are more rolls, otherwise show finished message and stop collector
          rollIndex++;
          if (rollIndex >= rollsList.length) {
            collector.stop();

            const finishedContainer = new ContainerBuilder()
              .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                  `# Finished Offspring Rolls\n` +
                  `All offspring rolls have been completed.`
                )
              )
            return message.edit({ components: [finishedContainer], flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] });
          }
          else {
            await message.edit({ components: [rollsAndChancesContainer, rollsList[rollIndex].container], flags: [MessageFlags.IsComponentsV2] })
          }
        }

        if (i.customId === 'offspring-rolls-roll') {
          // Restart the timer on the collector
          collector.resetTimer();

          // Perform the roll, get the result container and the offspring result object that has the rolls and the relationship (if any) for the successful roll
          const { resultContainer, offspringResult } = await rollsList[rollIndex].performRoll();
          currentResultContainer = resultContainer;
          currentOffspringResult = offspringResult;
          // Show the result container
          await message.edit({ components: [rollsAndChancesContainer, resultContainer], flags: [MessageFlags.IsComponentsV2] });
        }

        if (i.customId === 'offspring-rolls-save') {
          // Restart the timer on the collector
          collector.resetTimer();

          // Update the message to show that the result is being saved and sent to the parents
          currentResultContainer.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
              `-# Saving result and notifying players. Please wait...`
            )
          )

          await message.edit({ components: [rollsAndChancesContainer, currentResultContainer], flags: [MessageFlags.IsComponentsV2] });

          // If there was a successful roll, create the child characters and 
          // playable child entries in the database, and send a DM to the parents 
          // notifying them of their new child(ren)
          if (currentOffspringResult && currentOffspringResult.successfulRoll) {
            let regionId = WANDERER_REGION_ID;
            let houseId = null;
            let socialClassName = 'Notable';
            let legitimacy = 'Illegitimate';

            if (currentOffspringResult.successfulRoll.parent2Character) {
              // Find the relationship between the parents to determine the region, house, social class, and legitimacy of the child
              const relationship = await Relationships.findOne({
                where: {
                  bearingCharacterId: currentOffspringResult.successfulRoll.parent1Character.id,
                  conceivingCharacterId: currentOffspringResult.successfulRoll.parent2Character.id
                }
              });

              if (relationship) {
                regionId = currentOffspringResult.successfulRoll.parent2Character.regionId;
                houseId = currentOffspringResult.successfulRoll.parent2Character.houseId;
                socialClassName = relationship.inheritedTitle === 'Noble' ? 'Noble' : 'Notable';
                legitimacy = relationship.isCommitted ? 'Legitimate' : 'Illegitimate';
              }
            }

            // Get the snowflakes of the players playing as the parents, if any, to add as contacts for the child
            const snowflakeList = [];
            const parent1Player = currentOffspringResult.successfulRoll.parent1Character ? await Players.findOne({ where: { characterId: currentOffspringResult.successfulRoll.parent1Character.id } }) : null;
            if (parent1Player) {
              snowflakeList.push(parent1Player.id);
            }

            const parent2Player = currentOffspringResult.successfulRoll.parent2Character ? await Players.findOne({ where: { characterId: currentOffspringResult.successfulRoll.parent2Character.id } }) : null;
            if (parent2Player) {
              snowflakeList.push(parent2Player.id);
            }

            for (const childType of currentOffspringResult.successfulRoll.result) {
              // Make the character for this child
              const { character: childCharacter } = await addCharacterToDatabase(i.user, {
                name: childType,
                sex: childType.includes('Son') ? 'Male' : 'Female',
                regionId: regionId,
                houseId: houseId,
                socialClassName: socialClassName,
                yearOfMaturity: world.currentYear + 3,
                yearOfCreation: world.currentYear + 1,
                parent1Id: currentOffspringResult.successfulRoll.parent1Character.id,
                parent2Id: currentOffspringResult.successfulRoll.parent2Character ? currentOffspringResult.successfulRoll.parent2Character.id : null,
              })

              // Make the playable child entry for this child
              await addPlayableChildToDatabase(i.user, {
                characterId: childCharacter.id,
                legitimacy: legitimacy,
                contact1Snowflake: snowflakeList[0] || null,
                contact2Snowflake: snowflakeList[1] || null,
              });
            }

            // Send a DM to the parents notifying them of their new child(ren)
            const successfulRollContainer = new ContainerBuilder()
              .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                  `# Offspring Roll Result\n` +
                  `Congratulations! The roll between ***${currentOffspringResult.successfulRoll.parent1Character.name}*** and ${currentOffspringResult.successfulRoll.parent2Character ? `***${currentOffspringResult.successfulRoll.parent2Character.name}***` : '*an NPC*'} has resulted in **${formatOffspringCounts(currentOffspringResult.successfulRoll.result).text}**!\n` +
                  `Your new offspring can be managed in the Offspring Dashboard, and will be born in the next in-game year. When the time comes, please make sure to chisel out a block, rename it with your child's name, and make it into a tabletop piece. Then, use the Offspring Dashboard to assign them a name. Otherwise, they will be considered an orphan.`
                )
              )
              .setAccentColor(COLORS.GREEN);

            for (const snowflake of snowflakeList) {
              try {
                const user = await i.client.users.fetch(snowflake);
                await user.send({ components: [successfulRollContainer], flags: [MessageFlags.IsComponentsV2] });
              } catch (error) {
                console.log(`Not able to send DM about successful offspring roll to user with id ${snowflake}:`, error.message);
              }
            }
          }

          if (currentOffspringResult && currentOffspringResult.failedRolls.length > 0) {
            for (const failedRoll of currentOffspringResult.failedRolls) {
              const failedRollContainer = new ContainerBuilder()
                .addTextDisplayComponents(
                  new TextDisplayBuilder().setContent(
                    `# Offspring Roll Result\n` +
                    `Unfortunately, the roll between ***${failedRoll.parent1Character.name}*** and ${failedRoll.parent2Character ? `***${failedRoll.parent2Character.name}***` : '*an NPC*'} has failed to produce any offspring. Better luck next time!`
                  )
                )
                .setAccentColor(COLORS.RED);

              // Get the snowflakes of the players playing as the parents in the failed rolls
              const snowflakeList = [];
              const parent1Player = failedRoll.parent1Character ? await Players.findOne({ where: { characterId: failedRoll.parent1Character.id } }) : null;
              if (parent1Player) {
                snowflakeList.push(parent1Player.id);
              }

              const parent2Player = failedRoll.parent2Character ? await Players.findOne({ where: { characterId: failedRoll.parent2Character.id } }) : null;
              if (parent2Player) {
                snowflakeList.push(parent2Player.id);
              }

              for (const snowflake of snowflakeList) {
                try {
                  const user = await i.client.users.fetch(snowflake);
                  await user.send({ components: [failedRollContainer], flags: [MessageFlags.IsComponentsV2] });
                } catch (error) {
                  console.log(`Not able to send DM about failed offspring roll to user with id ${snowflake}:`, error.message);
                }
              }
            }
          }

          // Increment roll index, show next roll container if there are more rolls, otherwise show finished message and stop collector
          rollIndex++;
          if (rollIndex >= rollsList.length) {
            collector.stop();

            const finishedContainer = new ContainerBuilder()
              .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                  `# Finished Offspring Rolls\n` +
                  `All offspring rolls have been completed. All those that were opted in to either type of roll have been notified of their results. `
                )
              )
            return message.edit({ components: [finishedContainer], flags: [MessageFlags.IsComponentsV2] });
          }
          else {
            return message.edit({ components: [rollsAndChancesContainer, rollsList[rollIndex].container], flags: [MessageFlags.IsComponentsV2] })
          }
        }
      });

      collector.on('end', async (collected, reason) => {
        if (reason === 'time') {
          const timeoutContainer = new ContainerBuilder()
            .addTextDisplayComponents(
              new TextDisplayBuilder().setContent(
                `# Offspring Rolls Timeout\n` +
                `The offspring rolls have timed out. No further rolls will be processed.`
              )
            )

          return message.edit({ components: [timeoutContainer], flags: [MessageFlags.IsComponentsV2] });
        }
      });
    }

    /**
     * Do death rolls
     */
    else if (interaction.options.getSubcommand() === 'death') {
      const summaryChannel = interaction.options.getChannel('summary_channel');
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
        const isWanderer = character.region.id === WANDERER_REGION_ID;
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

      // Make textdisplays with all of the dying characters, about 50 in each textdisplay
      const dyingCharactersTextDisplays = [];
      const chunkSize = 50;
      for (let i = 0; i < eligibleCharacters.length; i += chunkSize) {
        const chunk = eligibleCharacters.slice(i, i + chunkSize);
        let content = `The Age specified here is the age the character will be turning in Year ${nextYear}.\n\n`;
        content += chunk.map(character => {
          const age = nextYear - character.yearOfMaturity;
          return `${inlineCode(character.name)} | Age: ${age}`;
        }).join('\n');

        const textDisplay = new TextDisplayBuilder()
          .setContent(
            `# Eligible Characters for Death Rolls in Year ${nextYear}\n` +
            content + `\n\n` +
            `-# (Showing ${i + 1}-${i + chunk.length} of ${eligibleCharacters.length})`
          )

        dyingCharactersTextDisplays.push(textDisplay);
      }

      // Make a textdisplay with the death roll chances wrt. age
      const deathRollChancesDescription =
        `**Age 4:** 1-5 (1 PvE death)\n` +
        `**Age 5:** 1-25 (2 PvE deaths)\n` +
        `**Age 6:** 1-50 (3 PvE deaths)\n` +
        `**Age 7:** 1-75 (Guaranteed death)\n` +
        `**Age 8 or older:** 1-90 (Guaranteed death)\n\n` +
        `If a character accumulates more than 3 PvE deaths, they die.`;
      const deathRollChancesTextDisplay = new TextDisplayBuilder()
        .setContent(
          `# Death Roll Chances\n` +
          deathRollChancesDescription
        );

      // Make a textdisplay with instructions and a start button
      const startTextDisplay = new TextDisplayBuilder()
        .setContent(
          `# Ready to start\n` +
          `Please press Start when you are ready to start the death rolls.\n` +
          `If you do not interact with the buttons for 5 minutes, the rolls will stop.`
        );

      // Make action row with start and cancel buttons
      const startActionRow = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId('start_death_rolls')
            .setLabel('Start')
            .setStyle(ButtonStyle.Primary),
          new ButtonBuilder()
            .setCustomId('cancel_death_rolls')
            .setLabel('Cancel')
            .setStyle(ButtonStyle.Danger)
        );

      // Make action row with roll and skip buttons
      const rollActionRow = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId('roll_death_rolls')
            .setLabel('Roll')
            .setStyle(ButtonStyle.Primary),
          new ButtonBuilder()
            .setCustomId('skip_death_rolls')
            .setLabel('Skip')
            .setStyle(ButtonStyle.Secondary)
        );

      // Make action row with save and continue button
      const saveAndContinueActionRow = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId('save_and_continue_death_rolls')
            .setLabel('Save and Continue')
            .setStyle(ButtonStyle.Primary)
        );

      // Make separator component for splitting textdisplays
      const separator = new SeparatorBuilder();

      // Create container with all components to send the initial message
      const container = new ContainerBuilder()
        .addTextDisplayComponents(dyingCharactersTextDisplays[0])
        .addSeparatorComponents(separator)
        .addTextDisplayComponents(deathRollChancesTextDisplay);

      const startContainer = new ContainerBuilder()
        .addTextDisplayComponents(startTextDisplay)
        .addActionRowComponents(startActionRow);

      const startMessage = await interaction.editReply({
        components: [container, startContainer],
        flags: MessageFlags.IsComponentsV2,
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

        if (startInteraction.customId === 'cancel_death_rolls') {
          // Handle cancellation
          console.log('Death rolls cancelled by user.');
          const cancellationTextDisplay = new TextDisplayBuilder()
            .setContent(
              `# Death Rolls Cancelled\n` +
              `Death rolls have been cancelled. No characters have been affected.`
            );

          const cancellationContainer = new ContainerBuilder()
            .addTextDisplayComponents(cancellationTextDisplay);

          return startMessage.edit({ components: [cancellationContainer] });
        }

        if (startInteraction.customId === 'start_death_rolls') {
          if (skipInteractions && shouldLog) {
            // Make container saying that death rolls are being processed without
            // interactions, and that results will be logged so it will take some time
            const processingContainer = new ContainerBuilder()
              .addTextDisplayComponents(
                new TextDisplayBuilder()
                  .setContent(
                    `# Processing Death Rolls\n` +
                    `Death rolls are being processed without interactions. This may take some time. Results will be logged when complete.`
                  )
              );

            await startMessage.edit({ components: [processingContainer] });
          }

          // For each character, calculate death roll and show the embed that the character is in
          for (const [index, character] of eligibleCharacters.entries()) {
            // Skip interactions if specified
            if (skipInteractions) {
              const { resultDescription, color, roll, deathsFromRoll, status, dayOfDeath, monthOfDeath, yearOfDeath } = rollDeathAndGetResult(character, nextYear);
              await saveDeathRollResultToDatabase(character, interactionUser, nextYear, roll, deathsFromRoll, status, dayOfDeath, monthOfDeath, yearOfDeath, diedCharacters, lost1PveLife, lost2PveLives, lost3PveLives, shouldLog);
              continue;
            }

            const currentDyingCharactersTextDisplay = dyingCharactersTextDisplays[Math.floor(index / chunkSize)];

            // Make textdisplay for the current character with their name and their age
            const age = nextYear - character.yearOfMaturity;
            const player = await character.getPlayer();
            const description =
              `**Name:** ${character.name}\n` +
              `**Age:** ${age}\n` +
              `**PvE Deaths:** ${character.pveDeaths}\n` +
              `**Being played by:** ${player ? userMention(player.id) : 'None'}`;
            const characterTextDisplay = new TextDisplayBuilder()
              .setContent(
                `# Death Roll for ${inlineCode(character.name)}\n` +
                description
              );

            // Replace the first textdisplay in the container with the current one
            container.spliceComponents(0, 1, currentDyingCharactersTextDisplay);

            // Add the roll buttons as new components
            const rollContainer = new ContainerBuilder()
              .addTextDisplayComponents(characterTextDisplay)
              .addActionRowComponents(rollActionRow);

            const rollMessage = await startMessage.edit({
              components: [container, rollContainer],
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

                const resultText = (
                  `# Result for ${inlineCode(character.name)}\n` +
                  resultDescription
                )
                const resultTextDisplay = new TextDisplayBuilder()
                  .setContent(resultText);

                const resultContainer = new ContainerBuilder()
                  .addTextDisplayComponents(resultTextDisplay)
                  .addActionRowComponents(saveAndContinueActionRow)
                  .setAccentColor(color);


                // Show the result and the continue button
                const resultMessage = await rollMessage.edit({
                  components: [container, resultContainer],
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
                    // Update the message to say saving...
                    const resultSavingTextDisplay = new TextDisplayBuilder()
                      .setContent(
                        resultText + '\n\n' +
                        italic('Saving result to database...')
                      );

                    resultContainer.spliceComponents(0, 1, resultSavingTextDisplay);
                    await resultMessage.edit({ components: [container, resultContainer] });

                    // Save the result to the database
                    await saveDeathRollResultToDatabase(character, interactionUser, nextYear, roll, deathsFromRoll, status, dayOfDeath, monthOfDeath, yearOfDeath, diedCharacters, lost1PveLife, lost2PveLives, lost3PveLives, shouldLog);
                  }
                }
                catch (error) {
                  if (error.code === 'InteractionCollectorError') {
                    return resultMessage.edit({ components: [TIMEOUT_CONTAINER] })
                  }
                  console.log(error);
                  return resultMessage.edit({ components: [CANCEL_CONTAINER] })
                }
              }
            }
            catch (error) {
              if (error.code === 'InteractionCollectorError') {
                return rollMessage.edit({ components: [TIMEOUT_CONTAINER] })
              }
              console.log(error);
              return rollMessage.edit({ components: [CANCEL_CONTAINER] })
            }
          }
        }
      }
      catch (error) {
        if (error.code === 'InteractionCollectorError') {
          return startMessage.edit({ components: [TIMEOUT_CONTAINER] });
        }
        console.log(error);
        return startMessage.edit({ components: [CANCEL_CONTAINER] });
      }

      // Print the number of characters that lost lives or died
      console.log(`Death rolls complete. ${diedCharacters.length} characters died, ${lost3PveLives.length} lost 3 PvE lives, ${lost2PveLives.length} lost 2 PvE lives, ${lost1PveLife.length} lost 1 PvE life.`);

      // Summarize results
      // Make messages for each category, these categories being:
      // - Died
      // - Lost 3 PvE lives
      // - Lost 2 PvE lives
      // - Lost 1 PvE life
      const summaryMessages = [];

      if (diedCharacters.length > 0) {
        const diedCharactersList = diedCharacters.map(({ character, player, dayOfDeath, monthOfDeath, yearOfDeath }) => `${inlineCode(character.name)} | ${inlineCode(`${dayOfDeath} ${monthOfDeath} ${yearOfDeath}`)} (${spoiler(player ? userMention(player.id) : 'None')})`);
        const diedCharactersMessages = makeDeathRollsSummaryMessages(diedCharactersList, 'Characters that will die in Year ' + nextYear, COLORS.RED);
        summaryMessages.push(...diedCharactersMessages);
      }

      if (lost3PveLives.length > 0) {
        const lost3PveLivesList = lost3PveLives.map(({ character, player }) => `${inlineCode(character.name)} (${spoiler(player ? userMention(player.id) : 'None')})`);
        const lost3PveLivesMessages = makeDeathRollsSummaryMessages(lost3PveLivesList, 'Characters that have lost 3 PvE lives', COLORS.ORANGE);
        summaryMessages.push(...lost3PveLivesMessages);
      }

      if (lost2PveLives.length > 0) {
        const lost2PveLivesList = lost2PveLives.map(({ character, player }) => `${inlineCode(character.name)} (${spoiler(player ? userMention(player.id) : 'None')})`);
        const lost2PveLivesMessages = makeDeathRollsSummaryMessages(lost2PveLivesList, 'Characters that have lost 2 PvE lives', COLORS.YELLOW);
        summaryMessages.push(...lost2PveLivesMessages);
      }

      if (lost1PveLife.length > 0) {
        const lost1PveLifeList = lost1PveLife.map(({ character, player }) => `${inlineCode(character.name)} (${spoiler(player ? userMention(player.id) : 'None')})`);
        const lost1PveLifeMessages = makeDeathRollsSummaryMessages(lost1PveLifeList, 'Characters that have lost 1 PvE life', COLORS.LIGHT_YELLOW);
        summaryMessages.push(...lost1PveLifeMessages);
      }

      const summaryMessageURLs = [];

      // Send the summary messages in the summary channel specified by the user
      if (summaryMessages.length > 0) {
        for (const message of summaryMessages) {
          // Send each message and save the URL
          const sentMessage = await summaryChannel.send(message);
          summaryMessageURLs.push(sentMessage.url);
        }


        // Edit the original message to include links to the summary messages in the summary channel
        const summaryContainer = new ContainerBuilder()
          .addTextDisplayComponents(
            new TextDisplayBuilder()
              .setContent(
                `# Death Rolls Summary\n` +
                `The death rolls have been completed. See the summary messages in the specified summary channel for details:\n\n` +
                summaryMessageURLs.map((url, index) => `**Summary Message ${index + 1}:** ${url}`).join('\n')
              )
          );

        return startMessage.edit({ components: [summaryContainer] });
      } else {
        const noDeathsContainer = new ContainerBuilder()
          .addTextDisplayComponents(
            new TextDisplayBuilder()
              .setContent(
                `# Death Rolls Summary\n` +
                `No characters lost PvE lives or died in Year ${nextYear}.`
              )
          );
        return startMessage.edit({ components: [noDeathsContainer] });
      }
    }
  }
}