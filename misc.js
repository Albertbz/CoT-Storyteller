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
  // storyteller is required
  if (!storyteller) {
    throw new Error('storyteller is required');
  }

  // Check whether there are spaces in the IGN
  if (ign.includes(' ')) {
    throw new Error('IGN cannot contain spaces.');
  }

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

    throw new Error('Something went wrong with creating the player. Please let Albert know.');
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

    if (character.steelbearerState !== 'None') {
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
async function changeCharacterInDatabase(storyteller, character, shouldPostInLogChannel, { newName = null, newSex = null, newAffiliationId = null, newSocialClassName = null, newYearOfMaturity = null, newRole = null, newPveDeaths = null, newComments = null, newParent1Id = null, newParent2Id = null, newIsRollingForBastards = null, newSteelbearerState = null, newDeathRoll1 = null, newDeathRoll2 = null, newDeathRoll3 = null, newDeathRoll4 = null, newDeathRoll5 = null } = {}) {
  let newValues = {};
  let oldValues = {};


  // Save all old and new values for the values that are changing
  if (newName !== null && newName !== character.name) newValues.name = newName; oldValues.name = character.name;
  if (newSex !== null && newSex !== character.sex) newValues.sex = newSex; oldValues.sex = character.sex;
  if (newAffiliationId !== null && newAffiliationId !== character.affiliationId) newValues.affiliationId = newAffiliationId; oldValues.affiliationId = character.affiliationId;
  if (newSocialClassName !== null && newSocialClassName !== character.socialClassName) newValues.socialClassName = newSocialClassName; oldValues.socialClassName = character.socialClassName;
  if (newYearOfMaturity !== null && newYearOfMaturity !== character.yearOfMaturity) newValues.yearOfMaturity = newYearOfMaturity; oldValues.yearOfMaturity = character.yearOfMaturity;
  if (newRole !== null && newRole !== character.role) newValues.role = newRole; oldValues.role = character.role;
  if (newPveDeaths !== null && newPveDeaths !== character.pveDeaths) newValues.pveDeaths = newPveDeaths; oldValues.pveDeaths = character.pveDeaths;
  if (newComments !== null && newComments !== character.comments) newValues.comments = newComments; oldValues.comments = character.comments;
  if (newParent1Id !== null && newParent1Id !== character.parent1Id) newValues.parent1Id = newParent1Id; oldValues.parent1Id = character.parent1Id;
  if (newParent2Id !== null && newParent2Id !== character.parent2Id) newValues.parent2Id = newParent2Id; oldValues.parent2Id = character.parent2Id;
  if (newIsRollingForBastards !== null && newIsRollingForBastards !== character.isRollingForBastards) newValues.isRollingForBastards = newIsRollingForBastards; oldValues.isRollingForBastards = character.isRollingForBastards;
  if (newSteelbearerState !== null && newSteelbearerState !== character.steelbearerState) newValues.steelbearerState = newSteelbearerState; oldValues.steelbearerState = character.steelbearerState;
  if (newDeathRoll1 !== null && newDeathRoll1 !== character.deathRoll1) newValues.deathRoll1 = newDeathRoll1; oldValues.deathRoll1 = character.deathRoll1;
  if (newDeathRoll2 !== null && newDeathRoll2 !== character.deathRoll2) newValues.deathRoll2 = newDeathRoll2; oldValues.deathRoll2 = character.deathRoll2;
  if (newDeathRoll3 !== null && newDeathRoll3 !== character.deathRoll3) newValues.deathRoll3 = newDeathRoll3; oldValues.deathRoll3 = character.deathRoll3;
  if (newDeathRoll4 !== null && newDeathRoll4 !== character.deathRoll4) newValues.deathRoll4 = newDeathRoll4; oldValues.deathRoll4 = character.deathRoll4;
  if (newDeathRoll5 !== null && newDeathRoll5 !== character.deathRoll5) newValues.deathRoll5 = newDeathRoll5; oldValues.deathRoll5 = character.deathRoll5;

  // Check if anything is actually changing
  if (Object.keys(newValues).length === 0) {
    throw new Error('No changes provided.');
  }


  /**
   * Go through relevant new values and do checks to make sure they are valid
   */
  // Check name uniqueness
  if (newValues.name) {
    const existsWithName = await Characters.findOne({ where: { name: newValues.name } });
    if (existsWithName && existsWithName.id !== character.id) {
      throw new Error('A character with the same name already exists.');
    }
  }

  // Check social class validity
  if (newValues.socialClassName) {
    // Cannot go from anything that is not commoner and back to commoner
    if (newValues.socialClassName === 'Commoner' && oldValues.socialClassName !== 'Commoner') {
      throw new Error('Cannot change character social class back to Commoner from a higher social class.');
    }
  }

  // Check steelbearer change is valid
  if (newValues.steelbearerState && newValues.steelbearerState !== 'None') {
    // If becoming a Ruler steelbearer, must be of Ruler social class
    if (newValues.steelbearerState === 'Ruler') {
      const socialClassNameToCheck = newValues.socialClassName ? newValues.socialClassName : character.socialClassName;
      if (socialClassNameToCheck !== 'Ruler') {
        throw new Error('Only characters of Ruler social class can become Ruler steelbearers.');
      }
    }

    // Get all steelbearers of the character's affiliation
    const steelbearersInAffiliation = await Characters.findAll({
      where: {
        affiliationId: character.affiliationId,
        steelbearerState: {
          [Op.not]: 'None'
        },
        id: {
          [Op.not]: character.id
        }
      }
    });

    // Get amount of steelbearers of same type
    const sameTypeSteelbearers = steelbearersInAffiliation.filter(s => s.steelbearerState === newValues.steelbearerState);

    if (newValues.steelbearerState === 'Ruler' && sameTypeSteelbearers.length >= 1) {
      throw new Error('There is already a Ruler steelbearer in this affiliation.');
    }
    else if (newValues.steelbearerState === 'General-purpose' && sameTypeSteelbearers.length >= 3) {
      throw new Error('There are already 3 General-purpose steelbearers in this affiliation.');
    }
    else if (newValues.steelbearerState === 'Duchy' && sameTypeSteelbearers.length >= 3) {
      throw new Error('There are already 3 Duchy steelbearers in this affiliation.');
    }
  }

  // Check rolling for bastards is valid
  if (newValues.isRollingForBastards !== null && newValues.isRollingForBastards === true) {
    // Cannot be a commoner rolling for bastards (also check if changing social 
    // class away from commoner at the same time)
    if (character.socialClassName === 'Commoner' &&
      !(newValues.socialClassName && newValues.socialClassName !== 'Commoner')) {
      throw new Error('Commoner characters cannot roll for bastards.');
    }
  }

  // If changing affiliation, make sure steelbearer is removed
  if (newValues.affiliationId) {
    if (character.steelbearerState !== 'None' &&
      !(newValues.steelbearerState && newValues.steelbearerState === 'None')) {
      newValues.steelbearerState = 'None';
    }
  }


  // All checks passed, prepare the description of changes
  const logInfoChanges = [];
  const formattedInfoChanges = [];

  // Go through each argument and add to description if it changed
  for (const [key, newValue] of Object.entries(newValues)) {
    const oldValue = oldValues[key];

    switch (key) {
      case 'name': {
        logInfoChanges.push({ key: 'name', oldValue: inlineCode(oldValue), newValue: inlineCode(newValue) });
        formattedInfoChanges.push({ key: '**Name**', oldValue: oldValue, newValue: newValue });
        break;
      }
      case 'sex': {
        logInfoChanges.push({ key: 'sex', oldValue: inlineCode(oldValue ? oldValue : '-'), newValue: inlineCode(newValue) });
        formattedInfoChanges.push({ key: '**Sex**', oldValue: oldValue ? oldValue : '-', newValue: newValue });
        break;
      }
      case 'affiliationId': {
        const oldAffiliation = await Affiliations.findByPk(oldValue);
        const newAffiliation = await Affiliations.findByPk(newValue);
        logInfoChanges.push({ key: 'affiliation', oldValue: oldAffiliation ? inlineCode(oldAffiliation.name) + ' (' + inlineCode(oldAffiliation.id) + ')' : '-', newValue: newAffiliation ? inlineCode(newAffiliation.name) + ' (' + inlineCode(newAffiliation.id) + ')' : inlineCode('-') });
        formattedInfoChanges.push({ key: '**Affiliation**', oldValue: oldAffiliation ? oldAffiliation.name : '-', newValue: newAffiliation ? newAffiliation.name : '-' });
        break;
      }
      case 'socialClassName': {
        logInfoChanges.push({ key: 'socialClass', oldValue: inlineCode(oldValue ? oldValue : '-'), newValue: inlineCode(newValue) });
        formattedInfoChanges.push({ key: '**Social Class**', oldValue: oldValue ? oldValue : '-', newValue: newValue });
        break;
      }
      case 'yearOfMaturity': {
        logInfoChanges.push({ key: 'yearOfMaturity', oldValue: inlineCode(oldValue), newValue: inlineCode(newValue) });
        formattedInfoChanges.push({ key: '**Year of Maturity**', oldValue: oldValue, newValue: newValue });
        break;
      }
      case 'role': {
        logInfoChanges.push({ key: 'role', oldValue: inlineCode(oldValue ? oldValue : '-'), newValue: inlineCode(newValue) });
        formattedInfoChanges.push({ key: '**Role**', oldValue: oldValue ? oldValue : '-', newValue: newValue });
        break;
      }
      case 'pveDeaths': {
        logInfoChanges.push({ key: 'pveDeaths', oldValue: inlineCode(oldValue), newValue: inlineCode(newValue) });
        formattedInfoChanges.push({ key: '**PvE Deaths**', oldValue: oldValue, newValue: newValue });
        break;
      }
      case 'comments': {
        logInfoChanges.push({ key: 'comments', oldValue: inlineCode(oldValue ? oldValue : '-'), newValue: inlineCode(newValue) });
        formattedInfoChanges.push({ key: '**Comments**', oldValue: oldValue ? oldValue : '-', newValue: newValue });
        break;
      }
      case 'parent1Id': {
        const oldParent1 = await Characters.findByPk(oldValue);
        const newParent1 = await Characters.findByPk(newValue);
        logInfoChanges.push({ key: 'parent1', oldValue: oldParent1 ? inlineCode(oldParent1.name) + ' (' + inlineCode(oldParent1.id) + ')' : inlineCode('-'), newValue: newParent1 ? inlineCode(newParent1.name) + ' (' + inlineCode(newParent1.id) + ')' : inlineCode('-') });
        formattedInfoChanges.push({ key: '**Parent 1**', oldValue: oldParent1 ? oldParent1.name : '-', newValue: newParent1 ? newParent1.name : '-' });
        break;
      }
      case 'parent2Id': {
        const oldParent2 = await Characters.findByPk(oldValue);
        const newParent2 = await Characters.findByPk(newValue);
        logInfoChanges.push({ key: 'parent2', oldValue: oldParent2 ? inlineCode(oldParent2.name) + ' (' + inlineCode(oldParent2.id) + ')' : inlineCode('-'), newValue: newParent2 ? inlineCode(newParent2.name) + ' (' + inlineCode(newParent2.id) + ')' : inlineCode('-') });
        formattedInfoChanges.push({ key: '**Parent 2**', oldValue: oldParent2 ? oldParent2.name : '-', newValue: newParent2 ? newParent2.name : '-' });
        break;
      }
      case 'isRollingForBastards': {
        logInfoChanges.push({ key: 'isRollingForBastards', oldValue: inlineCode(oldValue ? 'Yes' : 'No'), newValue: inlineCode(newValue) });
        formattedInfoChanges.push({ key: '**Rolling for Bastards**', oldValue: oldValue, newValue: newValue });
        break;
      }
      case 'steelbearerState': {
        logInfoChanges.push({ key: 'steelbearerState', oldValue: inlineCode(oldValue), newValue: inlineCode(newValue) });
        formattedInfoChanges.push({ key: '**Steelbearer State**', oldValue: oldValue, newValue: newValue });
        break;
      }
      case 'deathRoll1': {
        logInfoChanges.push({ key: 'deathRoll1', oldValue: inlineCode(oldValue ? oldValue : '-'), newValue: inlineCode(newValue ? newValue : '-') });
        formattedInfoChanges.push({ key: '**Death Roll @ Age 4**', oldValue: oldValue ? oldValue : '-', newValue: newValue ? newValue : '-' });
        break;
      }
      case 'deathRoll2': {
        logInfoChanges.push({ key: 'deathRoll2', oldValue: inlineCode(oldValue ? oldValue : '-'), newValue: inlineCode(newValue ? newValue : '-') });
        formattedInfoChanges.push({ key: '**Death Roll @ Age 5**', oldValue: oldValue ? oldValue : '-', newValue: newValue ? newValue : '-' });
        break;
      }
      case 'deathRoll3': {
        logInfoChanges.push({ key: 'deathRoll3', oldValue: inlineCode(oldValue ? oldValue : '-'), newValue: inlineCode(newValue ? newValue : '-') });
        formattedInfoChanges.push({ key: '**Death Roll @ Age 6**', oldValue: oldValue ? oldValue : '-', newValue: newValue ? newValue : '-' });
        break;
      }
      case 'deathRoll4': {
        logInfoChanges.push({ key: 'deathRoll4', oldValue: inlineCode(oldValue ? oldValue : '-'), newValue: inlineCode(newValue ? newValue : '-') });
        formattedInfoChanges.push({ key: '**Death Roll @ Age 7**', oldValue: oldValue ? oldValue : '-', newValue: newValue ? newValue : '-' });
        break;
      }
      case 'deathRoll5': {
        logInfoChanges.push({ key: 'deathRoll5', oldValue: inlineCode(oldValue ? oldValue : '-'), newValue: inlineCode(newValue ? newValue : '-') });
        formattedInfoChanges.push({ key: '**Death Roll @ Age 8+**', oldValue: oldValue ? oldValue : '-', newValue: newValue ? newValue : '-' });
        break;
      }
    }
  }

  // All checks passed, proceed with update
  await character.update(newValues);


  // If character is being played by a player, update their Discord roles
  const player = await Players.findOne({ where: { characterId: character.id } });
  if (player) {
    await syncMemberRolesWithCharacter(player, character);
  }

  // Post in log channel if applicable
  if (shouldPostInLogChannel) {
    const logInfo = logInfoChanges.map(change => `${change.key}: ${change.oldValue} → ${change.newValue}`).join('\n');
    await postInLogChannel(
      'Character Changed',
      `**Changed by: ${userMention(storyteller.id)}**\n\n` +
      `Character: ${inlineCode(character.name)} (${inlineCode(character.id)})\n\n` +
      logInfo,
      COLORS.ORANGE
    );
  }

  // Make an embed for character change to return
  const characterChangedEmbed = new EmbedBuilder()
    .setTitle('Character Changed')
    .setDescription(
      `**Character**: ${character.name}\n\n` +
      formattedInfoChanges.map(change => `${change.key}: ${change.oldValue} → ${change.newValue}`).join('\n')
    )
    .setColor(COLORS.ORANGE);


  return { character, characterChangedEmbed }
}


async function changePlayerInDatabase(storyteller, player, { newIgn = null, newTimezone = null } = {}) {
  let newValues = {};
  let oldValues = {};

  // Save all old and new values for the values that are changing
  if (newIgn !== null && newIgn !== player.ign) newValues.ign = newIgn; oldValues.ign = player.ign;
  if (newTimezone !== null && newTimezone !== player.timezone) newValues.timezone = newTimezone; oldValues.timezone = player.timezone;

  // Check if anything is actually changing
  if (Object.keys(newValues).length === 0) {
    throw new Error('No changes provided.');
  }

  if (newValues.ign) {
    // Check whether there are spaces in the IGN
    if (newValues.ign.includes(' ')) {
      throw new Error('A VS username cannot contain spaces.');
    }
  }

  // All checks passed, proceed with update
  await player.update(newValues);

  // Post in log channel
  const logInfoChanges = [];
  const formattedInfoChanges = [];
  for (const [key, newValue] of Object.entries(newValues)) {
    const oldValue = oldValues[key];

    switch (key) {
      case 'ign': {
        logInfoChanges.push({ key: 'ign', oldValue: inlineCode(oldValue ? oldValue : '-'), newValue: inlineCode(newValue) });
        formattedInfoChanges.push({ key: '**VS Username**', oldValue: oldValue ? oldValue : '-', newValue: newValue });
        break;
      }
      case 'timezone': {
        logInfoChanges.push({ key: 'timezone', oldValue: inlineCode(oldValue ? oldValue : '-'), newValue: inlineCode(newValue) });
        formattedInfoChanges.push({ key: '**Timezone**', oldValue: oldValue ? oldValue : '-', newValue: newValue });
        break;
      }
    }
  }

  await postInLogChannel(
    'Player Changed',
    `**Changed by: ${userMention(storyteller.id)}**\n\n` +
    `Player: ${userMention(player.id)} (${inlineCode(player.id)})\n\n` +
    logInfoChanges.map(change => `${change.key}: ${change.oldValue} → ${change.newValue}`).join('\n'),
    COLORS.ORANGE
  );

  // Make an embed for player change to return
  const playerChangedEmbed = new EmbedBuilder()
    .setTitle('Player Changed')
    .setDescription(
      `**Player**: ${userMention(player.id)}\n\n` +
      formattedInfoChanges.map(change => `${change.key}: ${change.oldValue} → ${change.newValue}`).join('\n')
    )
    .setColor(COLORS.ORANGE);

  return { player, playerChangedEmbed }
}


// Syncs a Discord member's roles based on their character's affiliation and social class
async function syncMemberRolesWithCharacter(player, character) {
  const guild = await client.guilds.fetch(guilds.cot);
  const member = await guild.members.fetch(player.id);

  // If could not find the member on the server, return false
  if (!member) {
    console.log('Could not find member with ID ' + player.id + ' on the server.');
    return false;
  }

  // Go through the possible roles and track which to add and remove
  let rolesToAdd = [];
  let rolesToRemove = [];

  // Affiliation roles
  try {
    const currentAffiliation = await character.getAffiliation();
    const allOtherAffiliations = await Affiliations.findAll({ where: { id: { [Op.not]: currentAffiliation.id } } });
    // Remove all other affiliation roles
    for (const otherAffiliation of allOtherAffiliations) {
      if (otherAffiliation.roleId && member.roles.cache.has(otherAffiliation.roleId)) {
        rolesToRemove.push(otherAffiliation.roleId);
      }
    }
    // Add current affiliation role if they don't have it
    if (currentAffiliation && currentAffiliation.roleId) {
      if (!member.roles.cache.has(currentAffiliation.roleId)) {
        rolesToAdd.push(currentAffiliation.roleId);
      }
    }
  }
  catch (error) {
    console.log('Failed to assign affiliation role: ' + error);
    return false;
  }

  // Social class roles
  try {
    const socialClass = await character.getSocialClass();
    if (socialClass.name === 'Ruler') {
      if (!member.roles.cache.has(roles.notable)) rolesToAdd.push(roles.notable);
      if (!member.roles.cache.has(roles.noble)) rolesToAdd.push(roles.noble);
      if (!member.roles.cache.has(roles.ruler)) rolesToAdd.push(roles.ruler);
    }
    else if (socialClass.name === 'Noble') {
      if (!member.roles.cache.has(roles.notable)) rolesToAdd.push(roles.notable);
      if (!member.roles.cache.has(roles.noble)) rolesToAdd.push(roles.noble);
      // Remove ruler if they had it before
      if (member.roles.cache.has(roles.ruler)) rolesToRemove.push(roles.ruler);
    }
    else if (socialClass.name === 'Notable') {
      if (!member.roles.cache.has(roles.notable)) rolesToAdd.push(roles.notable);
      // Remove noble and ruler if they had them before
      if (member.roles.cache.has(roles.noble)) rolesToRemove.push(roles.noble);
      if (member.roles.cache.has(roles.ruler)) rolesToRemove.push(roles.ruler);
    }
    else {
      // Remove notable, noble, and ruler if they had them before
      if (member.roles.cache.has(roles.notable)) rolesToRemove.push(roles.notable);
      if (member.roles.cache.has(roles.noble)) rolesToRemove.push(roles.noble);
      if (member.roles.cache.has(roles.ruler)) rolesToRemove.push(roles.ruler);
    }
  }
  catch (error) {
    console.log('Failed to assign social class roles: ' + error);
    return false;
  }

  // Steelbearer role
  try {
    if (character.steelbearerState && character.steelbearerState !== 'None') {
      if (!member.roles.cache.has(roles.steelbearer)) {
        rolesToAdd.push(roles.steelbearer);
      }
    }
    else {
      // Remove steelbearer role if they had it before
      if (member.roles.cache.has(roles.steelbearer)) {
        rolesToRemove.push(roles.steelbearer);
      }
    }
  }
  catch (error) {
    console.log('Failed to assign steelbearer role: ' + error);
    return false;
  }

  // Proceed with adding and removing roles
  try {
    if (rolesToAdd.length > 0) {
      await member.roles.add(rolesToAdd);
    }
    if (rolesToRemove.length > 0) {
      await member.roles.remove(rolesToRemove);
    }
  }
  catch (error) {
    console.log('Failed to add or remove roles: ' + error);
    return false;
  }

  return true;
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
  changeCharacterInDatabase,
  changePlayerInDatabase,
  COLORS
}; 