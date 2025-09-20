const { SlashCommandBuilder, InteractionContextType, MessageFlags } = require('discord.js');
const { Players, Characters, Worlds, Affiliations, Deceased } = require('../../dbObjects.js');
const { Op } = require('sequelize');
const { citizensDoc, offspringDoc } = require('../../sheets.js');
const { GoogleSpreadsheetRow } = require('google-spreadsheet');

function getFertilityModifier(age) {
  if (age >= 7) return 0;
  if (age >= 6) return 0.3;
  if (age >= 5) return 0.5;
  if (age < 5) return 1;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('write_data_to_sheet')
    .setDescription('Write all of the current data to the spreadsheet.')
    .setContexts(InteractionContextType.Guild)
    .setDefaultMemberPermissions(0),
  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const world = await Worlds.findOne({ where: { name: 'Elstrand' } });

    // Write offspring sheets
    await offspringDoc.loadInfo();
    const relationshipsSheetRows = await offspringDoc.sheetsByTitle['Relationships'].getRows();

    for (const row of relationshipsSheetRows) {
      try {
        const bearingName = row.get('Bearing Partner');
        const conceivingName = row.get('Conceiving Partner');

        const bearingCharacter = await Characters.findOne({ where: { name: bearingName } })
        const conceivingCharacter = await Characters.findOne({ where: { name: conceivingName } })

        const age1 = world.currentYear - bearingCharacter.yearOfMaturity;
        const age2 = world.currentYear - conceivingCharacter.yearOfMaturity;

        const modifier1 = getFertilityModifier(age1);
        const modifier2 = getFertilityModifier(age2);

        const modifier = modifier1 * modifier2;

        row.set('Fertility', modifier);
      }
      catch (error) {
        console.log(error);
      }
    }


    const bastardRollsRows = await offspringDoc.sheetsByTitle['Bastard rolls'].getRows();

    for (const row of bastardRollsRows) {
      const characterName = row.get('Character Name');

      const character = await Characters.findOne({ where: { name: characterName } })

      if (!character) {
        console.log('Could not find: ' + characterName);
        continue;
      }


      const age = world.currentYear - character.yearOfMaturity;
      const modifier = getFertilityModifier(age)

      row.set('Fertility', modifier);
      await row.save();
    }

    // Load in the citizens spreadsheet
    await citizensDoc.loadInfo();

    // Make a map of all affiliation sheets
    const affiliationSheets = new Map();

    const affiliations = await Affiliations.findAll({
      where: { [Op.or]: [{ isRuling: true, name: 'Wanderer' }] }
    });

    for (const affiliation of affiliations) {
      affiliationSheets.set(affiliation, citizensDoc.sheetsByTitle[affiliation.name]);
    }

    try {
      const activePlayers = await Players.findAll({
        where: { isActive: true },
        include: { model: Characters, as: 'character' }
      });

      const world = await Worlds.findOne({ where: { name: 'Elstrand' } });

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

    await deceasedSheet.resize({ rowCount: deceaseds.length + 1 });
    await deceasedSheet.loadCells();
    for (const [i, deceased] of deceaseds.entries()) {
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