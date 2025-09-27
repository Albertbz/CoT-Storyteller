const { EmbedBuilder, userMention } = require('discord.js');
const { Players, Characters, Affiliations, SocialClasses, Worlds } = require('./dbObjects.js');
const { roles, channels, guilds } = require('./configs/ids.json');

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

async function addCharacterToDatabase(name, sex, affiliationId, socialClassName, storyteller) {
  name = name === null ? 'Unnamed' : name;
  socialClassName = socialClassName === null ? 'Commoner' : socialClassName;
  sex = sex === null ? undefined : sex;

  if (!affiliationId) {
    const wandererAffiliation = await Affiliations.findOne({ where: { name: 'Wanderer' } });
    affiliationId = wandererAffiliation.id;
  }

  try {
    const world = await Worlds.findOne({ where: { name: 'Elstrand' } });

    const character = await Characters.create({
      name: name,
      sex: sex,
      affiliationId: affiliationId,
      socialClassName: socialClassName,
      yearOfMaturity: world.currentYear
    })

    const affiliation = await Affiliations.findOne({ where: { id: affiliationId } });

    postInLogChannel(
      'Character Created',
      '**Created by: ' + userMention(storyteller.id) + '**\n\n' +
      'Name: `' + character.name + '`\n' +
      'Sex: `' + character.sex + '`\n' +
      'Affiliation: `' + affiliation.name + '`\n' +
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
    else {
      console.log(error);
      throw new Error('Something went wrong with creating the character.');
    }
  }
}

async function assignCharacterToPlayer(characterId, playerId, storyteller) {
  try {
    const guild = await client.guilds.fetch(guilds.cot);
    const member = await guild.members.fetch(playerId);

    // Check whether player exists in database
    const player = await Players.findOne({
      where: { id: playerId }
    })

    const playerExists = player !== null;

    if (!playerExists) return playerExists;

    // Remove all roles that they could have had
    await member.roles.remove([roles.commoner, roles.eshaeryn, roles.firstLanding, roles.noble, roles.notable, roles.riverhelm, roles.ruler, roles.steelbearer, roles.theBarrowlands, roles.theHeartlands, roles.velkharaan, roles.vernados, roles.wanderer]);

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

    if (character.socialClass.name === 'Ruler') {
      await member.roles.add([roles.notable, roles.noble, roles.ruler]);
    }
    else if (character.socialClass.name === 'Noble') {
      await member.roles.add([roles.notable, roles.noble]);
    }
    else if (character.socialClass.name === 'Notable') {
      await member.roles.add(roles.notable);
    }

    if (character.isSteelbearer) {
      await member.roles.add(roles.steelbearer);
    }

    postInLogChannel(
      'Character assigned to Player',
      '**Assigned by: ' + userMention(storyteller.id) + '**\n\n' +
      'Character: `' + character.name + '`\n' +
      'Player: ' + userMention(playerId),
      0x0000A3
    )

    return playerExists;
  }
  catch (error) {
    console.log(error)
    return false;
  }
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