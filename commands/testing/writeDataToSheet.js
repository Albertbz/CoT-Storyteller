const { SlashCommandBuilder, InteractionContextType, MessageFlags } = require('discord.js');
const { Players, Characters, Worlds, Affiliations } = require('../../dbObjects.js');
const { spreadsheetDoc } = require('../../sheets.js');
const { GoogleSpreadsheetRow } = require('google-spreadsheet');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('write_data_to_sheet')
    .setDescription('Write all of the current data to the spreadsheet.')
    .setContexts(InteractionContextType.Guild)
    .setDefaultMemberPermissions(0),
  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    // Load in the spreadsheet
    await spreadsheetDoc.loadInfo();

    // Make a map of all sheets
    const affiliationSheets = new Map();

    const affiliations = await Affiliations.findAll();
    for (const affiliation of affiliations) {
      affiliationSheets.set(affiliation, spreadsheetDoc.sheetsByTitle[affiliation.name]);
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

      affiliationSheets.forEach(async (affiliationSheet, affiliation, _) => {
        await affiliationSheet.loadHeaderRow()
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

        await affiliationSheet.clearRows();

        const affiliationRows = affiliationPlayers.map(player => {
          if (player.character.socialClassName === 'Commoner' && affiliation.name !== 'Wanderer') {
            return ({
              'Social Class': player.character.socialClassName,
              'Role': player.character.role === 'Undefined' ? '' : player.character.role,
              'Character Name': player.character.name,
              'Timezone': player.timezone === 'Undefined' ? '' : player.timezone,
              // 'PvE Deaths': player.character.pveDeaths,
              // 'Year of Maturity': player.character.yearOfMaturity,
              // 'Age': world.currentYear - player.character.yearOfMaturity,
              'Discord Snowflake': player.id,
              'Comments': player.character.comments === 'Undefined' ? '' : player.character.comments
            })
          }
          else {
            return ({
              'Social Class': player.character.socialClassName,
              'Role': player.character.role === 'Undefined' ? '' : player.character.role,
              'Character Name': player.character.name,
              'Timezone': player.timezone === 'Undefined' ? '' : player.timezone,
              'PvE Deaths': player.character.pveDeaths,
              'Year of Maturity': player.character.yearOfMaturity,
              'Age': world.currentYear - player.character.yearOfMaturity,
              'Discord Snowflake': player.id,
              'Comments': player.character.comments === 'Undefined' ? '' : player.character.comments
            })
          }
        });

        const rows = await affiliationSheet.addRows(affiliationRows);
        await affiliationSheet.resize({ rowCount: rows.length + 1 })
      });
    }
    catch (error) {
      console.log(error);
    }

    return interaction.editReply({
      content: 'The data has been written.', flags: MessageFlags.Ephemeral
    })
  }
}