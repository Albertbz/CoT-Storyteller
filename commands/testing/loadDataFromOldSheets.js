const { SlashCommandBuilder, InteractionContextType, MessageFlags } = require('discord.js');
const { Players, Characters } = require('../../dbObjects.js');
const { notableOffspringDoc, citizenryRegistryDoc } = require('../../sheets.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('load_data_from_old_sheets')
    .setDescription('Load the data from the old sheets.')
    .setContexts(InteractionContextType.Guild)
    .setDefaultMemberPermissions(0),
  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    // Load notable/offspring document
    await notableOffspringDoc.loadInfo();
    const ageSheet = notableOffspringDoc.sheetsByTitle['Age'];
    ageSheet.loadHeaderRow(6);
    const ageSheetRows = await ageSheet.getRows();

    // Load citizenry registry document
    await citizenryRegistryDoc.loadInfo();
    const houseSheetsRows = new Map();
    houseSheetsRows.set('Aetos', await citizenryRegistryDoc.sheetsByTitle['Aetos'].getRows());
    houseSheetsRows.set('Ayrin', await citizenryRegistryDoc.sheetsByTitle['Ayrin'].getRows());
    houseSheetsRows.set('Dayne', await citizenryRegistryDoc.sheetsByTitle['Dayne'].getRows());
    houseSheetsRows.set('Farring', await citizenryRegistryDoc.sheetsByTitle['Farring'].getRows());
    houseSheetsRows.set('Locke', await citizenryRegistryDoc.sheetsByTitle['Locke'].getRows());
    houseSheetsRows.set('Merrick', await citizenryRegistryDoc.sheetsByTitle['Merrick'].getRows());
    houseSheetsRows.set('Wildhart', await citizenryRegistryDoc.sheetsByTitle['Wildhart'].getRows());

    const members = await interaction.guild.members.fetch();

    ageSheetRows.forEach(async ageRow => {
      let player = null;

      const user = members.find(member => member.user.username === ageRow.get('Discord Username'));
      if (!user) return 0;

      const houseRows = houseSheetsRows.get(ageRow.get('Affiliation'));
      const houseRow = houseRows.find(houseRow => houseRow.get('Discord Username') === ageRow.get('Discord Username'));

      try {
        player = await Players.create({
          id: user.id,
          ign: ageRow.get('VS Username'),
          timezone: houseRow.get('Timezone')
        });

      }
      catch (error) {
        if (error.name === 'SequelizeUniqueConstraintError') {
          console.log('Player already exists: ' + ageRow.get('Discord Username'));
          return 0;
        }

        console.log('Something went wrong with creating the player: ' + ageRow.get('Discord Username'));

        return 0;
      }

      let character = null;
      try {

        const socialClassName = houseRow.get('Social Class');
        const comments = houseRow.get('Comments');
        const isSteelbearer = comments ? comments.includes('Steelbearer') : false;
        // const isSteelbearer = houseRow.get('Comments').includes('Steelbearer') ?? false;
        const role = houseRow.get('Role');

        character = await Characters.create({
          name: ageRow.get('Character Name'),
          affiliationName: ageRow.get('Affiliation'),
          socialClassName: socialClassName,
          pveDeaths: ageRow.get('PvE Deaths'),
          yearOfMaturity: ageRow.get('Year of Maturity'),
          isSteelbearer: isSteelbearer,
          role: role
        })
      }
      catch (error) {
        if (error.name === 'SequelizeUniqueConstraintError') {
          console.log('Character already exists: ' + ageRow.get('Character Name'));
          return 0;
        }

        console.log('Something went wrong with creating the character.');
        return 0;
      }

      await player.update({ characterId: character.id });
    })

    return interaction.editReply({
      content: 'The data has been loaded.', flags: MessageFlags.Ephemeral
    })
  }
}