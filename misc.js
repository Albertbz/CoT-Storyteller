const { EmbedBuilder, userMention } = require('discord.js');
const { Players, Characters, Affiliations, SocialClasses } = require('./dbObjects.js');
const { roles, channels } = require('./configs/ids.json');
// const { client } = require('./index.js');

async function addPlayerToDatabase(id, ign, timezone, storyteller) {
  timezone = timezone === null ? 'Undefined' : timezone;

  try {
    const player = await Players.create({
      id: id,
      ign: ign,
      timezone: timezone
    });

    postInLogChannel(
      'Database | Player Created',
      '**Created by: ' + userMention(storyteller.id) + '**\n\n' +
      'Discord User: ' + userMention(player.id) + '\n' +
      'VS Username: `' + player.ign + '`\n' +
      'Timezone: `' + player.timezone + '`'
    )

    return player;
  }
  catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      throw new Error('That player already exists.');
    }

    throw new Error('Something went wrong with creating the player.');
  }
}

async function addCharacterToDatabase(name, sex, affiliationId, socialClassId, storyteller) {
  name = name === null ? 'Unnamed' : name;
  sex = sex === null ? 'Undefined' : sex;
  affiliationId = affiliationId === null ? roles.wanderer : affiliationId;
  socialClassId = socialClassId === null ? roles.commoner : socialClassId;

  try {
    const character = await Characters.create({
      name: name,
      sex: sex,
      affiliationId: affiliationId,
      socialClassId: socialClassId,
    })

    const affiliation = await Affiliations.findOne({ where: { id: character.affiliationId } });
    const socialClass = await SocialClasses.findOne({ where: { id: character.socialClassId } });
    postInLogChannel(
      'Database | Character Created',
      '**Created by: ' + userMention(storyteller.id) + '**\n\n' +
      'Name: `' + character.name + '`\n' +
      'Sex: `' + character.sex + '`\n' +
      'Affiliation: `' + affiliation.name + '`\n' +
      'Social class: `' + socialClass.name + '`\n' +
      'Year of Maturity: `' + character.yearOfMaturity + '`'
    )

    return character;
  }
  catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      throw new Error('That character already exists.');
    }

    throw new Error('Something went wrong with creating the character.');
  }
}

async function assignCharacterToPlayer(characterId, playerId, storyteller) {
  const numberOfUpdated = await Players.update(
    { characterId: characterId },
    { where: { id: playerId } }
  );

  const playerExists = numberOfUpdated[0] != 0;

  const character = await Characters.findOne({ where: { id: characterId } });

  if (playerExists) {
    postInLogChannel(
      'Database | Character assigned to Player',
      '**Assigned by: ' + userMention(storyteller.id) + '**\n\n' +
      'Character: `' + character.name + '`\n' +
      'Player: ' + userMention(playerId)
    )
  }

  return playerExists;
}

async function postInLogChannel(title, description) {
  const embedLog = new EmbedBuilder()
    .setTitle(title)
    .setDescription(description)
  const logChannel = await client.channels.fetch(channels.storytellerLog);
  logChannel.send({ embeds: [embedLog] });
}

module.exports = { addPlayerToDatabase, addCharacterToDatabase, assignCharacterToPlayer }