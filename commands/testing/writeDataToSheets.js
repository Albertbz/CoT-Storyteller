const { SlashCommandBuilder, InteractionContextType, MessageFlags, HTTPError } = require('discord.js');
const { Players, Characters, Worlds, Regions, Houses, Recruitments, Deceased, Relationships, PlayableChildren, DeathRollDeaths } = require('../../dbObjects.js');
const { citizensDoc, offspringDoc } = require('../../sheets.js');
const { getFertilityModifier } = require('../../helpers/rollHelper.js');

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

    // Load in the offspring spreadsheet
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

    const relationshipsSheet = offspringDoc.sheetsByTitle['Intercharacter Rolls'];
    await relationshipsSheet.resize({ rowCount: sortedRelationships.length + 1 });
    await relationshipsSheet.loadCells();
    for (const [i, relationship] of sortedRelationships.entries()) {
      const bearingCell = relationshipsSheet.getCell(i + 1, 0)
      const conceivingCell = relationshipsSheet.getCell(i + 1, 1)
      const fertilityCell = relationshipsSheet.getCell(i + 1, 2)
      const committedCell = relationshipsSheet.getCell(i + 1, 3)
      const titleCell = relationshipsSheet.getCell(i + 1, 4)

      const fertilityModifiers = await getFertilityModifier(relationship.bearingCharacter.yearOfMaturity, relationship.conceivingCharacter.yearOfMaturity);

      bearingCell.value = relationship.bearingCharacter.name;
      conceivingCell.value = relationship.conceivingCharacter.name;
      fertilityCell.value = fertilityModifiers.combinedFertilityModifier;
      committedCell.value = relationship.isCommitted ? 'Yes' : 'No';
      titleCell.value = relationship.inheritedTitle;
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

    const bastardRollsSheet = offspringDoc.sheetsByTitle['NPC Rolls'];
    await bastardRollsSheet.resize({ rowCount: sortedCharactersWithBastardRolls.length + 1 });
    await bastardRollsSheet.loadCells();

    for (const [i, character] of sortedCharactersWithBastardRolls.entries()) {
      const nameCell = bastardRollsSheet.getCell(i + 1, 0);
      const fertilityCell = bastardRollsSheet.getCell(i + 1, 1);

      const fertilityModifiers = await getFertilityModifier(character.yearOfMaturity);

      nameCell.value = character.name;
      fertilityCell.value = fertilityModifiers.combinedFertilityModifier;
    }
    await bastardRollsSheet.saveUpdatedCells()

    // Write playable children
    const playableChildren = await PlayableChildren.findAll({
      include: {
        model: Characters, as: 'character',
        include: [
          { model: Characters, as: 'parent1' },
          { model: Characters, as: 'parent2' },
          { model: Regions, as: 'region' },
          { model: Houses, as: 'house' }
        ]
      }
    })

    const playableChildrenSheet = offspringDoc.sheetsByTitle['Playable Children'];

    try {
      await playableChildrenSheet.resize({ rowCount: playableChildren.length + 1 });
    }
    catch (error) {
      console.error('Error resizing Playable Children sheet:', error);
    }

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

      const region = playableChild.character.region;
      let affiliationToWrite = null;
      if (region.name !== 'Wanderer') {
        const house = await Houses.findOne({ where: { id: region.rulingHouseId } });
        affiliationToWrite = house.name;
      }
      affilationCell.value = affiliationToWrite;

      legitimacyCell.value = playableChild.legitimacy;

      if (playableChild.legitimacy !== 'Illegitimate') {
        titleCell.value = playableChild.character.socialClassName === 'Noble' ? 'Noble' : 'None';
      }
      else {
        titleCell.value = ''
      }
      commentsCell.value = playableChild.comments;

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

      contactsCell.value = contacts.join(', ')
    }
    await playableChildrenSheet.saveUpdatedCells();


    // Load in the citizens spreadsheet
    await citizensDoc.loadInfo();

    // Make a map of all region sheets
    const regionSheets = new Map();

    const regions = await Regions.findAll();

    for (const region of regions) {
      regionSheets.set(region, citizensDoc.sheetsByTitle[region.name]);
    }

    const activePlayers = await Players.findAll({
      where: { isActive: true },
      include: { model: Characters, as: 'character' }
    });

    const socialClassToRank = new Map();
    socialClassToRank.set('Ruler', 4);
    socialClassToRank.set('Noble', 3);
    socialClassToRank.set('Notable', 2);
    socialClassToRank.set('Commoner', 1);


    for (const [region, regionSheet] of regionSheets) {
      const regionPlayers = activePlayers.filter(activePlayer => activePlayer.character.regionId === region.id);

      regionPlayers.sort((playerA, playerB) => {
        const socialClassCompare = socialClassToRank.get(playerB.character.socialClassName) - socialClassToRank.get(playerA.character.socialClassName);
        if (socialClassCompare === 0) {
          return playerA.character.yearOfMaturity - playerB.character.yearOfMaturity;
        }
        else {
          return socialClassCompare;
        }
      })

      try {
        await regionSheet.resize({ rowCount: regionPlayers.length + 1 });
      }
      catch (error) {
        console.error(`Error resizing ${region.name} sheet:`, error);
      }
      await regionSheet.loadCells()

      for (const [i, player] of regionPlayers.entries()) {
        const socialClassCell = regionSheet.getCell(i + 1, 0);
        const roleCell = regionSheet.getCell(i + 1, 1);
        const nameCell = regionSheet.getCell(i + 1, 2);
        const timezoneCell = regionSheet.getCell(i + 1, 3);
        const commentsCell = regionSheet.getCell(i + 1, 4);
        const pveDeathsCell = regionSheet.getCell(i + 1, 5);
        const yearOfMaturityCell = regionSheet.getCell(i + 1, 6);
        const ageCell = regionSheet.getCell(i + 1, 7);
        const deathRoll1Cell = regionSheet.getCell(i + 1, 8);
        const deathRoll2Cell = regionSheet.getCell(i + 1, 9);
        const deathRoll3Cell = regionSheet.getCell(i + 1, 10);
        const deathRoll4Cell = regionSheet.getCell(i + 1, 11);
        const deathRoll5Cell = regionSheet.getCell(i + 1, 12);
        const snowflakeCell = regionSheet.getCell(i + 1, 13);

        socialClassCell.value = player.character.socialClassName;
        roleCell.value = player.character.role === null ? '' : player.character.role;
        nameCell.value = player.character.name;
        timezoneCell.value = player.timezone === null ? '' : player.timezone;
        commentsCell.value = player.character.comments === null ? '' : player.character.comments;
        snowflakeCell.value = player.id

        if (player.character.socialClassName !== 'Commoner' || region.name === 'Wanderer') {
          pveDeathsCell.value = player.character.pveDeaths;
          yearOfMaturityCell.value = player.character.yearOfMaturity;
          ageCell.value = world.currentYear - player.character.yearOfMaturity;
          deathRoll1Cell.value = player.character.deathRoll1 ? player.character.deathRoll1 : '-';
          deathRoll2Cell.value = player.character.deathRoll2 ? player.character.deathRoll2 : '-';
          deathRoll3Cell.value = player.character.deathRoll3 ? player.character.deathRoll3 : '-';
          deathRoll4Cell.value = player.character.deathRoll4 ? player.character.deathRoll4 : '-';
          deathRoll5Cell.value = player.character.deathRoll5 ? player.character.deathRoll5 : '-';
        }
        else {
          pveDeathsCell.value = '-';
          yearOfMaturityCell.value = '-';
          ageCell.value = '-';
          deathRoll1Cell.value = '-';
          deathRoll2Cell.value = '-';
          deathRoll3Cell.value = '-';
          deathRoll4Cell.value = '-';
          deathRoll5Cell.value = '-';
        }

        const borderLeft = {
          left: {
            style: 'SOLID', width: 1, color: {}, colorStyle: { rgbColor: {} }
          }
        }
        // Add formatting (mainly borders)
        pveDeathsCell.borders = borderLeft;
        deathRoll1Cell.borders = borderLeft;
        deathRoll2Cell.borders = borderLeft;
        deathRoll3Cell.borders = borderLeft;
        deathRoll4Cell.borders = borderLeft;
        deathRoll5Cell.borders = borderLeft;
        snowflakeCell.borders = borderLeft;

        pveDeathsCell.horizontalAlignment = 'CENTER';
        yearOfMaturityCell.horizontalAlignment = 'CENTER';
        ageCell.horizontalAlignment = 'CENTER';
        deathRoll1Cell.horizontalAlignment = 'CENTER';
        deathRoll2Cell.horizontalAlignment = 'CENTER';
        deathRoll3Cell.horizontalAlignment = 'CENTER';
        deathRoll4Cell.horizontalAlignment = 'CENTER';
        deathRoll5Cell.horizontalAlignment = 'CENTER';

        // If character exists in DeathRollDeaths, color the name cell red
        // and add note with date of death
        const deathRollDeath = await DeathRollDeaths.findOne({
          where: { characterId: player.character.id }
        });

        if (deathRollDeath !== null) {
          // Set the background color to light red (#f4c7c3)
          // Translated to RGB with decimals: red: 0.957, green: 0.780, blue: 0.765
          nameCell.backgroundColor = { red: 0.957, green: 0.780, blue: 0.765 };
          const noteText = `Dying of old age: ${deathRollDeath.dateOfDeath}`;
          nameCell.note = noteText;
        }
        else {
          // Take alternating coloring into account
          // White (1, 1, 1) for even rows, light gray (#f6f8f9) for odd rows
          // Translated to RGB with decimals: red: 0.965, green: 0.973, blue: 0.9765
          if (i % 2 === 0) {
            nameCell.backgroundColor = { red: 1, green: 1, blue: 1 };
          }
          else {
            nameCell.backgroundColor = { red: 0.965, green: 0.973, blue: 0.9765 };
          }

          // Remove any existing notes
          const existingNote = nameCell.note;
          if (existingNote !== null) {
            nameCell.note = null;
          }

          // If commoner, add note with when they become notable
          if (player.character.socialClassName === 'Commoner') {
            const yearTurningNotable = player.character.yearOfCreation + 2;
            const noteText = `Becomes Notable in year ${yearTurningNotable}`;
            nameCell.note = noteText;
          }
        }
      }

      await regionSheet.saveUpdatedCells();
    }


    // Write deceased to sheet
    const deceasedSheet = citizensDoc.sheetsByTitle['Deceased'];

    const deceaseds = await Deceased.findAll({
      include: {
        model: Characters, as: 'character',
        attributes: ['name', 'yearOfMaturity'],
        include: [
          { model: Houses, as: 'house', attributes: ['name'] },
          { model: Regions, as: 'region', attributes: ['name'] }
        ]
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

    try {
      await deceasedSheet.resize({ rowCount: sortedDeceaseds.length + 1 });
    } catch (error) {
      console.error('Error resizing deceased sheet:', error);
    }
    await deceasedSheet.loadCells();
    for (const [i, deceased] of sortedDeceaseds.entries()) {
      const nameCell = deceasedSheet.getCell(i + 1, 0);
      const affiliationCell = deceasedSheet.getCell(i + 1, 1);
      const dateOfDeathCell = deceasedSheet.getCell(i + 1, 2);
      const ageOfDeathCell = deceasedSheet.getCell(i + 1, 3);
      const causeOfDeathCell = deceasedSheet.getCell(i + 1, 4);
      const snowflakeCell = deceasedSheet.getCell(i + 1, 5);

      nameCell.value = deceased.character.name;
      affiliationCell.value = deceased.character.house ? deceased.character.house.name : deceased.character.region.name;
      dateOfDeathCell.value = deceased.dateOfDeath;
      ageOfDeathCell.value = deceased.yearOfDeath - deceased.character.yearOfMaturity;
      causeOfDeathCell.value = deceased.causeOfDeath;
      snowflakeCell.value = deceased.playedById;
    }

    await deceasedSheet.saveUpdatedCells();


    console.log('Finished writing data to new sheets.');

    return interaction.editReply({
      content: 'The data has been written.', flags: MessageFlags.Ephemeral
    });
  }
}