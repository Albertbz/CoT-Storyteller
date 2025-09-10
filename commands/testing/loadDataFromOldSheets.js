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

    // Sync all aging people
    ageSheetRows.forEach(async ageRow => {
      let player = null;
      let character = null;

      const member = members.find(member => member.user.username === ageRow.get('Discord Username'));
      if (!member) {
        console.log('User not found: ' + ageRow.get('Discord Username'))
        return 0;
      }


      const affiliationName = ageRow.get('Affiliation');
      const isWanderer = affiliationName === 'Wanderer';

      let houseRows = null;
      let houseRow = null;
      try {
        if (!isWanderer) {
          houseRows = houseSheetsRows.get(ageRow.get('Affiliation'));
          houseRow = houseRows.find(houseRow => houseRow.get('Discord Username') === ageRow.get('Discord Username'));

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
          return 0;
        }
        else {
          console.log('Something went wrong with creating the player: ' + ageRow.get('Discord Username'));
          console.log(error)

          return 0;
        }
      }

      try {
        if (!isWanderer) {
          const socialClassName = houseRow.get('Social Class');
          const comments = houseRow.get('Comments') === '' ? undefined : houseRow.get('Comments');
          const isSteelbearer = comments ? comments.includes('Steelbearer') : false;
          const role = houseRow.get('Role') === '' ? undefined : houseRow.get('Role');

          character = await Characters.create({
            name: ageRow.get('Character Name'),
            affiliationName: ageRow.get('Affiliation'),
            socialClassName: socialClassName,
            pveDeaths: ageRow.get('PvE Deaths'),
            yearOfMaturity: ageRow.get('Year of Maturity'),
            isSteelbearer: isSteelbearer,
            role: role,
            comments: comments
          })
        }
        else {
          const socialClassName = member.roles.cache.some(role => role.name === 'Notable') ? 'Notable' : 'Commoner';

          character = await Characters.create({
            name: ageRow.get('Character Name'),
            affiliationName: ageRow.get('Affiliation'),
            pveDeaths: ageRow.get('PvE Deaths'),
            yearOfMaturity: ageRow.get('Year of Maturity'),
            socialClassName: socialClassName
          })
        }
      }
      catch (error) {
        if (error.name === 'SequelizeUniqueConstraintError') {
          console.log('Character already exists: ' + ageRow.get('Character Name'));
          return 0;
        }
        else {
          console.log('Something went wrong with creating the character: ' + ageRow.get('Character Name'));
          console.log(error);
          return 0;
        }
      }

      await player.update({ characterId: character.id });
    })

    // Sync all commoners
    houseSheetsRows.forEach((houseRows, houseName, _) => {
      const houseCommonerRows = houseRows.filter(houseRow => houseRow.get('Social Class') === 'Commoner');

      houseCommonerRows.forEach(async commonerRow => {
        const user = members.find(member => member.user.username === commonerRow.get('Discord Username'));
        if (!user) {
          console.log('User not found: ' + commonerRow.get('Discord Username'))
          return 0;
        }

        let player = null;
        try {
          const timezone = commonerRow.get('Timezone') === '' ? undefined : commonerRow.get('Timezone');

          player = await Players.create({
            id: user.id,
            ign: commonerRow.get('VS Username'),
            timezone: timezone
          });

        }
        catch (error) {
          if (error.name === 'SequelizeUniqueConstraintError') {
            console.log('Player already exists: ' + commonerRow.get('Discord Username'));
            return 0;
          }
          else {
            console.log('Something went wrong with creating the player: ' + commonerRow.get('Discord Username'));
            console.log(error)
            return 0;
          }
        }

        let character = null;
        try {
          const role = commonerRow.get('Role') === '' ? undefined : commonerRow.get('Role');
          const comments = commonerRow.get('Comments') === '' ? undefined : commonerRow.get('Comments');

          character = await Characters.create({
            name: commonerRow.get('Character Name'),
            affiliationName: houseName,
            role: role,
            comments: comments
          })
        }
        catch (error) {
          if (error.name === 'SequelizeUniqueConstraintError') {
            console.log('Character already exists: ' + commonerRow.get('Character Name'));
            return 0;
          }
          else {
            console.log('Something went wrong with creating the character: ' + commonerRow.get('Character Name'));
            console.log(error);
            return 0;
          }
        }

        await player.update({ characterId: character.id })
      });
    })

    return interaction.editReply({
      content: 'The data has been loaded.', flags: MessageFlags.Ephemeral
    })
  }
}