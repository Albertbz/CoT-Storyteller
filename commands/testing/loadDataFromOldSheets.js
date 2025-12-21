const { SlashCommandBuilder, InteractionContextType, MessageFlags } = require('discord.js');
const { Players, Characters, Regions, Duchies, Houses, Recruitments, Vassals, Steelbearers, Relationships, Deceased, PlayableChildren, Worlds, DeathRollDeaths } = require('../../dbObjects.js');
const { notableOffspringDoc, citizenryRegistryDoc, offspringDoc } = require('../../sheets.js');
const { Op } = require('sequelize');

function getIdFromXelaLogs(username, log) {
  try {
    const message = log.find(message => {
      const hasDescription = message.embeds[0].description;
      if (hasDescription) {
        return message.embeds[0].description.includes(username);
      }
    })

    if (message) {
      const description = message.embeds[0].description;

      const foundMemberId = description.split('(')[1].split(')')[0]
      return foundMemberId;
    }
  }
  catch (error) {
    console.log(error);
  }
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('load_data_from_old_sheets')
    .setDescription('Load the data from the old sheets.')
    .setContexts(InteractionContextType.Guild)
    .setDefaultMemberPermissions(0),
  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    // Get world
    const world = await Worlds.findOne({ where: { name: 'Elstrand' } });

    console.log('Loading spreadsheets.')
    // Load notable/offspring document
    await notableOffspringDoc.loadInfo();
    const ageSheet = notableOffspringDoc.sheetsByTitle['Age'];

    // Load cells
    await ageSheet.loadCells();

    // Note down where the header starts
    const headerRowIndex = 6;

    ageSheet.loadHeaderRow(6);
    const ageSheetRows = await ageSheet.getRows();

    // Load citizenry registry document
    await citizenryRegistryDoc.loadInfo();
    const houseSheetsRows = new Map();
    console.log('Finished loading spreadsheets.')

    // Get all regions that are not the wanderer
    const regions = await Regions.findAll({
      where: { name: { [Op.not]: 'Wanderer' } },
      include: [{ model: Houses, as: 'rulingHouse' }]
    });
    for (const region of regions) {
      houseSheetsRows.set(region.rulingHouse.name, await citizenryRegistryDoc.sheetsByTitle[region.rulingHouse.name].getRows());
    }

    const members = await interaction.guild.members.fetch();

    // Sync all aging people
    console.log('Syncing all aging characters.')
    for (const [index, ageRow] of ageSheetRows.entries()) {
      // Note down note on name cell
      const nameCell = ageSheet.getCell(index + headerRowIndex, ageSheet.headerValues.indexOf('Character Name'));
      const nameNote = nameCell.note;


      let player = null;
      let character = null;

      const member = members.find(member => member.user.username === ageRow.get('Discord Username'));
      if (!member) {
        console.log('Member not found: ' + ageRow.get('Discord Username'))
        continue;
      }

      // Check whether member has 'New Member' role and log with name
      const hasNewMemberRole = member.roles.cache.some(role => role.name === 'New Member');
      if (hasNewMemberRole) {
        console.log(`Has New Member role (${member.user.username}): ` + hasNewMemberRole);
      }

      const affiliationName = ageRow.get('Affiliation');
      const isWanderer = affiliationName === 'Wanderer';

      let houseRows = null;
      let houseRow = null;
      try {
        if (!isWanderer) {
          houseRows = houseSheetsRows.get(ageRow.get('Affiliation'));
          houseRow = houseRows.find(houseRow => houseRow.get('Discord Username') === ageRow.get('Discord Username'));

          if (!houseRow) {
            console.log('House row not found for: ' + ageRow.get('Discord Username') + ' in house ' + ageRow.get('Affiliation'));
            continue;
          }
          const timezone = houseRow.get('Timezone') === '' ? undefined : houseRow.get('Timezone');
          player = await Players.create({
            id: member.id,
            ign: ageRow.get('VS Username'),
            timezone: timezone
          });
        }
        else {
          player = await Players.create({
            id: member.id,
            ign: ageRow.get('VS Username')
          });
        }
      }
      catch (error) {
        if (error.name === 'SequelizeUniqueConstraintError') {
          console.log('Player already exists: ' + ageRow.get('Discord Username'));
          continue;
        }
        else {
          console.log('Something went wrong with creating the player: ' + ageRow.get('Discord Username'));
          console.log(error)
          continue;
        }
      }

      try {
        const house = await Houses.findOne({ where: { name: ageRow.get('Affiliation') } });
        let region = null;
        if (house) {
          region = await Regions.findOne({ where: { rulingHouseId: house.id } });
        }
        else {
          region = await Regions.findOne({ where: { name: 'Wanderer' } });
        }

        if (!isWanderer) {
          const socialClassName = houseRow.get('Social Class');
          const comments = houseRow.get('Comments') === '' ? undefined : houseRow.get('Comments');
          const role = houseRow.get('Role') === '' ? undefined : houseRow.get('Role');

          character = await Characters.create({
            name: ageRow.get('Character Name'),
            regionId: region.id,
            houseId: house.id,
            socialClassName: socialClassName,
            pveDeaths: ageRow.get('PvE Deaths'),
            yearOfMaturity: ageRow.get('Year of Maturity'),
            role: role,
            comments: comments,
            deathRoll1: ageRow.get('Year 4'),
            deathRoll2: ageRow.get('Year 5'),
            deathRoll3: ageRow.get('Year 6'),
            deathRoll4: ageRow.get('Year 7'),
            deathRoll5: ageRow.get('Year 8'),
          })

          if (comments && comments.includes('Steelbearer')) {
            if (comments.includes('(Ruler)')) {
              await Steelbearers.create({
                type: 'Ruler',
                characterId: character.id,
                regionId: region.id
              });
            }
            else if (comments.includes('(General-purpose)')) {
              // Check whether region is a vassal, in which case they
              // cannot have any general-purpose steelbearers
              const vassalRecord = await Vassals.findOne({ where: { vassalId: region.id } });
              if (vassalRecord) {
                console.log('Region is a vassal and cannot have general-purpose steelbearers: ' + region.name + ' (' + character.name + ')');
                continue;
              }

              await Steelbearers.create({
                type: 'General-purpose',
                characterId: character.id,
                regionId: region.id
              });
            }
            else if (comments.includes('(Vassal)')) {
              // Make sure region is a liege over another region, and that
              // the amount of vassals is at most 2 x the amount of regions
              // they are liege over
              const vassalRegions = await Vassals.findAll({ where: { liegeId: region.id } });
              const currentVassalSteelbearersInRegion = await Steelbearers.findAll({
                where: {
                  regionId: region.id,
                  type: 'Vassal'
                }
              });

              if (currentVassalSteelbearersInRegion.length + 1 >= vassalRegions.length * 2) {
                console.log('Region already has max amount of Vassal steelbearers: ' + region.name + ' (' + character.name + ')');
                continue;
              }

              await Steelbearers.create({
                type: 'Vassal',
                characterId: character.id,
                regionId: region.id
              });
            }
            else {
              // Look for a duchy with the name in the comments inside of the
              // parentheses
              const duchyName = comments.split('Steelbearer (')[1].split(')')[0];
              const duchy = await Duchies.findOne({ where: { name: duchyName, regionId: region.id } });

              // If duchy found, create steelbearer and assign to duchy
              if (duchy) {
                const steelbearer = await Steelbearers.create({
                  type: 'Duchy',
                  characterId: character.id,
                  regionId: region.id
                });

                await duchy.update({ steelbearerId: steelbearer.id });
              }
              else {
                console.log('Duchy not found for steelbearer: ' + duchyName + ' (' + character.name + ')');
              }
            }
          }

        }
        else {
          const socialClassName = member.roles.cache.some(role => role.name === 'Notable') ? 'Notable' : 'Commoner';

          character = await Characters.create({
            name: ageRow.get('Character Name'),
            regionId: region.id,
            houseId: house ? house.id : null,
            pveDeaths: ageRow.get('PvE Deaths'),
            yearOfMaturity: ageRow.get('Year of Maturity'),
            socialClassName: socialClassName,
            deathRoll1: ageRow.get('Year 4'),
            deathRoll2: ageRow.get('Year 5'),
            deathRoll3: ageRow.get('Year 6'),
            deathRoll4: ageRow.get('Year 7'),
            deathRoll5: ageRow.get('Year 8'),
          })
        }
      }
      catch (error) {
        if (error.name === 'SequelizeUniqueConstraintError') {
          console.log('Character already exists: ' + ageRow.get('Character Name'));
          continue;
        }
        else {
          console.log('Something went wrong with creating the character: ' + ageRow.get('Character Name'));
          console.log(error);
          continue;
        }
      }

      // If note contains death info, create death entry
      if (nameNote) {
        if (nameNote.includes('Dying of old age:')) {
          const dateOfDeath = nameNote.split('Dying of old age: ')[1];
          const yearOfDeath = Number(dateOfDeath.split('\'')[1]);
          const monthOfDeath = dateOfDeath.split(' ')[1].replace(',', '');
          const dayOfDeath = Number(dateOfDeath.split(' ')[0].replace(/\D/g, ""));

          try {
            const deathRollDeath = await DeathRollDeaths.create({
              characterId: character.id,
              yearOfDeath: yearOfDeath,
              monthOfDeath: monthOfDeath,
              dayOfDeath: dayOfDeath,
              playedById: player.id
            });
          }
          catch (error) {
            console.log('Something went wrong with creating the death entry for: ' + character.name);
            console.log(error);
          }
        }
      }

      await player.update({ characterId: character.id });
    }
    console.log('Sync successful.')

    // Sync all commoners
    try {
      console.log('Syncing all commoners')
      for (const [houseName, houseRows] of houseSheetsRows) {
        const houseCommonerRows = houseRows.filter(houseRow => houseRow.get('Social Class') === 'Commoner');

        for (const commonerRow of houseCommonerRows) {
          const member = members.find(member => member.user.username === commonerRow.get('Discord Username'));
          if (!member) {
            console.log('Member not found: ' + commonerRow.get('Discord Username'))
            continue;
          }

          // Check whether member has 'New Member' role and log with name
          const hasNewMemberRole = member.roles.cache.some(role => role.name === 'New Member');
          if (hasNewMemberRole) {
            console.log(`Has New Member role (${member.user.username}): ` + hasNewMemberRole);
          }

          let player = null;
          try {
            const timezone = commonerRow.get('Timezone') === '' ? undefined : commonerRow.get('Timezone');

            player = await Players.create({
              id: member.id,
              ign: commonerRow.get('VS Username'),
              timezone: timezone
            });

          }
          catch (error) {
            if (error.name === 'SequelizeUniqueConstraintError') {
              console.log('Player already exists: ' + commonerRow.get('Discord Username'));
              continue;
            }
            else {
              console.log('Something went wrong with creating the player: ' + commonerRow.get('Discord Username'));
              console.log(error)
              continue;
            }
          }

          let character = null;
          try {
            const role = commonerRow.get('Role') === '' ? undefined : commonerRow.get('Role');
            const comments = commonerRow.get('Comments') === '' ? undefined : commonerRow.get('Comments');

            const house = await Houses.findOne({ where: { name: houseName } });
            const region = await Regions.findOne({ where: { rulingHouseId: house.id } });

            character = await Characters.create({
              name: commonerRow.get('Character Name'),
              regionId: region.id,
              houseId: house.id,
              role: role,
              comments: comments
            })
          }
          catch (error) {
            if (error.name === 'SequelizeUniqueConstraintError') {
              console.log('Character already exists: ' + commonerRow.get('Character Name'));
              continue;
            }
            else {
              console.log('Something went wrong with creating the character: ' + commonerRow.get('Character Name'));
              console.log(error);
              continue;
            }
          }

          await player.update({ characterId: character.id })
        }
      }
      console.log('Sync successful.')
    }
    catch (error) {
      console.log(error)
    }

    // Load dead characters
    console.log('Syncing all dead characters.')
    const deceasedSheetRows = await notableOffspringDoc.sheetsByTitle['Deceased'].getRows();
    const deceasedWanderersSheetRows = await notableOffspringDoc.sheetsByTitle['Deceased Wanderers'].getRows();

    // Get xela log for players that have left
    console.log('Loading all xela log messages.')
    const xelaLogChannel = interaction.client.channels.cache.get('1368236461832274142');
    const messages = []
    // Create message pointer
    let message = await xelaLogChannel.messages
      .fetch({ limit: 1 })
      .then(messagePage => (messagePage.size === 1 ? messagePage.at(0) : null));
    messages.push(message);

    while (message) {
      await xelaLogChannel.messages
        .fetch({ limit: 100, before: message.id })
        .then(messagePage => {
          messagePage.forEach(msg => messages.push(msg));

          // Update the message pointer to be the last message on the page of messages
          message = 0 < messagePage.size ? messagePage.at(messagePage.size - 1) : null;
        });
    }

    const leftMessages = messages.filter(message => {
      try {
        const hasEmbeds = message.embeds.length != 0;
        if (hasEmbeds) {
          const hasDescription = message.embeds[0].description;
          if (hasDescription) {
            return message.embeds[0].description.includes('Left');
          }
        }
      }
      catch (error) {
        console.log(error)
      }
    })
    console.log('Finished loading all messages.')

    // Deceased from Houses
    console.log('Syncing deceased from houses.')
    for (const deceasedRow of deceasedSheetRows) {
      try {
        let regionId = null;
        let houseId = null;
        // Check whether house exists or is wanderer
        const houseName = deceasedRow.get('Affiliation');
        const wandererRegion = await Regions.findOne({ where: { name: 'Wanderer' } });
        if (houseName === 'Wanderer') {
          regionId = wandererRegion.id;
        }
        else {
          const [house, _] = await Houses.findOrCreate({ where: { name: deceasedRow.get('Affiliation') } });
          houseId = house.id;
          const region = await Regions.findOne({ where: { rulingHouseId: house.id } });
          regionId = region ? region.id : wandererRegion.id;
        }

        const yearOfMaturity = Number(deceasedRow.get('Date of Death').split('\'')[1]) - deceasedRow.get('Age of Death');

        const character = await Characters.create({
          name: deceasedRow.get('Character Name'),
          houseId: houseId,
          regionId: regionId,
          socialClassName: 'Notable',
          yearOfMaturity: yearOfMaturity,
          pveDeaths: 3
        })

        let member = members.find(member => member.user.username === deceasedRow.get('Discord Username'));
        let memberId = null;
        if (!member) {
          memberId = getIdFromXelaLogs(deceasedRow.get('Discord Username'), leftMessages)
        }
        else {
          memberId = member.id;
        }

        if (memberId === null) {
          console.log('Did not find id: ' + deceasedRow.get('Discord Username'))
        }

        const yearSplit = deceasedRow.get('Date of Death').split(', \'');
        const yearOfDeath = Number(yearSplit[1]);

        const monthSplit = yearSplit[0].split(' ');
        const monthOfDeath = monthSplit[1];
        const dayOfDeath = Number(monthSplit[0].replace(/\D/g, ""));

        const deceased = await Deceased.create({
          characterId: character.id,
          dayOfDeath: dayOfDeath,
          monthOfDeath: monthOfDeath,
          yearOfDeath: yearOfDeath,
          playedById: memberId,
          causeOfDeath: deceasedRow.get('Cause of Death')
        })

      }
      catch (error) {
        console.log('Error for: ' + deceasedRow.get('Discord Username') + error)
      }
    }
    console.log('Finished syncing deceaseds from houses.')

    // Deceased Wanderers
    console.log('Syncing all dead wanderers.')
    for (const deceasedRow of deceasedWanderersSheetRows) {
      try {
        const wandererRegion = await Regions.findOne({ where: { name: 'Wanderer' } });

        const yearOfMaturity = Number(deceasedRow.get('Date of Death').split('\'')[1]) - deceasedRow.get('Age of Death');

        const character = await Characters.create({
          name: deceasedRow.get('Character Name'),
          regionId: wandererRegion.id,
          socialClassName: 'Commoner',
          yearOfMaturity: yearOfMaturity,
          pveDeaths: 3
        })

        let member = members.find(member => member.user.username === deceasedRow.get('Discord Username'));
        let memberId = null;
        if (!member) {
          try {
            const message = leftMessages.find(message => {
              const hasDescription = message.embeds[0].description;
              if (hasDescription) {
                return message.embeds[0].description.includes(deceasedRow.get('Discord Username'));
              }
            })

            if (message) {
              const description = message.embeds[0].description;

              const foundMemberId = description.split('(')[1].split(')')[0]
              memberId = foundMemberId;
            }
          }
          catch (error) {
            console.log(error);
          }
        }
        else {
          memberId = member.id;
        }

        if (memberId === null) {
          console.log('Did not find id: ' + deceasedRow.get('Discord Username'))
        }

        const yearSplit = deceasedRow.get('Date of Death').split(', \'');
        const yearOfDeath = Number(yearSplit[1]);

        const monthSplit = yearSplit[0].split(' ');
        const monthOfDeath = monthSplit[1];
        const dayOfDeath = Number(monthSplit[0].replace(/\D/g, ""));

        const deceased = await Deceased.create({
          characterId: character.id,
          dayOfDeath: dayOfDeath,
          monthOfDeath: monthOfDeath,
          yearOfDeath: yearOfDeath,
          playedById: memberId,
          causeOfDeath: deceasedRow.get('Cause of Death')
        })

      }
      catch (error) {
        console.log('Error for: ' + deceasedRow.get('Discord Username') + error)
      }
    }
    console.log('Finished syncing dead wanderers.')

    // Load offspring stuff
    await offspringDoc.loadInfo();

    // Load playable children
    const playableChildrenRows = await offspringDoc.sheetsByTitle['Playable Children'].getRows();

    for (const playableChildRow of playableChildrenRows) {
      try {
        let house = await Houses.findOne({ where: { name: playableChildRow.get('Affiliation') } });
        let region = null;
        if (house) {
          region = await Regions.findOne({ where: { rulingHouseId: house.id } });
        }
        else {
          region = await Regions.findOne({ where: { name: 'Wanderer' } });
        }

        const socialClassName = playableChildRow.get('Inherited title') === 'Noble' ? 'Noble' : 'Notable';

        const character = await Characters.create({
          name: playableChildRow.get('Character Name'),
          sex: playableChildRow.get('Sex'),
          yearOfMaturity: playableChildRow.get('Year of Maturity'),
          regionId: region.id,
          houseId: house ? house.id : null,
          socialClassName: socialClassName,
        })

        const parentNames = playableChildRow.get('Parents').split(', ')
        // console.log(parentNames)

        const [parent1Character, created] = await Characters.findOrCreate({ where: { name: parentNames[0] } });

        if (created) {
          console.log('Created parent character, added to deceased as expired child: ' + parentNames[0]);
          await parent1Character.update({ socialClassName: 'Notable', regionId: region.id, houseId: house ? house.id : null, yearOfMaturity: world.currentYear });
          await Deceased.create({
            characterId: parent1Character.id,
            causeOfDeath: 'Expired Child',
            dayOfDeath: 1,
            monthOfDeath: 'January',
            yearOfDeath: world.currentYear
          });
        }

        if (parent1Character) {
          await character.update({ parent1Id: parent1Character.id });
        }
        else {
          console.log('Could not find parent: ' + parentNames[0]);
        }

        if (parentNames.length > 1) {
          const [parent2Character, created] = await Characters.findOrCreate({ where: { name: parentNames[1] } });
          if (created) {
            console.log('Created parent character, added to deceased as expired child: ' + parentNames[1]);
            await parent2Character.update({ socialClassName: 'Notable', regionId: region.id, houseId: house.id, yearOfMaturity: world.currentYear });
            await Deceased.create({
              characterId: parent2Character.id,
              causeOfDeath: 'Expired Child',
              dayOfDeath: 1,
              monthOfDeath: 'January',
              yearOfDeath: world.currentYear
            });
          }

          if (parent2Character) {
            await character.update({ parent2Id: parent2Character.id });
          }
          else {
            console.log('Could not find parent: ' + parentNames[1]);
          }
        }


        let contact1Snowflake = undefined;
        let contact2Snowflake = undefined;
        if (playableChildRow.get('Contacts') === undefined) {
          if (character.parent1Id !== undefined) {
            const parent1Player = await Players.findOne({ where: { characterId: character.parent1Id } })

            if (parent1Player) {
              contact1Snowflake = parent1Player.id;
            }
          }

          if (character.parent2Id !== undefined) {
            const parent2Player = await Players.findOne({ where: { characterId: character.parent2Id } })

            if (parent2Player) {
              contact2Snowflake = parent2Player.id

            }
          }
        }
        else {
          const contacts = playableChildRow.get('Contacts').split(', ')
          const contact1Member = members.find(member => member.user.username === contacts[0]);
          if (!contact1Member) {
            contact1Snowflake = getIdFromXelaLogs(contacts[0], leftMessages)
          }
          else {
            contact1Snowflake = contact1Member.id;
          }

          if (contacts.length > 1) {
            const contact2Member = members.find(member => member.user.username === contacts[1]);
            if (!contact2Member) {
              contact2Snowflake = getIdFromXelaLogs(contacts[1], leftMessages);
            }
            else {
              contact2Snowflake = contact2Member.id;
            }
          }
        }

        // console.log(contact1Snowflake)
        // console.log(contact2Snowflake)
        // console.log()

        const playableChild = await PlayableChildren.create({
          characterId: character.id,
          legitimacy: playableChildRow.get('Legitimacy'),
          comments: playableChildRow.get('Comments'),
          contact1Snowflake: contact1Snowflake,
          contact2Snowflake: contact2Snowflake
        })

      }
      catch (error) {
        console.log(error);
        // console.log('Something went wrong with creati')
      }
    }


    // Load relationships
    console.log('Syncing relationships.')
    const relationshipsRows = await offspringDoc.sheetsByTitle['Intercharacter Rolls'].getRows();

    for (const relationshipRow of relationshipsRows) {
      let bearingCharacter;
      let conceivingCharacter;

      const bearingCharacterName = relationshipRow.get('Bearing Partner');
      const conceivingCharacterName = relationshipRow.get('Conceiving Partner');

      try {
        bearingCharacter = await Characters.findOne({ where: { name: bearingCharacterName } });
        if (!bearingCharacter) {
          console.log('Could not find: ' + bearingCharacterName)
          continue;
        }
        else {
          const deceasedCharacter = await Deceased.findOne({ where: { characterId: bearingCharacter.id } })
          if (deceasedCharacter && deceasedCharacter.yearOfDeath < world.currentYear) {
            console.log(`The following character is dead and died before this year: ${bearingCharacterName}. Should be removed.`)
          }
          else if (deceasedCharacter && deceasedCharacter.yearOfDeath === world.currentYear) {
            console.log(`The following character is dead, but died this year: ${bearingCharacterName}. Should be removed due to being bearing partner.`)
          }
        }
      }
      catch (error) {
        console.log('Something went wrong with: ' + bearingCharacterName + '\n' + error);
      }

      try {
        conceivingCharacter = await Characters.findOne({ where: { name: conceivingCharacterName } });
        if (!conceivingCharacter) {
          console.log('Could not find: ' + conceivingCharacterName)
          continue;
        }
        else {
          const deceasedCharacter = await Deceased.findOne({ where: { characterId: conceivingCharacter.id } })
          if (deceasedCharacter && deceasedCharacter.yearOfDeath < world.currentYear) {
            console.log(`The following character is dead and died before this year: ${conceivingCharacterName}. Should be removed.`)
          }
          else if (deceasedCharacter && deceasedCharacter.yearOfDeath === world.currentYear) {
            console.log(`The following character is dead, but died this year: ${conceivingCharacterName}`)
          }
        }
      }
      catch (error) {
        console.log('Something went wrong with: ' + conceivingCharacterName + '\n' + error);
      }

      const isCommitted = relationshipRow.get('Committed') === 'Yes' ? true : false;
      const inheritedTitle = relationshipRow.get('Inherited title');

      try {
        const relationship = await Relationships.create({
          bearingCharacterId: bearingCharacter.id,
          conceivingCharacterId: conceivingCharacter.id,
          isCommitted: isCommitted,
          inheritedTitle: inheritedTitle
        })

        // console.log('The relationship was added to the database succesfully:\n', relationship.toJSON());
      }
      catch (error) {
        console.log('Something went wrong with creating the relationship between: ' + bearingCharacterName + ' and ' + conceivingCharacterName + '\n' + error);
      }
    }
    console.log('Finished syncing relationships.')

    // Load bastard rolls
    console.log('Syncing bastard rolls.')
    const bastardRollsRows = await offspringDoc.sheetsByTitle['NPC Rolls'].getRows();
    try {
      for (const row of bastardRollsRows) {
        const character = await Characters.findOne({ where: { name: row.get('Character Name') } })

        if (!character) {
          console.log('Could not find character for bastard roll: ' + row.get('Character Name'));
          continue;
        }

        const deceasedCharacter = await Deceased.findOne({ where: { characterId: character.id } })
        if (deceasedCharacter && deceasedCharacter.yearOfDeath < world.currentYear) {
          console.log(`The following character is dead and died before this year: ${character.name}. Should be removed.`)
        }
        else if (deceasedCharacter && deceasedCharacter.yearOfDeath === world.currentYear) {
          console.log(`The following character is dead, but died this year: ${character.name}`)
        }
        else {
          await character.update({ isRollingForBastards: true })
        }

      }
    }
    catch (error) {
      console.log('Issue with loading of bastards:', error);
    }
    console.log('Finished syncing bastard rolls.')

    console.log('Finished loading data from old sheets.')

    return interaction.editReply({
      content: 'The data has been loaded.', flags: MessageFlags.Ephemeral
    })
  }
}