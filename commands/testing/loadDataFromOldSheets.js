const { SlashCommandBuilder, InteractionContextType, MessageFlags } = require('discord.js');
const { Players, Characters, Affiliations, Relationships, Deceased } = require('../../dbObjects.js');
const { notableOffspringDoc, citizenryRegistryDoc, offspringDoc } = require('../../sheets.js');
const { Op } = require('sequelize');

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

    const affiliations = await Affiliations.findAll({ where: { name: { [Op.not]: 'Wanderer' } } });
    for (const affiliation of affiliations) {
      houseSheetsRows.set(affiliation.name, await citizenryRegistryDoc.sheetsByTitle[affiliation.name].getRows());
    }

    const members = await interaction.guild.members.fetch();

    // Sync all aging people
    for (const ageRow of ageSheetRows) {
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
        const affiliation = await Affiliations.findOne({ where: { name: ageRow.get('Affiliation') } });

        if (!isWanderer) {
          const socialClassName = houseRow.get('Social Class');
          const comments = houseRow.get('Comments') === '' ? undefined : houseRow.get('Comments');
          const isSteelbearer = comments ? comments.includes('Steelbearer') : false;
          const role = houseRow.get('Role') === '' ? undefined : houseRow.get('Role');

          character = await Characters.create({
            name: ageRow.get('Character Name'),
            affiliationId: affiliation.id,
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
            affiliationId: affiliation.id,
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
    }

    // Sync all commoners
    for (const [houseName, houseRows] of houseSheetsRows) {
      const houseCommonerRows = houseRows.filter(houseRow => houseRow.get('Social Class') === 'Commoner');

      for (const commonerRow of houseCommonerRows) {
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

          const affiliation = await Affiliations.findOne({ where: { name: houseName } });

          character = await Characters.create({
            name: commonerRow.get('Character Name'),
            affiliationId: affiliation.id,
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
      }
    }

    // Load dead characters
    const deceasedSheetRows = await notableOffspringDoc.sheetsByTitle['Deceased'].getRows();
    const deceasedWanderersSheetRows = await notableOffspringDoc.sheetsByTitle['Deceased Wanderers'].getRows();

    // Get xela log for players that have left
    const xelaLogChannel = interaction.client.channels.cache.get('1368236461832274142');
    const messages = []
    // Create message pointer
    let message = await xelaLogChannel.messages
      .fetch({ limit: 1 })
      .then(messagePage => (messagePage.size === 1 ? messagePage.at(0) : null));

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

    // Deceased from Houses
    for (const deceasedRow of deceasedSheetRows) {
      try {
        const [affiliation, _] = await Affiliations.findOrCreate({
          where: { name: deceasedRow.get('Affiliation') }
        });

        const yearOfMaturity = Number(deceasedRow.get('Date of Death').split('\'')[1]) - deceasedRow.get('Age of Death');

        const character = await Characters.create({
          name: deceasedRow.get('Character Name'),
          affiliationId: affiliation.id,
          socialClassName: 'Notable',
          yearOfMaturity: yearOfMaturity,
          pveDeaths: 3
        })

        let member = members.find(member => member.user.username === deceasedRow.get('Player Name'));
        let memberId = null;
        if (!member) {
          try {
            const message = leftMessages.find(message => {
              const hasDescription = message.embeds[0].description;
              if (hasDescription) {
                return message.embeds[0].description.includes(deceasedRow.get('Player Name'));
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

        const deceased = await Deceased.create({
          characterId: character.id,
          dateOfDeath: deceasedRow.get('Date of Death'),
          playedById: memberId,
          causeOfDeath: deceasedRow.get('Cause of Death'),
          ageOfDeath: deceasedRow.get('Age of Death')
        })

      }
      catch (error) {
        console.log('Error for: ' + deceasedRow.get('Player Name') + error)
      }
    }

    // Deceased Wanderers
    for (const deceasedRow of deceasedWanderersSheetRows) {
      try {
        const wandererAffiliation = await Affiliations.findOne({ where: { name: 'Wanderer' } });

        const yearOfMaturity = Number(deceasedRow.get('Date of Death').split('\'')[1]) - deceasedRow.get('Age of Death');

        const character = await Characters.create({
          name: deceasedRow.get('Character Name'),
          affiliationId: wandererAffiliation.id,
          socialClassName: 'Commoner',
          yearOfMaturity: yearOfMaturity,
          pveDeaths: 3
        })

        let member = members.find(member => member.user.username === deceasedRow.get('Player Name'));
        let memberId = null;
        if (!member) {
          try {
            const message = leftMessages.find(message => {
              const hasDescription = message.embeds[0].description;
              if (hasDescription) {
                return message.embeds[0].description.includes(deceasedRow.get('Player Name'));
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
          console.log('Did not find id: ' + deceasedRow.get('Player Name'))
        }
        const deceased = await Deceased.create({
          characterId: character.id,
          dateOfDeath: deceasedRow.get('Date of Death'),
          playedById: memberId,
          causeOfDeath: deceasedRow.get('Cause of Death'),
          ageOfDeath: deceasedRow.get('Age of Death')
        })

      }
      catch (error) {
        console.log('Error for: ' + deceasedRow.get('Player Name') + error)
      }
    }

    // Load offspring stuff
    await offspringDoc.loadInfo();

    // Load playable children
    const playableChildrenRows = await offspringDoc.sheetsByTitle['Playable Children'].getRows();

    for (const playableChildrenRow of playableChildrenRows) {
      try {
        let affiliation = await Affiliations.findOne({ where: { name: playableChildrenRow.get('Affiliation') } })
        if (!affiliation) {
          affiliation = await Affiliations.findOne({ where: { name: 'Wanderer' } });
        }

        const socialClassName = playableChildrenRow.get('Inherited title') === 'None' ? 'Notable' : playableChildrenRow.get('Inherited title');

        const character = await Characters.create({
          name: playableChildrenRow.get('Character Name'),
          sex: playableChildrenRow.get('Sex'),
          yearOfMaturity: playableChildrenRow.get('Year of Maturity'),
          affiliationId: affiliation.id,
          socialClassName: socialClassName,
        })

        const parentNames = playableChildrenRow.get('Parents').split(', ')
        console.log(parentNames)

        const parent1Character = await Characters.findOne({ where: { name: parentNames[0] } });
        if (parent1Character) {
          await character.update({ parent1Id: parent1Character.id });
        }

        if (parentNames.length > 1) {
          const parent2Character = await Characters.findOne({ where: { name: parentNames[1] } });
          if (parent2Character) {
            await character.update({ parent2Id: parent2Character.id });
          }
        }

        // TODO
      }
      catch (error) {
        console.log(error);
        // console.log('Something went wrong with creati')
      }
    }


    // Load relationships
    const relationshipsRows = await offspringDoc.sheetsByTitle['Relationships'].getRows();

    for (const relationshipRow of relationshipsRows) {
      let bearingCharacter;
      let conceivingCharacter;

      const bearingCharacterName = relationshipRow.get('Bearing Partner');
      const conceivingCharacterName = relationshipRow.get('Conceiving Partner');

      try {
        bearingCharacter = await Characters.findOne({ where: { name: bearingCharacterName } });
        if (!bearingCharacter) {
          console.log('Could not find: ' + bearingCharacterName)
        }
      }
      catch (error) {
        console.log('Something went wrong with: ' + bearingCharacterName + '\n' + error);
      }

      try {
        conceivingCharacter = await Characters.findOne({ where: { name: conceivingCharacterName } });
        if (!conceivingCharacter) {
          console.log('Could not find: ' + conceivingCharacterName)
        }
      }
      catch (error) {
        console.log('Something went wrong with: ' + conceivingCharacterName + '\n' + error);
      }

      const isCommitted = relationshipRow.get('Committed') === 'Yes' ? true : false;
      const inheritingTitle = relationshipRow.get('Inherited title');

      try {
        const relationship = await Relationships.create({
          bearingCharacterId: bearingCharacter.id,
          conceivingCharacterId: conceivingCharacter.id,
          isCommitted: isCommitted,
          inheritingTitle: inheritingTitle
        })

        // console.log('The relationship was added to the database succesfully:\n', relationship.toJSON());
      }
      catch (error) {
        console.log('Error creating relationship for ' + bearingCharacterName + ' and ' + conceivingCharacterName + ':\n' + error);
      }
    }

    console.log('Finished loading data from old sheets.')

    return interaction.editReply({
      content: 'The data has been loaded.', flags: MessageFlags.Ephemeral
    })
  }
}