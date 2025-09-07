const { EmbedBuilder, userMention } = require('discord.js');
const { Players, Characters, Affiliations, SocialClasses, Worlds } = require('./dbObjects.js');
const { roles, channels } = require('./configs/ids.json');

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
      'Timezone: `' + player.timezone + '`',
      0x008000
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

async function addCharacterToDatabase(name, sex, affiliationName, socialClassName, storyteller) {
  name = name === null ? 'Unnamed' : name;
  sex = sex === null ? 'Undefined' : sex;
  affiliationName = affiliationName === null ? 'Wanderer' : affiliationName;
  socialClassName = socialClassName === null ? 'Commoner' : socialClassName;

  try {
    const world = await Worlds.findOne({ where: { name: 'Elstrand' } });

    const character = await Characters.create({
      name: name,
      sex: sex,
      affiliationName: affiliationName,
      socialClassName: socialClassName,
      yearOfMaturity: world.currentYear
    })

    postInLogChannel(
      'Character Created',
      '**Created by: ' + userMention(storyteller.id) + '**\n\n' +
      'Name: `' + character.name + '`\n' +
      'Sex: `' + character.sex + '`\n' +
      'Affiliation: `' + character.affiliationName + '`\n' +
      'Social class: `' + character.socialClassName + '`\n' +
      'Year of Maturity: `' + character.yearOfMaturity + '`',
      0x008000
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

  // If already playing a character, then remove the roles of said character from member
  const alreadyPlayingACharacter = player.characterId !== null;
  if (alreadyPlayingACharacter) {
    const oldCharacter = await Characters.findOne({
      where: { id: player.characterId },
      include: [
        { model: Affiliations, as: 'affiliation' },
        { model: SocialClasses, as: 'socialClass' }
      ]
    })

    await member.roles.remove([oldCharacter.affiliation.roleId, oldCharacter.socialClass.roleId, roles.steelbearer]);
  }

  // Update the association
  await player.update({ characterId: characterId });

  // Get the new character and update the roles of the member
  const character = await Characters.findOne({
    where: { id: characterId },
    include: [
      { model: Affiliations, as: 'affiliation' },
      { model: SocialClasses, as: 'socialClass' }
    ]
  });
  await member.roles.add(character.affiliation.roleId);
  // If both a wanderer and a commoner, then this statement is not satisfied
  if (!(character.affiliation.name === 'Wanderer' && character.socialClass.name === 'Commoner')) {
    await member.roles.add(character.socialClass.roleId);
  }
  if (character.isSteelbearer) await member.roles.add(roles.steelbearer);

  postInLogChannel(
    'Character assigned to Player',
    '**Assigned by: ' + userMention(storyteller.id) + '**\n\n' +
    'Character: `' + character.name + '`\n' +
    'Player: ' + userMention(playerId),
    0x0000A3
  )

  return playerExists;
}

async function postInLogChannel(title, description, color) {
  const embedLog = new EmbedBuilder()
    .setTitle(title)
    .setDescription(description)
    .setColor(color)
  const logChannel = await client.channels.fetch(channels.storytellerLog);
  logChannel.send({ embeds: [embedLog] });
}

module.exports = { addPlayerToDatabase, addCharacterToDatabase, assignCharacterToPlayer, postInLogChannel }