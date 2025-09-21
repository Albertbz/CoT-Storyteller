const { SlashCommandBuilder, InteractionContextType, MessageFlags } = require('discord.js');
const { Players, Characters, Worlds, Affiliations, Deceased, Relationships, PlayableChildren } = require('../../dbObjects.js');
const { Op } = require('sequelize');
const { citizensDoc, offspringDoc } = require('../../sheets.js');
const { GoogleSpreadsheetRow } = require('google-spreadsheet');

function ageToFertilityModifier(age) {
  if (age >= 7) return 0;
  if (age >= 6) return 0.3;
  if (age >= 5) return 0.5;
  if (age < 5) return 1;
}

async function getFertilityModifier(yearOfMaturity1, yearOfMaturity2 = undefined) {
  const world = await Worlds.findOne({ where: { name: 'Elstrand' } });

  const age1 = world.currentYear - yearOfMaturity1;
  const age2 = yearOfMaturity2 === undefined ? 1 : world.currentYear - yearOfMaturity2;

  return ageToFertilityModifier(age1) * ageToFertilityModifier(age2);
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('write_data_to_sheet')
    .setDescription('Write all of the current data to the spreadsheets.')
    .setContexts(InteractionContextType.Guild)
    .setDefaultMemberPermissions(0),
  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    // Load world
    const world = await Worlds.findOne({ where: { name: 'Elstrand' } });


    // Write offspring sheets
    await offspringDoc.loadInfo();

    // Write relationships
    const relationships = await Relationships.findAll({
      include: [
        { model: Characters, as: 'bearingCharacter' },
        { model: Characters, as: 'conceivingCharacter' }
      ]
    });
    const sortedRelationships = relationships.sort((relationshipA, relationshipB) => {
      if (relationshipA.bearingCharacter.name < relationshipB.bearingCharacter.name) {
        return -1;
      }
      if (relationshipA.bearingCharacter.name > relationshipB.bearingCharacter.name) {
        return 1;
      }
      return 0;
    })

    const relationshipsSheet = offspringDoc.sheetsByTitle['Relationships'];
    await relationshipsSheet.resize({ rowCount: sortedRelationships.length + 1 });
    await relationshipsSheet.loadCells();
    for (const [i, relationship] of sortedRelationships.entries()) {
      const bearingCell = relationshipsSheet.getCell(i + 1, 0)
      const conceivingCell = relationshipsSheet.getCell(i + 1, 1)
      const fertilityCell = relationshipsSheet.getCell(i + 1, 2)
      const committedCell = relationshipsSheet.getCell(i + 1, 3)
      const titleCell = relationshipsSheet.getCell(i + 1, 4)


      bearingCell.value = relationship.bearingCharacter.name;
      conceivingCell.value = relationship.conceivingCharacter.name;
      fertilityCell.value = await getFertilityModifier(relationship.bearingCharacter.yearOfMaturity, relationship.conceivingCharacter.yearOfMaturity);
      committedCell.value = relationship.isCommitted ? 'Yes' : 'No';
      titleCell.value = relationship.inheritingTitle;
    }
    await relationshipsSheet.saveUpdatedCells();

    // Write bastard rolls
    const charactersWithBastardRolls = await Characters.findAll({
      where: { isRollingForBastards: true },
      attributes: ['name', 'yearOfMaturity']
    })

    const sortedCharactersWithBastardRolls = charactersWithBastardRolls.sort((characterA, characterB) => {
      if (characterA.name < characterB.name) {
        return -1;
      }
      if (characterA.name > characterB.name) {
        return 1;
      }
      return 0;
    })

    const bastardRollsSheet = offspringDoc.sheetsByTitle['Bastard rolls'];
    await bastardRollsSheet.resize({ rowCount: sortedCharactersWithBastardRolls.length + 1 });
    await bastardRollsSheet.loadCells();

    for (const [i, character] of sortedCharactersWithBastardRolls.entries()) {
      const nameCell = bastardRollsSheet.getCell(i + 1, 0);
      const fertilityCell = bastardRollsSheet.getCell(i + 1, 1);

      nameCell.value = character.name;
      fertilityCell.value = await getFertilityModifier(character.yearOfMaturity);
    }
    await bastardRollsSheet.saveUpdatedCells()

    // Write playable children
    const playableChildren = await PlayableChildren.findAll({
      include: {
        model: Characters, as: 'character',
        include: [
          { model: Characters, as: 'parent1' },
          { model: Characters, as: 'parent2' },
          { model: Affiliations, as: 'affiliation' }
        ]
      }
    })

    const playableChildrenSheet = offspringDoc.sheetsByTitle['Playable Children'];
    await playableChildrenSheet.resize({ rowCount: playableChildren.length + 1 });
    await playableChildrenSheet.loadCells();

    for (const [i, playableChild] of playableChildren.entries()) {
      const nameCell = playableChildrenSheet.getCell(i + 1, 0)
      const yearOfMaturityCell = playableChildrenSheet.getCell(i + 1, 1)
      const ageCell = playableChildrenSheet.getCell(i + 1, 2)
      const sexCell = playableChildrenSheet.getCell(i + 1, 3)
      const affilationCell = playableChildrenSheet.getCell(i + 1, 4)
      const legitimacyCell = playableChildrenSheet.getCell(i + 1, 5)
      const titleCell = playableChildrenSheet.getCell(i + 1, 6)
      const commentsCell = playableChildrenSheet.getCell(i + 1, 7)
      const parentsCell = playableChildrenSheet.getCell(i + 1, 8)
      const contactsCell = playableChildrenSheet.getCell(i + 1, 9)

      nameCell.value = playableChild.character.name;
      yearOfMaturityCell.value = playableChild.character.yearOfMaturity;
      ageCell.value = world.currentYear - playableChild.character.yearOfMaturity;
      sexCell.value = playableChild.character.sex;

      const affiliation = playableChild.character.affiliation.name;
      affilationCell.value = affiliation === 'Wanderer' ? undefined : affiliation;

      legitimacyCell.value = playableChild.legitimacy;

      if (playableChild.legitimacy !== 'Illegitimate') {
        titleCell.value = playableChild.character.socialClassName === 'Noble' ? 'Noble' : 'None';
      }
      else {
        titleCell.value = ''
      }
      commentsCell.value = playableChild.comments;

      // console.log(playableChild.character)

      const parentNames = []
      parentNames.push(playableChild.character.parent1.name)

      if (playableChild.character.parent2 !== null) {
        parentNames.push(playableChild.character.parent2.name);
      }
      parentsCell.value = parentNames.join(', ')

      const contacts = []
      if (playableChild.contact1Snowflake !== null) {
        contacts.push((await client.users.fetch(playableChild.contact1Snowflake)).username);
      }

      if (playableChild.contact2Snowflake !== null) {
        contacts.push((await client.users.fetch(playableChild.contact2Snowflake)).username);
      }

      // console.log(contacts)
      contactsCell.value = contacts.join(', ')
    }
    await playableChildrenSheet.saveUpdatedCells();


    // Load in the citizens spreadsheet
    await citizensDoc.loadInfo();

    // Make a map of all affiliation sheets
    const affiliationSheets = new Map();

    const affiliations = await Affiliations.findAll({
      where: { [Op.or]: { isRuling: true, name: 'Wanderer' } }
    });

    for (const affiliation of affiliations) {
      affiliationSheets.set(affiliation, citizensDoc.sheetsByTitle[affiliation.name]);
    }

    try {
      const activePlayers = await Players.findAll({
        where: { isActive: true },
        include: { model: Characters, as: 'character' }
      });

      const socialClassToRank = new Map();
      socialClassToRank.set('Ruler', 4);
      socialClassToRank.set('Noble', 3);
      socialClassToRank.set('Notable', 2);
      socialClassToRank.set('Commoner', 1);

      for (const [affiliation, affiliationSheet] of affiliationSheets) {
        const affiliationPlayers = activePlayers.filter(activePlayer => activePlayer.character.affiliationId === affiliation.id);

        affiliationPlayers.sort((playerA, playerB) => {
          const socialClassCompare = socialClassToRank.get(playerB.character.socialClassName) - socialClassToRank.get(playerA.character.socialClassName);
          if (socialClassCompare === 0) {
            return playerA.character.yearOfMaturity - playerB.character.yearOfMaturity;
          }
          else {
            return socialClassCompare;
          }
        })

        await affiliationSheet.resize({ rowCount: affiliationPlayers.length + 1 });
        await affiliationSheet.loadCells()

        for (const [i, player] of affiliationPlayers.entries()) {
          const socialClassCell = affiliationSheet.getCell(i + 1, 0);
          const roleCell = affiliationSheet.getCell(i + 1, 1);
          const nameCell = affiliationSheet.getCell(i + 1, 2);
          const timezoneCell = affiliationSheet.getCell(i + 1, 3);
          const commentsCell = affiliationSheet.getCell(i + 1, 4);
          const pveDeathsCell = affiliationSheet.getCell(i + 1, 5);
          const yearOfMaturityCell = affiliationSheet.getCell(i + 1, 6);
          const ageCell = affiliationSheet.getCell(i + 1, 7);
          const snowflakeCell = affiliationSheet.getCell(i + 1, 8);


          socialClassCell.value = player.character.socialClassName;
          roleCell.value = player.character.role === 'Undefined' ? '' : player.character.role;
          nameCell.value = player.character.name;
          timezoneCell.value = player.timezone === 'Undefined' ? '' : player.timezone;
          commentsCell.value = player.character.comments === 'Undefined' ? '' : player.character.comments;
          snowflakeCell.value = player.id

          if (player.character.socialClassName !== 'Commoner' || affiliation.name === 'Wanderer') {
            pveDeathsCell.value = player.character.pveDeaths;
            yearOfMaturityCell.value = player.character.yearOfMaturity;
            ageCell.value = world.currentYear - player.character.yearOfMaturity;
          }
        }

        await affiliationSheet.saveUpdatedCells();
      }
    }
    catch (error) {
      console.log(error);
    }

    // Write deceased to sheet
    const deceasedSheet = citizensDoc.sheetsByTitle['Deceased'];

    const deceaseds = await Deceased.findAll({
      include: {
        model: Characters, as: 'character',
        attributes: ['name'],
        include: { model: Affiliations, as: 'affiliation', attributes: ['name'] }
      },
    })

    const monthOrder = new Map();
    monthOrder.set('January', 1);
    monthOrder.set('February', 2);
    monthOrder.set('March', 3);
    monthOrder.set('April', 4);
    monthOrder.set('May', 5);
    monthOrder.set('June', 6);
    monthOrder.set('July', 7);
    monthOrder.set('August', 8);
    monthOrder.set('September', 9);
    monthOrder.set('October', 10);
    monthOrder.set('November', 11);
    monthOrder.set('December', 12);

    // Sort deceaseds by date
    const sortedDeceaseds = deceaseds.sort((deceasedA, deceasedB) => {
      const yearDifference = deceasedA.yearOfDeath - deceasedB.yearOfDeath;

      if (yearDifference === 0) {
        const monthDifference = monthOrder.get(deceasedA.monthOfDeath) - monthOrder.get(deceasedB.monthOfDeath);

        if (monthDifference === 0) {
          return deceasedA.dayOfDeath - deceasedB.dayOfDeath;
        }
        else {
          return monthDifference;
        }
      }
      else {
        return yearDifference;
      }
    })

    await deceasedSheet.resize({ rowCount: sortedDeceaseds.length + 1 });
    await deceasedSheet.loadCells();
    for (const [i, deceased] of sortedDeceaseds.entries()) {
      const nameCell = deceasedSheet.getCell(i + 1, 0);
      const affiliationCell = deceasedSheet.getCell(i + 1, 1);
      const dateOfDeathCell = deceasedSheet.getCell(i + 1, 2);
      const ageOfDeathCell = deceasedSheet.getCell(i + 1, 3);
      const causeOfDeathCell = deceasedSheet.getCell(i + 1, 4);
      const snowflakeCell = deceasedSheet.getCell(i + 1, 5);


      nameCell.value = deceased.character.name;
      affiliationCell.value = deceased.character.affiliation.name;
      dateOfDeathCell.value = deceased.dateOfDeath;
      ageOfDeathCell.value = deceased.ageOfDeath;
      causeOfDeathCell.value = deceased.causeOfDeath;
      snowflakeCell.value = deceased.playedById;
    }

    await deceasedSheet.saveUpdatedCells();


    console.log('Finished writing data to new sheets.')

    return interaction.editReply({
      content: 'The data has been written.', flags: MessageFlags.Ephemeral
    })
  }
}