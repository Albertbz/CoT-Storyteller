const { EmbedBuilder, userMention, inlineCode } = require('discord.js');
const { Players, Characters, Affiliations, SocialClasses, Worlds, Relationships, Deceased, PlayableChildren, DeathRollDeaths } = require('./dbObjects.js');
const { roles, channels, guilds } = require('./configs/ids.json');
const { Op } = require('sequelize');

const COLORS = {
  BLUE: 0x0000A3,
  GREEN: 0x00A300,
  RED: 0xA30000,
  LIGHT_YELLOW: 0xFFFFA3,
  YELLOW: 0xA3A300,
  ORANGE: 0xFFA500
};

async function addPlayerToDatabase(id, ign, timezone, storyteller) {
  try {
    const player = await Players.create({
      id: id,
      ign: ign,
      timezone: timezone
    });

    await postInLogChannel(
      'Player Created',
      '**Created by: ' + userMention(storyteller.id) + '**\n\n' +
      (await player.logInfo),
      COLORS.GREEN
    )

    // Make an embed for player creation to return
    const playerCreatedEmbed = new EmbedBuilder()
      .setTitle('Player Created')
      .setDescription((await player.formattedInfo))
      .setColor(COLORS.GREEN);

    return { player, playerCreatedEmbed };
  }
  catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      throw new Error('That player already exists.');
    }

    throw new Error('Something went wrong with creating the player.');
  }
}

async function addCharacterToDatabase(storyteller, { name = 'Unnamed', sex = undefined, affiliationId = null, socialClassName = 'Commoner', yearOfMaturity = null, parent1Id = null, parent2Id = null } = {}) {
  // storyteller is required
  if (!storyteller) {
    throw new Error('storyteller is required');
  }

  const world = await Worlds.findOne({ where: { name: 'Elstrand' } });

  // Preserve previous behavior when callers pass explicit nulls
  name = name === null ? 'Unnamed' : name;
  socialClassName = socialClassName === null ? 'Commoner' : socialClassName;
  sex = sex === null ? undefined : sex;
  yearOfMaturity = yearOfMaturity === null ? world.currentYear : yearOfMaturity;

  if (affiliationId === null || affiliationId === undefined) {
    const wandererAffiliation = await Affiliations.findOne({ where: { name: 'Wanderer' } });
    affiliationId = wandererAffiliation.id;
  }

  const existsWithName = await Characters.findOne({ where: { name: name } });
  if (existsWithName) {
    // Ignore if name is 'Son' or 'Daughter'
    if (name === 'Son' || name === 'Daughter') {
      // Allow creation
    } else {
      throw new Error('A character with the same name already exists.');
    }
  }

  try {
    const character = await Characters.create({
      name: name,
      sex: sex,
      affiliationId: affiliationId,
      socialClassName: socialClassName,
      yearOfMaturity: yearOfMaturity,
      parent1Id: parent1Id,
      parent2Id: parent2Id
    })

    await postInLogChannel(
      'Character Created',
      '**Created by: ' + userMention(storyteller.id) + '**\n\n' +
      (await character.logInfo),
      COLORS.GREEN
    )

    // Make an embed for character creation to return
    const characterCreatedEmbed = new EmbedBuilder()
      .setTitle('Character Created')
      .setDescription((await character.formattedInfo))
      .setColor(COLORS.GREEN);

    // Return both the character and the creation embed
    return { character, characterCreatedEmbed };
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

async function addRelationshipToDatabase(storyteller, { bearingCharacterId, conceivingCharacterId, committed = false, inheritedTitle = 'None' } = {}) {
  // storyteller is required
  if (!storyteller) {
    throw new Error('storyteller is required');
  }

  // Check whether committed is false but inheritedTitle is 'Noble'
  if (!committed && inheritedTitle === 'Noble') {
    throw new Error('A committed relationship cannot have an inherited title of Noble.');
  }

  // Get the characters
  const bearingCharacter = await Characters.findOne({ where: { id: bearingCharacterId } });
  const conceivingCharacter = await Characters.findOne({ where: { id: conceivingCharacterId } });

  if (!bearingCharacter) {
    throw new Error('Bearing character not found.');
  }

  if (!conceivingCharacter) {
    throw new Error('Conceiving character not found.');
  }

  // Check whether the characters are the same
  if (bearingCharacter.id === conceivingCharacter.id) {
    throw new Error('A character cannot be in a relationship with themselves.');
  }

  // Check whether either of the characters are deceased
  const bearingCharacterIsDeceased = await Deceased.findOne({ where: { characterId: bearingCharacter.id } });
  const conceivingCharacterIsDeceased = await Deceased.findOne({ where: { characterId: conceivingCharacter.id } });

  if (bearingCharacterIsDeceased) {
    throw new Error('The bearing character, ' + inlineCode(bearingCharacter.name) + ', is deceased and cannot be in a relationship.');
  }
  if (conceivingCharacterIsDeceased) {
    throw new Error('The conceiving character, ' + inlineCode(conceivingCharacter.name) + ', is deceased and cannot be in a relationship.');
  }

  // Check whether either of the characters are not commoners
  if (bearingCharacter.socialClassName === 'Commoner') {
    throw new Error('The bearing character, ' + inlineCode(bearingCharacter.name) + ', is a Commoner and cannot be in a relationship.');
  }
  if (conceivingCharacter.socialClassName === 'Commoner') {
    throw new Error('The conceiving character, ' + inlineCode(conceivingCharacter.name) + ', is a Commoner and cannot be in a relationship.');
  }

  // Check whether either of the characters are already in a relationship as opposite roles
  const bearingCharacterExistsAsConceiving = await Relationships.findOne({
    where: { conceivingCharacterId: bearingCharacter.id }
  });

  if (bearingCharacterExistsAsConceiving) {
    throw new Error('The bearing partner, ' + inlineCode(bearingCharacter.name) + ', is already a conceiving partner in another relationship.');
  }

  const conceivingCharacterExistsAsBearing = await Relationships.findOne({
    where: { bearingCharacterId: conceivingCharacter.id }
  });

  if (conceivingCharacterExistsAsBearing) {
    throw new Error('The conceiving partner, ' + inlineCode(conceivingCharacter.name) + ', is already a bearing partner in another relationship.');
  }

  // Check whether the two characters are already in a relationship together
  const existingRelationship = await Relationships.findOne({
    where: {
      [Op.or]: [
        {
          bearingCharacterId: bearingCharacter.id,
          conceivingCharacterId: conceivingCharacter.id
        },
        {
          bearingCharacterId: conceivingCharacter.id,
          conceivingCharacterId: bearingCharacter.id
        }
      ]
    }
  })

  if (existingRelationship) {
    throw new Error('These two characters are already in a relationship together.');
  }

  // If all checks have been passed, create the relationship
  try {

    const relationship = await Relationships.create({
      bearingCharacterId: bearingCharacter.id,
      conceivingCharacterId: conceivingCharacter.id,
      isCommitted: committed,
      inheritedTitle: inheritedTitle
    });

    await postInLogChannel(
      'Relationship Created',
      '**Created by: ' + userMention(storyteller.id) + '**\n\n' +
      (await relationship.logInfo),
      COLORS.GREEN
    )

    // Make an embed for relationship creation to return
    const relationshipCreatedEmbed = new EmbedBuilder()
      .setTitle('Relationship Created')
      .setDescription((await relationship.formattedInfo))
      .setColor(COLORS.GREEN);

    return { relationship, relationshipCreatedEmbed };
  }
  catch (error) {
    console.log(error);
    throw new Error('Something went wrong with creating the relationship.');
  }
}

async function addPlayableChildToDatabase(storyteller, { characterId, legitimacy, contact1Snowflake, contact2Snowflake } = {}) {
  // storyteller is required
  if (!storyteller) {
    throw new Error('storyteller is required');
  }

  try {
    // Create the playable child
    const playableChild = await PlayableChildren.create({
      characterId: characterId,
      legitimacy: legitimacy,
      contact1Snowflake: contact1Snowflake,
      contact2Snowflake: contact2Snowflake
    });

    await postInLogChannel(
      'Playable Child Created',
      '**Created by: ' + userMention(storyteller.id) + '**\n\n' +
      (await playableChild.logInfo),
      COLORS.GREEN
    )

    // Make an embed for playable child creation to return
    const playableChildCreatedEmbed = new EmbedBuilder()
      .setTitle('Playable Child Created')
      .setDescription((await playableChild.formattedInfo))
      .setColor(COLORS.GREEN);

    return { playableChild, playableChildCreatedEmbed };
  }
  catch (error) {
    console.log(error);
    throw new Error('Something went wrong with creating the playable child.');
  }
}

async function assignCharacterToPlayer(characterId, playerId, storyteller) {
  try {
    const guild = await client.guilds.fetch(guilds.cot);
    const member = await guild.members.fetch(playerId);

    const character = await Characters.findOne({ where: { id: characterId } });

    // Check whether player exists in database
    const player = await Players.findOne({
      where: { id: playerId }
    })

    if (!player) {
      throw new Error(userMention(member.id) + ' does not exist in the database, so they cannot be assigned a character.');
    }

    // Check whether character is deceased
    const foundDeceasedRecord = await Deceased.findOne({
      where: { characterId: characterId }
    });

    if (foundDeceasedRecord) {
      throw new Error(inlineCode(character.name) + ' is deceased and cannot be assigned to a player.');
    }

    // Check whether a character is already assigned to the player
    if (player.characterId) {
      throw new Error(userMention(member.id) + ' is already playing a character.');
    }

    // Check whether already being played by another player
    const existingPlayer = await Players.findOne({
      where: { characterId: characterId }
    });

    if (existingPlayer) {
      throw new Error(inlineCode(character.name) + ' is already assigned to another player.');
    }

    // If playable child, make sure that is mature
    const playableChild = await PlayableChildren.findOne({ where: { characterId: characterId } });
    if (playableChild) {
      const currentYear = (await Worlds.findOne({ where: { name: 'Elstrand' } })).currentYear;
      if (character.yearOfMaturity > currentYear) {
        throw new Error(inlineCode(character.name) + ' is a playable child and is not yet mature.');
      }
    }

    /**
     * Checks successful, proceed with assignment
     */

    // Remove all roles that they could have had
    await member.roles.remove([roles.commoner, roles.eshaeryn, roles.firstLanding, roles.noble, roles.notable, roles.riverhelm, roles.ruler, roles.steelbearer, roles.theBarrowlands, roles.theHeartlands, roles.velkharaan, roles.vernados, roles.wanderer]);

    // Update the association
    await player.update({ characterId: characterId });

    // If the character was a playable child, remove that entry
    if (playableChild) {
      await playableChild.destroy();
    }

    // Assign roles based on affiliation and social class
    try {
      const affiliation = await character.getAffiliation();
      await member.roles.add(affiliation.roleId);
    }
    catch (error) {
      console.log('Failed to assign affiliation role: ' + error);
      await player.setCharacter(null);
      throw new Error('Failed to assign affiliation role. Is the character set to a non-ruling house?');
    }

    const socialClass = await character.getSocialClass();
    if (socialClass.name === 'Ruler') {
      await member.roles.add([roles.notable, roles.noble, roles.ruler]);
    }
    else if (socialClass.name === 'Noble') {
      await member.roles.add([roles.notable, roles.noble]);
    }
    else if (socialClass.name === 'Notable') {
      await member.roles.add(roles.notable);
    }

    if (character.steelbearer) {
      await member.roles.add(roles.steelbearer);
    }

    await postInLogChannel(
      'Character assigned to Player',
      '**Assigned by: ' + userMention(storyteller.id) + '**\n\n' +
      'Character: ' + inlineCode(character.name) + ` (${inlineCode(character.id)})` + '\n' +
      'Player: ' + userMention(playerId) + ` (${inlineCode(playerId)})`,
      COLORS.BLUE
    )

    // Make an embed for assignment to return
    const assignedEmbed = new EmbedBuilder()
      .setTitle('Character assigned to Player')
      .setDescription(
        'Character: ' + inlineCode(character.name) + '\n' +
        'Player: ' + userMention(playerId)
      )
      .setColor(COLORS.BLUE);

    return assignedEmbed;
  }
  catch (error) {
    throw new Error(error.message);
  }
}

async function addDeceasedToDatabase(storyteller, removeRoles, { characterId, yearOfDeath, monthOfDeath, dayOfDeath, causeOfDeath, playedById } = {}) {
  // storyteller is required
  if (!storyteller) {
    throw new Error('storyteller is required');
  }

  try {
    let deceased = null;
    try {
      deceased = await Deceased.create({
        characterId: characterId,
        yearOfDeath: yearOfDeath,
        monthOfDeath: monthOfDeath,
        dayOfDeath: dayOfDeath,
        causeOfDeath: causeOfDeath,
        playedById: playedById
      });
    }
    catch (error) {
      if (error.name === 'SequelizeUniqueConstraintError') {
        throw new Error('This character is already marked as deceased.');
      }
      console.log(error);
      throw new Error('Something went wrong with adding the deceased character.');
    }

    // If exists in deathRollsDeaths, remove from there
    const existingDeathRollRecord = await DeathRollDeaths.findOne({ where: { characterId: characterId } });
    if (existingDeathRollRecord) {
      await existingDeathRollRecord.destroy();
    }

    // Set player's character to null if applicable
    let player = null;
    if (playedById) {
      player = await Players.findOne({ where: { id: playedById } });
      if (player) {
        await player.setCharacter(null);
      }
    }
    // Remove roles of member if specified
    if (removeRoles && playedById) {
      if (player) {
        const guild = await client.guilds.fetch(guilds.cot);
        const member = await guild.members.fetch(player.id);
        if (member) {
          await member.roles.remove([roles.eshaeryn, roles.firstLanding, roles.noble, roles.notable, roles.riverhelm, roles.ruler, roles.steelbearer, roles.theBarrowlands, roles.theHeartlands, roles.velkharaan, roles.vernados, roles.wanderer]);
        }
      }
    }

    await postInLogChannel(
      'Character made Deceased',
      '**Made deceased by: ' + userMention(storyteller.id) + '**\n\n' +
      (await deceased.logInfo),
      COLORS.BLUE
    );

    // Make an embed for deceased creation to return
    const deceasedCreatedEmbed = new EmbedBuilder()
      .setTitle('Character made Deceased')
      .setDescription((await deceased.formattedInfo))
      .setColor(COLORS.BLUE);

    return { deceased, deceasedCreatedEmbed };
  }
  catch (error) {
    throw new Error(error.message);
  }
}

// Changes the provided values of a character and posts the change to the log
// channel using postInLogChannel.
async function changeCharacter(storyteller, character, shouldPostInLogChannel, { newName, newSex, newAffiliationId, newSocialClassName, newYearOfMaturity, newRole, newPveDeaths, newComments, newParent1Id, newParent2Id, newIsRollingForBastards, newSteelbearerState, newDeathRoll1, newDeathRoll2, newDeathRoll3, newDeathRoll4, newDeathRoll5 } = {}) {
  const oldValues = {
    name: character.name,
    sex: character.sex,
    affiliationId: character.affiliationId,
    socialClassName: character.socialClassName,
    yearOfMaturity: character.yearOfMaturity,
    role: character.role,
    pveDeaths: character.pveDeaths,
    comments: character.comments,
    parent1Id: character.parent1Id,
    parent2Id: character.parent2Id,
    isRollingForBastards: character.isRollingForBastards,
    steelbearerState: character.steelbearerState,
    deathRoll1: character.deathRoll1,
    deathRoll2: character.deathRoll2,
    deathRoll3: character.deathRoll3,
    deathRoll4: character.deathRoll4,
    deathRoll5: character.deathRoll5
  };

  const newValues = {
  };

  if (newName !== undefined) newValues.name = newName;
  if (newSex !== undefined) newValues.sex = newSex;
  if (newAffiliationId !== undefined) newValues.affiliationId = newAffiliationId;
  if (newSocialClassName !== undefined) newValues.socialClassName = newSocialClassName;
  if (newYearOfMaturity !== undefined) newValues.yearOfMaturity = newYearOfMaturity;
  if (newRole !== undefined) newValues.role = newRole;
  if (newPveDeaths !== undefined) newValues.pveDeaths = newPveDeaths;
  if (newComments !== undefined) newValues.comments = newComments;
  if (newParent1Id !== undefined) newValues.parent1Id = newParent1Id;
  if (newParent2Id !== undefined) newValues.parent2Id = newParent2Id;
  if (newIsRollingForBastards !== undefined) newValues.isRollingForBastards = newIsRollingForBastards;
  if (newSteelbearerState !== undefined) newValues.steelbearerState = newSteelbearerState;
  if (newDeathRoll1 !== undefined) newValues.deathRoll1 = newDeathRoll1;
  if (newDeathRoll2 !== undefined) newValues.deathRoll2 = newDeathRoll2;
  if (newDeathRoll3 !== undefined) newValues.deathRoll3 = newDeathRoll3;
  if (newDeathRoll4 !== undefined) newValues.deathRoll4 = newDeathRoll4;
  if (newDeathRoll5 !== undefined) newValues.deathRoll5 = newDeathRoll5;

  // console.log(newValues);

  let changeDescription =
    '**Changed by: ' + userMention(storyteller.id) + '**\n\n' +
    'Character: ' + inlineCode(character.name) + '\n\n';

  for (const [key, newValue] of Object.entries(newValues)) {
    const oldValue = oldValues[key];
    if (oldValue !== newValue) {
      changeDescription += inlineCode(key) + ': ' + inlineCode(oldValue === null ? '-' : String(oldValue)) + ' -> ' + inlineCode(newValue === null ? '-' : String(newValue)) + '\n';
    }
  }

  // Update the character with new values
  await character.update({
    name: newValues.name !== undefined ? newValues.name : character.name,
    sex: newValues.sex !== undefined ? newValues.sex : character.sex,
    affiliationId: newValues.affiliationId !== undefined ? newValues.affiliationId : character.affiliationId,
    socialClassName: newValues.socialClassName !== undefined ? newValues.socialClassName : character.socialClassName,
    yearOfMaturity: newValues.yearOfMaturity !== undefined ? newValues.yearOfMaturity : character.yearOfMaturity,
    role: newValues.role !== undefined ? newValues.role : character.role,
    pveDeaths: newValues.pveDeaths !== undefined ? newValues.pveDeaths : character.pveDeaths,
    comments: newValues.comments !== undefined ? newValues.comments : character.comments,
    parent1Id: newValues.parent1Id !== undefined ? newValues.parent1Id : character.parent1Id,
    parent2Id: newValues.parent2Id !== undefined ? newValues.parent2Id : character.parent2Id,
    isRollingForBastards: newValues.isRollingForBastards !== undefined ? newValues.isRollingForBastards : character.isRollingForBastards,
    steelbearerState: newValues.steelbearerState !== undefined ? newValues.steelbearerState : character.steelbearerState,
    deathRoll1: newValues.deathRoll1 !== undefined ? newValues.deathRoll1 : character.deathRoll1,
    deathRoll2: newValues.deathRoll2 !== undefined ? newValues.deathRoll2 : character.deathRoll2,
    deathRoll3: newValues.deathRoll3 !== undefined ? newValues.deathRoll3 : character.deathRoll3,
    deathRoll4: newValues.deathRoll4 !== undefined ? newValues.deathRoll4 : character.deathRoll4,
    deathRoll5: newValues.deathRoll5 !== undefined ? newValues.deathRoll5 : character.deathRoll5
  });

  if (shouldPostInLogChannel) {
    await postInLogChannel(
      'Character Changed',
      changeDescription,
      COLORS.ORANGE
    );
  }

}

async function postInLogChannel(title, description, color) {
  const logEmbed = new EmbedBuilder()
    .setTitle(title)
    .setDescription(description)
    .setColor(color)
  const logChannel = await client.channels.fetch(channels.storytellerLog);
  await logChannel.send({ embeds: [logEmbed] });
  return logEmbed;
}

function ageToFertilityModifier(age) {
  if (age >= 7) return 0;
  if (age >= 6) return 0.3;
  if (age >= 5) return 0.5;
  if (age < 5) return 1;
}

module.exports = {
  addPlayerToDatabase,
  addCharacterToDatabase,
  assignCharacterToPlayer,
  postInLogChannel,
  ageToFertilityModifier,
  addRelationshipToDatabase,
  addPlayableChildToDatabase,
  addDeceasedToDatabase,
  changeCharacter,
  COLORS
}; 