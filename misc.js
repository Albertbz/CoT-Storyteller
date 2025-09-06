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
      'Player Created',
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
      'Character Created',
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
  const guild = await client.guilds.fetch('1410006882772451517');
  const member = await guild.members.fetch(playerId);

  // Check whether player exists in database
  const player = await Players.findOne({
    where: { id: playerId }
  })

  const playerExists = player !== null;

  if (!playerExists) return playerExists;

  // If already playng a character, then remove the roles of said character from member
  const alreadyPlayingACharacter = player.characterId !== null;
  if (alreadyPlayingACharacter) {
    const oldCharacter = await Characters.findOne({
      where: { id: player.characterId }
    })

    await member.roles.remove([oldCharacter.affiliationId, oldCharacter.socialClassId, roles.steelbearer]);
  }

  // Update the association
  await player.update({ characterId: characterId });

  // Get the new character and update the roles of the member
  const character = await Characters.findOne({ where: { id: characterId } });
  await member.roles.add(character.affiliationId);
  // If both a wanderer and a commoner, then this statement is not satisfied
  if (!(character.affiliationId === roles.wanderer && character.socialClassId === roles.commoner)) {
    await member.roles.add(character.socialClassId);
  }
  if (character.isSteelbearer) await member.roles.add(roles.steelbearer);

  postInLogChannel(
    'Character assigned to Player',
    '**Assigned by: ' + userMention(storyteller.id) + '**\n\n' +
    'Character: `' + character.name + '`\n' +
    'Player: ' + userMention(playerId)
  )

  return playerExists;
}

async function postInLogChannel(title, description) {
  const embedLog = new EmbedBuilder()
    .setTitle(title)
    .setDescription(description)
  const logChannel = await client.channels.fetch(channels.storytellerLog);
  logChannel.send({ embeds: [embedLog] });
}

module.exports = { addPlayerToDatabase, addCharacterToDatabase, assignCharacterToPlayer, postInLogChannel }