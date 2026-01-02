const { EmbedBuilder, userMention, inlineCode } = require('discord.js');
const { Players, Characters, Regions, Houses, SocialClasses, Duchies, Vassals, Steelbearers, Worlds, Relationships, Deceased, PlayableChildren, DeathRollDeaths } = require('./dbObjects.js');
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

async function addPlayerToDatabase(storyteller, { id, ign, timezone = null } = {}) {
  // storyteller is required
  if (!storyteller) {
    throw new Error('storyteller is required');
  }

  const playerNotCreatedEmbed = new EmbedBuilder()
    .setTitle('Player Not Created')
    .setColor(COLORS.RED);


  // Check whether there are spaces in the IGN
  if (ign.includes(' ')) {
    playerNotCreatedEmbed
      .setDescription('IGN cannot contain spaces.');
    return { player: null, embed: playerNotCreatedEmbed };
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

    return { player, embed: playerCreatedEmbed };
  }
  catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      playerNotCreatedEmbed
        .setDescription('A player with the same ID or IGN already exists.');
      return { player: null, embed: playerNotCreatedEmbed };
    }
    else {
      console.log(error);
      playerNotCreatedEmbed
        .setDescription(`An error occured while trying to create the player: ${error.message}`);
      return { player: null, embed: playerNotCreatedEmbed };
    }

  }
}

async function addCharacterToDatabase(storyteller, { name = 'Unnamed', sex = undefined, regionId = null, houseId = null, socialClassName = 'Commoner', yearOfMaturity = null, parent1Id = null, parent2Id = null } = {}) {
  const characterNotCreatedEmbed = new EmbedBuilder()
    .setTitle('Character Not Created')
    .setColor(COLORS.RED);

  // storyteller is required
  if (!storyteller) {
    throw new Error('storyteller is required');
  }

  const world = await Worlds.findOne({ where: { name: 'Elstrand' } });

  // If yearOfMaturity is null (not provided), set it to current year
  yearOfMaturity = yearOfMaturity === null ? world.currentYear : yearOfMaturity;

  // If regionId or houseId is null, set to Wanderer or ruling house of region respectively
  const wandererRegion = await Regions.findOne({ where: { name: 'Wanderer' } });
  if (regionId === null) {
    regionId = wandererRegion.id;
  }
  if (houseId === null) {
    if (regionId !== wandererRegion.id) {
      const rulingHouse = await Houses.findOne({ where: { id: (await Regions.findByPk(regionId)).rulingHouseId } });
      houseId = rulingHouse.id;
    }
  }

  const existsWithName = await Characters.findOne({ where: { name: name } });
  if (existsWithName) {
    // Ignore if name is 'Son' or 'Daughter'
    if (name === 'Son' || name === 'Daughter') {
      // Allow creation
    } else {
      characterNotCreatedEmbed
        .setDescription('A character with the same name already exists.');
      return { character: null, embed: characterNotCreatedEmbed };
    }
  }

  try {
    const character = await Characters.create({
      name: name,
      sex: sex,
      regionId: regionId,
      houseId: houseId,
      socialClassName: socialClassName,
      yearOfMaturity: yearOfMaturity,
      yearOfCreation: yearOfMaturity,
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
    return { character, embed: characterCreatedEmbed };
  }
  catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      characterNotCreatedEmbed
        .setDescription('That character already exists.');
      return { character: null, embed: characterNotCreatedEmbed };
    }
    else {
      console.log(error);
      characterNotCreatedEmbed
        .setDescription(`An error occured while trying to create the character: ${error.message}`);
      return { character: null, embed: characterNotCreatedEmbed };
    }
  }
}

async function addRelationshipToDatabase(storyteller, { bearingCharacterId, conceivingCharacterId, isCommitted = false, inheritedTitle = 'None' } = {}) {
  // storyteller is required
  if (!storyteller) {
    throw new Error('storyteller is required');
  }

  const relationshipNotCreatedEmbed = new EmbedBuilder()
    .setTitle('Relationship Not Created')
    .setColor(COLORS.RED);


  // Check whether committed is false but inheritedTitle is 'Noble'
  if (!isCommitted && inheritedTitle === 'Noble') {
    relationshipNotCreatedEmbed
      .setDescription('A committed relationship cannot have an inherited title of Noble.');
    return { relationship: null, embed: relationshipNotCreatedEmbed };
  }

  // Get the characters
  const bearingCharacter = await Characters.findOne({ where: { id: bearingCharacterId } });
  const conceivingCharacter = await Characters.findOne({ where: { id: conceivingCharacterId } });

  if (!bearingCharacter) {
    relationshipNotCreatedEmbed
      .setDescription('Bearing character not found.');
    return { relationship: null, embed: relationshipNotCreatedEmbed };
  }

  if (!conceivingCharacter) {
    relationshipNotCreatedEmbed
      .setDescription('Conceiving character not found.');
    return { relationship: null, embed: relationshipNotCreatedEmbed };
  }

  // Check whether the characters are the same
  if (bearingCharacter.id === conceivingCharacter.id) {
    relationshipNotCreatedEmbed
      .setDescription('A character cannot be in a relationship with themselves.');
    return { relationship: null, embed: relationshipNotCreatedEmbed };
  }

  // Check whether either of the characters are deceased
  const bearingCharacterIsDeceased = await Deceased.findOne({ where: { characterId: bearingCharacter.id } });
  const conceivingCharacterIsDeceased = await Deceased.findOne({ where: { characterId: conceivingCharacter.id } });

  if (bearingCharacterIsDeceased) {
    relationshipNotCreatedEmbed
      .setDescription('The bearing character, ' + inlineCode(bearingCharacter.name) + ', is deceased and cannot be in a relationship.');
    return { relationship: null, embed: relationshipNotCreatedEmbed };
  }
  if (conceivingCharacterIsDeceased) {
    relationshipNotCreatedEmbed
      .setDescription('The conceiving character, ' + inlineCode(conceivingCharacter.name) + ', is deceased and cannot be in a relationship.');
    return { relationship: null, embed: relationshipNotCreatedEmbed };
  }

  // Check whether either of the characters are commoners
  if (bearingCharacter.socialClassName === 'Commoner') {
    relationshipNotCreatedEmbed
      .setDescription('The bearing character, ' + inlineCode(bearingCharacter.name) + ', is a Commoner and cannot be in a relationship.');
    return { relationship: null, embed: relationshipNotCreatedEmbed };
  }
  if (conceivingCharacter.socialClassName === 'Commoner') {
    relationshipNotCreatedEmbed
      .setDescription('The conceiving character, ' + inlineCode(conceivingCharacter.name) + ', is a Commoner and cannot be in a relationship.');
    return { relationship: null, embed: relationshipNotCreatedEmbed };
  }

  // Check whether either of the characters are already in a relationship as opposite roles
  const bearingCharacterExistsAsConceiving = await Relationships.findOne({
    where: { conceivingCharacterId: bearingCharacter.id }
  });

  if (bearingCharacterExistsAsConceiving) {
    relationshipNotCreatedEmbed
      .setDescription('The bearing partner, ' + inlineCode(bearingCharacter.name) + ', is already a conceiving partner in another relationship.');
    return { relationship: null, embed: relationshipNotCreatedEmbed };
  }

  const conceivingCharacterExistsAsBearing = await Relationships.findOne({
    where: { bearingCharacterId: conceivingCharacter.id }
  });

  if (conceivingCharacterExistsAsBearing) {
    relationshipNotCreatedEmbed
      .setDescription('The conceiving partner, ' + inlineCode(conceivingCharacter.name) + ', is already a bearing partner in another relationship.');
    return { relationship: null, embed: relationshipNotCreatedEmbed };
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
    relationshipNotCreatedEmbed
      .setDescription('These two characters are already in a relationship together.');
    return { relationship: null, embed: relationshipNotCreatedEmbed };
  }

  // If all checks have been passed, create the relationship
  try {
    const relationship = await Relationships.create({
      bearingCharacterId: bearingCharacter.id,
      conceivingCharacterId: conceivingCharacter.id,
      isCommitted: isCommitted,
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

    return { relationship, embed: relationshipCreatedEmbed };
  }
  catch (error) {
    console.log(error);
    relationshipNotCreatedEmbed
      .setDescription(`An error occured while trying to create the relationship: ${error.message}`);
    return { relationship: null, embed: relationshipNotCreatedEmbed };
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
  // storyteller is required
  if (!storyteller) {
    throw new Error('storyteller is required');
  }

  const notAssignedEmbed = new EmbedBuilder()
    .setTitle('Character Not Assigned')
    .setColor(COLORS.RED);

  try {
    const guild = await client.guilds.fetch(guilds.cot);
    const member = await guild.members.fetch(playerId);

    const character = await Characters.findByPk(characterId);
    if (!character) {
      notAssignedEmbed
        .setDescription('Character not found in database.');
      return notAssignedEmbed;
    }

    // Check whether player exists in database
    const player = await Players.findByPk(playerId);

    if (!player) {
      notAssignedEmbed
        .setDescription(userMention(member.id) + ' does not exist in the database, so they cannot be assigned a character.');
      return notAssignedEmbed;
    }

    // Check whether character is deceased
    const foundDeceasedRecord = await Deceased.findOne({
      where: { characterId: characterId }
    });

    if (foundDeceasedRecord) {
      notAssignedEmbed
        .setDescription(inlineCode(character.name) + ' is deceased and cannot be assigned to a player.');
      return notAssignedEmbed;
    }

    // Check whether a character is already assigned to the player
    if (player.characterId) {
      notAssignedEmbed
        .setDescription(userMention(member.id) + ' is already playing a character.');
      return notAssignedEmbed;
    }

    // Check whether already being played by another player
    const existingPlayer = await Players.findOne({
      where: { characterId: characterId }
    });

    if (existingPlayer) {
      notAssignedEmbed
        .setDescription(inlineCode(character.name) + ' is already assigned to another player.');
      return notAssignedEmbed;
    }

    // If playable child, make sure that is mature
    const playableChild = await PlayableChildren.findOne({ where: { characterId: characterId } });
    if (playableChild) {
      const currentYear = (await Worlds.findOne({ where: { name: 'Elstrand' } })).currentYear;
      if (character.yearOfMaturity > currentYear) {
        notAssignedEmbed
          .setDescription(inlineCode(character.name) + ' is a playable child and is not yet mature.');
        return notAssignedEmbed;
      }
    }

    /**
     * Checks successful, proceed with assignment
     */
    await player.setCharacter(characterId);
    await syncMemberRolesWithCharacter(player, character)

    // If the character was a playable child, remove that entry
    if (playableChild) {
      await playableChild.destroy();
    }

    await postInLogChannel(
      'Character assigned to Player',
      '**Assigned by**: ' + userMention(storyteller.id) + '\n\n' +
      'Character: ' + inlineCode(character.name) + ` (${inlineCode(character.id)})` + '\n' +
      'Player: ' + userMention(playerId) + ` (${inlineCode(playerId)})`,
      COLORS.BLUE
    )

    // Make an embed for assignment to return
    const assignedEmbed = new EmbedBuilder()
      .setTitle('Character assigned to Player')
      .setDescription(
        `**Character:** ${character.name}\n` +
        `**Player:** ${userMention(playerId)}`
      )
      .setColor(COLORS.BLUE);

    return assignedEmbed;
  }
  catch (error) {
    console.log(error);
    notAssignedEmbed
      .setDescription(`An error occurred while trying to assign the character: ${error.message}`);
    return notAssignedEmbed;
  }
}

async function assignSteelbearerToRegion(storyteller, character, type, duchyId = null) {
  // storyteller is required
  if (!storyteller) {
    throw new Error('storyteller is required');
  }

  const notAssignedEmbed = new EmbedBuilder()
    .setTitle('Steelbearer Not Assigned')
    .setColor(COLORS.RED);

  try {
    // Check whether character exists
    if (!character) {
      notAssignedEmbed
        .setDescription('Character not found in database.');
      return { steelbearer: null, embed: notAssignedEmbed };
    }

    // Get the region from the character's current region
    const region = await Regions.findByPk(character.regionId);
    // Check whether part of a region that is not wanderer
    if (!region || region.name === 'Wanderer') {
      notAssignedEmbed
        .setDescription('Character is not part of a valid region that can have steelbearers assigned.');
      return { steelbearer: null, embed: notAssignedEmbed };
    }

    // Check whether character is not a commoner
    if (character.socialClassName === 'Commoner') {
      notAssignedEmbed
        .setDescription(inlineCode(character.name) + ' is a Commoner and cannot be assigned as a steelbearer.');
      return { steelbearer: null, embed: notAssignedEmbed };
    }

    // Check whether character is already a steelbearer
    const existingSteelbearer = await Steelbearers.findOne({ where: { characterId: character.id } });
    if (existingSteelbearer) {
      notAssignedEmbed
        .setDescription(inlineCode(character.name) + ' is already a steelbearer.');
      return { steelbearer: null, embed: notAssignedEmbed };
    }

    // Do checks assuming different types
    if (type === 'General-purpose') {
      // If general-purpose, check whether region is a vassal. If they are,
      // cannot assign general-purpose steelbearer
      const isVassal = await Vassals.findOne({ where: { vassalId: region.id } });
      if (isVassal) {
        notAssignedEmbed
          .setDescription('Cannot assign a general-purpose steelbearer to a vassal region.');
        return { steelbearer: null, embed: notAssignedEmbed };
      }

      // If not a vassal, make sure at most 3 general-purpose steelbearers exist in the region
      const generalPurposeSteelbearers = await Steelbearers.findAll({
        where: {
          regionId: region.id,
          type: 'General-purpose'
        }
      });

      if (generalPurposeSteelbearers.length >= 3) {
        notAssignedEmbed
          .setDescription('Region already has the maximum of 3 general-purpose steelbearers.');
        return { steelbearer: null, embed: notAssignedEmbed };
      }
    }
    else if (type === 'Ruler') {
      // Make sure that the character has the 'Ruler' social class
      if (character.socialClassName !== 'Ruler') {
        notAssignedEmbed
          .setDescription(inlineCode(character.name) + ' is not the Ruler and cannot be assigned as a Ruler steelbearer.');
        return { steelbearer: null, embed: notAssignedEmbed };
      }

      // Make sure there is not already a ruler steelbearer in the region
      const rulerSteelbearer = await Steelbearers.findOne({
        where: {
          regionId: region.id,
          type: 'Ruler'
        }
      });

      if (rulerSteelbearer) {
        notAssignedEmbed
          .setDescription('Region already has a Ruler steelbearer assigned.');
        return { steelbearer: null, embed: notAssignedEmbed };
      }
    }
    else if (type === 'Vassal') {
      // Make sure that the region has vassals
      const vassals = await Vassals.findAll({ where: { liegeId: region.id } });
      if (vassals.length === 0) {
        notAssignedEmbed
          .setDescription(inlineCode(region.name) + ' has no vassal regions and cannot have vassal steelbearers assigned.');
        return { steelbearer: null, embed: notAssignedEmbed };
      }

      // Make sure that there are at most 2 times as many vassal steelbearers as there are vassal regions
      const vassalSteelbearers = await Steelbearers.findAll({
        where: {
          regionId: region.id,
          type: 'Vassal'
        }
      });

      if (vassalSteelbearers.length >= 2 * vassals.length) {
        notAssignedEmbed
          .setDescription('Region already has the maximum number of vassal steelbearers assigned.');
        return { steelbearer: null, embed: notAssignedEmbed };
      }
    }
    else if (type === 'Duchy') {
      // Make sure duchyId is provided
      if (!duchyId) {
        notAssignedEmbed
          .setDescription('Duchy must be provided when assigning a Duchy steelbearer.');
        return { steelbearer: null, embed: notAssignedEmbed };
      }

      // Make sure duchy exists and belongs to the region
      const duchy = await region.getDuchies({ where: { id: duchyId } });
      if (duchy.length === 0) {
        notAssignedEmbed
          .setDescription('Duchy not found in the specified region.');
        return { steelbearer: null, embed: notAssignedEmbed };
      }

      // Make sure duchy does not already have a steelbearer (steelbearerId is not null)
      const duchySteelbearer = await Duchies.findOne({ where: { steelbearerId: { [Op.not]: null }, id: duchyId } });
      if (duchySteelbearer) {
        notAssignedEmbed
          .setDescription('Duchy already has a steelbearer assigned.');
        return { steelbearer: null, embed: notAssignedEmbed };
      }
    }


    // If all checks passed, create the steelbearer
    const steelbearer = await Steelbearers.create({
      characterId: character.id,
      regionId: region.id,
      type: type
    });

    // If it was a duchy steelbearer, set the duchy's steelbearerId, and make
    // text to add to posting in log channel
    let logDuchyText = '';
    let formattedDuchyText = '';
    if (type === 'Duchy') {
      const duchy = await region.getDuchies({ where: { id: duchyId } });
      if (duchy.length > 0) {
        await duchy[0].update({ steelbearerId: steelbearer.id });
        logDuchyText = `\nduchy: ${inlineCode(duchy[0].name)} (${inlineCode(duchy[0].id)})`;
        formattedDuchyText = `\n**Duchy:** ${duchy[0].name}`;
      }
    }

    // Sync roles of member if applicable
    const player = await Players.findOne({ where: { characterId: character.id } });
    if (player) {
      await syncMemberRolesWithCharacter(player, character);
    }

    // Post creation of steelbearer in log channel
    await postInLogChannel(
      'Steelbearer assigned to Region',
      '**Assigned by: ' + userMention(storyteller.id) + '**\n\n' +
      (await steelbearer.logInfo) +
      logDuchyText,
      COLORS.BLUE
    )

    // Make an embed for assignment to return
    const assignedEmbed = new EmbedBuilder()
      .setTitle('Steelbearer assigned to Region')
      .setDescription(
        `**Steelbearer:** ${character.name}\n` +
        `**Region:** ${region.name}\n` +
        `**Type:** ${type}` +
        formattedDuchyText
      )
      .setColor(COLORS.GREEN);

    return { steelbearer, embed: assignedEmbed };
  }
  catch (error) {
    console.log(error);
    notAssignedEmbed
      .setDescription(`An error occurred while trying to assign the steelbearer: ${error.message}`);
    return { steelbearer: null, embed: notAssignedEmbed };
  }
}

async function addDeceasedToDatabase(storyteller, removeRoles, { characterId, yearOfDeath, monthOfDeath, dayOfDeath, causeOfDeath, playedById } = {}) {
  // storyteller is required
  if (!storyteller) {
    throw new Error('storyteller is required');
  }

  const deceasedNotCreatedEmbed = new EmbedBuilder()
    .setTitle('Deceased Not Created')
    .setColor(COLORS.RED);

  // Do some checks
  const character = await Characters.findByPk(characterId);
  if (!character) {
    deceasedNotCreatedEmbed
      .setDescription('Character does not exist in the database.');
    return { deceased: null, embed: deceasedNotCreatedEmbed };
  }

  // Check whether character is not commoner while not a wanderer
  if (character.socialClassName === 'Commoner' && !(await Regions.findByPk(character.regionId)).name === 'Wanderer') {
    deceasedNotCreatedEmbed
      .setDescription('Character is a Commoner and cannot be marked as deceased.');
    return { deceased: null, embed: deceasedNotCreatedEmbed };
  }

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
      deceasedNotCreatedEmbed
        .setDescription('This character is already marked as deceased.');
      return { deceased: null, embed: deceasedNotCreatedEmbed };
    }
    console.log(error);
    deceasedNotCreatedEmbed
      .setDescription('An error occurred while trying to mark the character as deceased: ' + error.message);
    return { deceased: null, embed: deceasedNotCreatedEmbed };
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
      try {
        const member = await guild.members.fetch(player.id);
        if (member) {
          await member.roles.remove([roles.eshaeryn, roles.firstLanding, roles.noble, roles.notable, roles.riverhelm, roles.ruler, roles.steelbearer, roles.theBarrowlands, roles.theHeartlands, roles.velkharaan, roles.vernados, roles.wanderer]);
        }
      }
      catch (error) {
        console.log('Error fetching member to remove roles on deceased addition: ' + error);
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

  return { deceased, embed: deceasedCreatedEmbed };
}

// Changes the provided values of a character and posts the change to the log
// channel using postInLogChannel.
async function changeCharacterInDatabase(storyteller, character, shouldPostInLogChannel, { newName = null, newSex = null, newRegionId = null, newHouseId = null, newSocialClassName = null, newYearOfMaturity = null, newRole = null, newPveDeaths = null, newComments = null, newParent1Id = null, newParent2Id = null, newIsRollingForBastards = null, newDeathRoll1 = null, newDeathRoll2 = null, newDeathRoll3 = null, newDeathRoll4 = null, newDeathRoll5 = null, newYearOfCreation = null, forceChange = false } = {}) {
  const characterNotChangedEmbed = new EmbedBuilder()
    .setTitle('Character Not Changed')
    .setColor(COLORS.RED);

  if (!character) {
    characterNotChangedEmbed
      .setDescription('Character does not exist in the database.');
    return { character: null, embed: characterNotChangedEmbed };
  }

  let newValues = {};
  let oldValues = {};


  // Save all old and new values for the values that are changing
  if (newName !== null && newName !== character.name) newValues.name = newName; oldValues.name = character.name;
  if (newSex !== null && newSex !== character.sex) newValues.sex = newSex; oldValues.sex = character.sex;
  if (newRegionId !== null && newRegionId !== character.regionId) newValues.regionId = newRegionId; oldValues.regionId = character.regionId;
  if (newHouseId !== null && newHouseId !== character.houseId) newValues.houseId = newHouseId; oldValues.houseId = character.houseId;
  if (newSocialClassName !== null && newSocialClassName !== character.socialClassName) newValues.socialClassName = newSocialClassName; oldValues.socialClassName = character.socialClassName;
  if (newYearOfMaturity !== null && newYearOfMaturity !== character.yearOfMaturity) newValues.yearOfMaturity = newYearOfMaturity; oldValues.yearOfMaturity = character.yearOfMaturity;
  if (newRole !== null && newRole !== character.role) newValues.role = newRole; oldValues.role = character.role;
  if (newPveDeaths !== null && newPveDeaths !== character.pveDeaths) newValues.pveDeaths = newPveDeaths; oldValues.pveDeaths = character.pveDeaths;
  if (newComments !== null && newComments !== character.comments) newValues.comments = newComments; oldValues.comments = character.comments;
  if (newParent1Id !== null && newParent1Id !== character.parent1Id) newValues.parent1Id = newParent1Id; oldValues.parent1Id = character.parent1Id;
  if (newParent2Id !== null && newParent2Id !== character.parent2Id) newValues.parent2Id = newParent2Id; oldValues.parent2Id = character.parent2Id;
  if (newIsRollingForBastards !== null && newIsRollingForBastards !== character.isRollingForBastards) newValues.isRollingForBastards = newIsRollingForBastards; oldValues.isRollingForBastards = character.isRollingForBastards;
  if (newDeathRoll1 !== null && newDeathRoll1 !== character.deathRoll1) newValues.deathRoll1 = newDeathRoll1; oldValues.deathRoll1 = character.deathRoll1;
  if (newDeathRoll2 !== null && newDeathRoll2 !== character.deathRoll2) newValues.deathRoll2 = newDeathRoll2; oldValues.deathRoll2 = character.deathRoll2;
  if (newDeathRoll3 !== null && newDeathRoll3 !== character.deathRoll3) newValues.deathRoll3 = newDeathRoll3; oldValues.deathRoll3 = character.deathRoll3;
  if (newDeathRoll4 !== null && newDeathRoll4 !== character.deathRoll4) newValues.deathRoll4 = newDeathRoll4; oldValues.deathRoll4 = character.deathRoll4;
  if (newDeathRoll5 !== null && newDeathRoll5 !== character.deathRoll5) newValues.deathRoll5 = newDeathRoll5; oldValues.deathRoll5 = character.deathRoll5;

  // Check if anything is actually changing
  if (Object.keys(newValues).length === 0) {
    characterNotChangedEmbed
      .setDescription('No changes were provided.');
    return { character: null, embed: characterNotChangedEmbed };
  }


  /**
   * Go through relevant new values and do checks to make sure they are valid
   */
  // Check name uniqueness
  if (newValues.name) {
    const existsWithName = await Characters.findOne({ where: { name: newValues.name } });
    if (existsWithName && existsWithName.id !== character.id) {
      characterNotChangedEmbed
        .setDescription('A character with the same name already exists.');
      return { character: null, embed: characterNotChangedEmbed };
    }
  }

  // Check social class validity
  if (newValues.socialClassName) {
    // Cannot go from anything that is not commoner and back to commoner
    if (!forceChange && newValues.socialClassName === 'Commoner' && oldValues.socialClassName !== 'Commoner') {
      characterNotChangedEmbed
        .setDescription('Cannot change character social class back to Commoner from a higher social class.');
      return { character: null, embed: characterNotChangedEmbed };
    }
  }

  // Check rolling for bastards is valid
  if (newValues.isRollingForBastards !== null && newValues.isRollingForBastards === true) {
    // Cannot be a commoner rolling for bastards (also check if changing social 
    // class away from commoner at the same time)
    if (character.socialClassName === 'Commoner' &&
      !(newValues.socialClassName && newValues.socialClassName !== 'Commoner')) {
      characterNotChangedEmbed
        .setDescription('Commoner characters cannot roll for bastards.');
      return { character: null, embed: characterNotChangedEmbed };
    }
  }

  // If changing region, make sure steelbearer is removed
  if (newValues.regionId) {
    // Check whether character is steelbearer by looking at steelbearers
    const steelbearerRecord = await Steelbearers.findOne({ where: { characterId: character.id } });
    if (steelbearerRecord) {
      characterNotChangedEmbed
        .setDescription('Character is a Steelbearer and cannot change regions. Remove the Steelbearer status first.');
      return { character: null, embed: characterNotChangedEmbed };
    }
  }

  // If year of maturity is 0 and new year of maturity is not provided, make 
  // sure to update to at least year of creation
  if (character.yearOfMaturity === 0 && newValues.yearOfMaturity === null) {
    newValues.yearOfMaturity = character.yearOfCreation;
  }

  // If comment is '-', change to null
  if (newValues.comments === '-') {
    newValues.comments = null;
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
      case 'regionId': {
        const oldRegion = await Regions.findByPk(oldValue);
        const newRegion = await Regions.findByPk(newValue);
        logInfoChanges.push({ key: 'region', oldValue: oldRegion ? inlineCode(oldRegion.name) + ' (' + inlineCode(oldRegion.id) + ')' : '-', newValue: newRegion ? inlineCode(newRegion.name) + ' (' + inlineCode(newRegion.id) + ')' : inlineCode('-') });
        formattedInfoChanges.push({ key: '**Region**', oldValue: oldRegion ? oldRegion.name : '-', newValue: newRegion ? newRegion.name : '-' });
        break;
      }
      case 'houseId': {
        const oldHouse = await Houses.findByPk(oldValue);
        const newHouse = await Houses.findByPk(newValue);
        logInfoChanges.push({ key: 'house', oldValue: oldHouse ? inlineCode(oldHouse.name) + ' (' + inlineCode(oldHouse.id) + ')' : inlineCode('-'), newValue: newHouse ? inlineCode(newHouse.name) + ' (' + inlineCode(newHouse.id) + ')' : inlineCode('-') });
        formattedInfoChanges.push({ key: '**House**', oldValue: oldHouse ? oldHouse.name : '-', newValue: newHouse ? newHouse.name : '-' });
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
        logInfoChanges.push({ key: 'comments', oldValue: inlineCode(oldValue ? oldValue : '-'), newValue: inlineCode(newValue ? newValue : '-') });
        formattedInfoChanges.push({ key: '**Comments**', oldValue: oldValue ? oldValue : '-', newValue: newValue ? newValue : '-' });
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
        logInfoChanges.push({ key: 'isRollingForBastards', oldValue: inlineCode(oldValue ? 'Yes' : 'No'), newValue: inlineCode(newValue ? 'Yes' : 'No') });
        formattedInfoChanges.push({ key: '**Rolling for Bastards**', oldValue: oldValue ? 'Yes' : 'No', newValue: newValue ? 'Yes' : 'No' });
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


  return { character, embed: characterChangedEmbed }
}


async function changePlayerInDatabase(storyteller, player, { newIgn = null, newTimezone = null } = {}) {
  const playerNotChangedEmbed = new EmbedBuilder()
    .setTitle('Player Not Changed')
    .setColor(COLORS.RED);

  if (!player) {
    playerNotChangedEmbed
      .setDescription('Player does not exist in the database.');
    return { player: null, embed: playerNotChangedEmbed };
  }

  let newValues = {};
  let oldValues = {};

  // Save all old and new values for the values that are changing
  if (newIgn !== null && newIgn !== player.ign) newValues.ign = newIgn; oldValues.ign = player.ign;
  if (newTimezone !== null && newTimezone !== player.timezone) newValues.timezone = newTimezone; oldValues.timezone = player.timezone;

  // Check if anything is actually changing
  if (Object.keys(newValues).length === 0) {
    playerNotChangedEmbed
      .setDescription('No changes provided.');
    return { player: null, embed: playerNotChangedEmbed };
  }

  if (newValues.ign) {
    // Check whether there are spaces in the IGN
    if (newValues.ign.includes(' ')) {
      playerNotChangedEmbed
        .setDescription('A VS username cannot contain spaces.');
      return { player: null, embed: playerNotChangedEmbed };
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

  return { player, embed: playerChangedEmbed }
}


async function changeRegionInDatabase(storyteller, region, { newRoleId = null, newRulingHouseId = null } = {}) {
  const regionNotChangedEmbed = new EmbedBuilder()
    .setTitle('Region Not Changed')
    .setColor(COLORS.RED);

  if (!region) {
    regionNotChangedEmbed
      .setDescription('Region does not exist in the database.');
    return { region: null, embed: regionNotChangedEmbed };
  }

  let newValues = {};
  let oldValues = {};

  // Save all old and new values for the values that are changing
  if (newRoleId !== null && newRoleId !== region.roleId) newValues.roleId = newRoleId; oldValues.roleId = region.roleId;
  if (newRulingHouseId !== null && newRulingHouseId !== region.rulingHouseId) newValues.rulingHouseId = newRulingHouseId; oldValues.rulingHouseId = region.rulingHouseId;

  // Check if anything is actually changing
  if (Object.keys(newValues).length === 0) {
    regionNotChangedEmbed
      .setDescription('No changes provided.');
    return { region: null, embed: regionNotChangedEmbed };
  }

  // All checks passed, proceed with update
  await region.update(newValues);

  // Post in log channel
  const logInfoChanges = [];
  const formattedInfoChanges = [];
  for (const [key, newValue] of Object.entries(newValues)) {
    const oldValue = oldValues[key];

    switch (key) {
      case 'roleId': {
        logInfoChanges.push({ key: 'roleId', oldValue: inlineCode(oldValue ? oldValue : '-'), newValue: inlineCode(newValue ? newValue : '-') });
        formattedInfoChanges.push({ key: '**Role ID**', oldValue: oldValue ? oldValue : '-', newValue: newValue ? newValue : '-' });
        break;
      }
      case 'rulingHouseId': {
        const oldHouse = await Houses.findByPk(oldValue);
        const newHouse = await Houses.findByPk(newValue);
        logInfoChanges.push({ key: 'rulingHouse', oldValue: oldHouse ? `${inlineCode(oldHouse.name)} (${inlineCode(oldHouse.id)})` : '`-`', newValue: newHouse ? `${inlineCode(newHouse.name)} (${inlineCode(newHouse.id)})` : '`-`' });
        formattedInfoChanges.push({ key: '**Ruling House**', oldValue: oldHouse ? oldHouse.name : '-', newValue: newHouse ? newHouse.name : '-' });
        break;
      }
    }
  }

  await postInLogChannel(
    'Region Changed',
    `**Changed by: ${userMention(storyteller.id)}**\n\n` +
    `Region: ${inlineCode(region.name)} (${inlineCode(region.id)})\n\n` +
    logInfoChanges.map(change => `${change.key}: ${change.oldValue} → ${change.newValue}`).join('\n'),
    COLORS.ORANGE
  );

  // Make an embed for region change to return
  const regionChangedEmbed = new EmbedBuilder()
    .setTitle('Region Changed')
    .setDescription(
      `**Region**: ${region.name}\n\n` +
      formattedInfoChanges.map(change => `${change.key}: ${change.oldValue} → ${change.newValue}`).join('\n')
    )
    .setColor(COLORS.ORANGE);

  return { region, embed: regionChangedEmbed }
}

async function changeHouseInDatabase(storyteller, house, { newName = null, newEmojiName = null } = {}) {
  const houseNotChangedEmbed = new EmbedBuilder()
    .setTitle('House Not Changed')
    .setColor(COLORS.RED);

  if (!house) {
    houseNotChangedEmbed
      .setDescription('House does not exist in the database.');
    return { house: null, embed: houseNotChangedEmbed };
  }

  let newValues = {};
  let oldValues = {};

  // Save all old and new values for the values that are changing
  if (newName !== null && newName !== house.name) newValues.name = newName; oldValues.name = house.name;
  if (newEmojiName !== null && newEmojiName !== house.emojiName) newValues.emojiName = newEmojiName; oldValues.emojiName = house.emojiName;

  // Check if anything is actually changing
  if (Object.keys(newValues).length === 0) {
    houseNotChangedEmbed
      .setDescription('No changes provided.');
    return { house: null, embed: houseNotChangedEmbed };
  }

  // All checks passed, proceed with update
  await house.update(newValues);

  // Post in log channel
  const logInfoChanges = [];
  const formattedInfoChanges = [];
  for (const [key, newValue] of Object.entries(newValues)) {
    const oldValue = oldValues[key];

    switch (key) {
      case 'name': {
        logInfoChanges.push({ key: 'name', oldValue: inlineCode(oldValue), newValue: inlineCode(newValue) });
        formattedInfoChanges.push({ key: '**Name**', oldValue: oldValue, newValue: newValue });
        break;
      }
      case 'emojiName': {
        logInfoChanges.push({ key: 'emojiName', oldValue: inlineCode(oldValue ? oldValue : '-'), newValue: inlineCode(newValue ? newValue : '-') });
        formattedInfoChanges.push({ key: '**Emoji Name**', oldValue: oldValue ? oldValue : '-', newValue: newValue ? newValue : '-' });
        break;
      }
    }
  }

  await postInLogChannel(
    'House Changed',
    `**Changed by: ${userMention(storyteller.id)}**\n\n` +
    `House: ${inlineCode(house.name)} (${inlineCode(house.id)})\n\n` +
    logInfoChanges.map(change => `${change.key}: ${change.oldValue} → ${change.newValue}`).join('\n'),
    COLORS.ORANGE
  );

  // Make an embed for house change to return
  const houseChangedEmbed = new EmbedBuilder()
    .setTitle('House Changed')
    .setDescription(
      `**House**: ${house.name}\n\n` +
      formattedInfoChanges.map(change => `${change.key}: ${change.oldValue} → ${change.newValue}`).join('\n')
    )
    .setColor(COLORS.ORANGE);

  return { house, embed: houseChangedEmbed }
}

async function changePlayableChildInDatabase(storyteller, playableChild, { newComments = null, newLegitimacy = null, newContact1Snowflake = null, newContact2Snowflake = null } = {}) {
  const playableChildNotChangedEmbed = new EmbedBuilder()
    .setTitle('Playable Child Not Changed')
    .setColor(COLORS.RED);

  if (!playableChild) {
    playableChildNotChangedEmbed
      .setDescription('Playable Child does not exist in the database.');
    return { playableChild: null, playableChildNotChangedEmbed };
  }

  let newValues = {};
  let oldValues = {};

  // Save all old and new values for the values that are changing
  if (newComments !== null && newComments !== playableChild.comments) newValues.comments = newComments; oldValues.comments = playableChild.comments;
  if (newLegitimacy !== null && newLegitimacy !== playableChild.legitimacy) newValues.legitimacy = newLegitimacy; oldValues.legitimacy = playableChild.legitimacy;
  if (newContact1Snowflake !== null && newContact1Snowflake !== playableChild.contact1Snowflake) newValues.contact1Snowflake = newContact1Snowflake; oldValues.contact1Snowflake = playableChild.contact1Snowflake;
  if (newContact2Snowflake !== null && newContact2Snowflake !== playableChild.contact2Snowflake) newValues.contact2Snowflake = newContact2Snowflake; oldValues.contact2Snowflake = playableChild.contact2Snowflake;

  // Check if anything is actually changing
  if (Object.keys(newValues).length === 0) {
    playableChildNotChangedEmbed
      .setDescription('No changes were provided.');
    return { playableChild: null, embed: playableChildNotChangedEmbed };
  }

  // All checks passed, proceed with update
  await playableChild.update(newValues);

  // Post in log channel
  const logInfoChanges = [];
  const formattedInfoChanges = [];
  for (const [key, newValue] of Object.entries(newValues)) {
    const oldValue = oldValues[key];

    switch (key) {
      case 'comments': {
        logInfoChanges.push({ key: 'comments', oldValue: inlineCode(oldValue ? oldValue : '-'), newValue: inlineCode(newValue ? newValue : '-') });
        formattedInfoChanges.push({ key: '**Comments**', oldValue: oldValue ? oldValue : '-', newValue: newValue ? newValue : '-' });
        break;
      }
      case 'legitimacy': {
        logInfoChanges.push({ key: 'legitimacy', oldValue: inlineCode(oldValue), newValue: inlineCode(newValue) });
        formattedInfoChanges.push({ key: '**Legitimacy**', oldValue: oldValue, newValue: newValue });
        break;
      }
      case 'contact1Snowflake': {
        logInfoChanges.push({ key: 'contact1', oldValue: oldValue ? `${userMention(oldValue)} (${oldValue})` : '`-`', newValue: newValue ? `${userMention(newValue)} (${newValue})` : '`-`' });
        formattedInfoChanges.push({ key: '**Contact 1**', oldValue: oldValue ? userMention(oldValue) : '-', newValue: newValue ? userMention(newValue) : '-' });
        break;
      }
      case 'contact2Snowflake': {
        logInfoChanges.push({ key: 'contact2', oldValue: oldValue ? `${userMention(oldValue)} (${oldValue})` : '`-`', newValue: newValue ? `${userMention(newValue)} (${newValue})` : '`-`' });
        formattedInfoChanges.push({ key: '**Contact 2**', oldValue: oldValue ? userMention(oldValue) : '-', newValue: newValue ? userMention(newValue) : '-' });
        break;
      }
    }
  }

  const childCharacter = await playableChild.getCharacter();

  await postInLogChannel(
    'Playable Child Changed',
    `**Changed by: ${userMention(storyteller.id)}**\n\n` +
    `id: ${inlineCode(playableChild.id)}\n` +
    `Character: ${inlineCode(childCharacter.name)} (${inlineCode(childCharacter.id)})\n\n` +
    logInfoChanges.map(change => `${change.key}: ${change.oldValue} → ${change.newValue}`).join('\n'),
    COLORS.ORANGE
  );

  // Make an embed for playable child change to return
  const playableChildChangedEmbed = new EmbedBuilder()
    .setTitle('Playable Child Changed')
    .setDescription(
      `**Playable Child**: ${childCharacter.name}\n\n` +
      formattedInfoChanges.map(change => `${change.key}: ${change.oldValue} → ${change.newValue}`).join('\n')
    )
    .setColor(COLORS.ORANGE);

  return { playableChild, embed: playableChildChangedEmbed }
}

async function changeRelationshipInDatabase(storyteller, relationship, { newIsCommitted = null, newInheritedTitle = null } = {}) {
  const relationshipNotChangedEmbed = new EmbedBuilder()
    .setTitle('Relationship Not Changed')
    .setColor(COLORS.RED);

  if (!relationship) {
    relationshipNotChangedEmbed
      .setDescription('Relationship does not exist in the database.');
    return { relationship: null, embed: relationshipNotChangedEmbed };
  }

  let newValues = {};
  let oldValues = {};

  // Save all old and new values for the values that are changing
  if (newIsCommitted !== null && newIsCommitted !== relationship.isCommitted) newValues.isCommitted = newIsCommitted; oldValues.isCommitted = relationship.isCommitted;
  if (newInheritedTitle !== null && newInheritedTitle !== relationship.inheritedTitle) newValues.inheritedTitle = newInheritedTitle; oldValues.inheritedTitle = relationship.inheritedTitle;

  // Check if anything is actually changing
  if (Object.keys(newValues).length === 0) {
    relationshipNotChangedEmbed
      .setDescription('No changes provided.');
    return {
      relationship: null, embed: relationshipNotChangedEmbed
    };
  }

  // If setting inherited title to Noble, make sure relationship is committed
  if (newValues.inheritedTitle && newValues.inheritedTitle === 'Noble') {
    const isCommittedToCheck = newValues.isCommitted !== null ? newValues.isCommitted : relationship.isCommitted;
    if (!isCommittedToCheck) {
      relationshipNotChangedEmbed
        .setDescription('Only committed relationships can have an inherited title of Noble.');
      return { relationship: null, embed: relationshipNotChangedEmbed };
    }
  }

  // All checks passed, proceed with update
  await relationship.update(newValues);

  // Post in log channel
  const logInfoChanges = [];
  const formattedInfoChanges = [];
  for (const [key, newValue] of Object.entries(newValues)) {
    const oldValue = oldValues[key];

    switch (key) {
      case 'isCommitted': {
        logInfoChanges.push({ key: 'isCommitted', oldValue: inlineCode(oldValue ? 'Yes' : 'No'), newValue: inlineCode(newValue ? 'Yes' : 'No') });
        formattedInfoChanges.push({ key: '**Committed**', oldValue: oldValue ? 'Yes' : 'No', newValue: newValue ? 'Yes' : 'No' });
        break;
      }
      case 'inheritedTitle': {
        logInfoChanges.push({ key: 'inheritedTitle', oldValue: inlineCode(oldValue ? oldValue : '-'), newValue: inlineCode(newValue ? newValue : '-') });
        formattedInfoChanges.push({ key: '**Inherited Title**', oldValue: oldValue ? oldValue : '-', newValue: newValue ? newValue : '-' });
        break;
      }
    }
  }

  const bearingCharacter = await relationship.getBearingCharacter();
  const conceivingCharacter = await relationship.getConceivingCharacter();

  await postInLogChannel(
    'Relationship Changed',
    `**Changed by: ${userMention(storyteller.id)}**\n\n` +
    `Relationship: ${bearingCharacter.name} & ${conceivingCharacter.name} (${inlineCode(relationship.id)})\n\n` +
    logInfoChanges.map(change => `${change.key}: ${change.oldValue} → ${change.newValue}`).join('\n'),
    COLORS.ORANGE
  );

  // Make an embed for relationship change to return
  const relationshipChangedEmbed = new EmbedBuilder()
    .setTitle('Relationship Changed')
    .setDescription(
      `**Relationship**: ${bearingCharacter.name} & ${conceivingCharacter.name}\n\n` +
      formattedInfoChanges.map(change => `${change.key}: ${change.oldValue} → ${change.newValue}`).join('\n')
    )
    .setColor(COLORS.ORANGE);

  return { relationship, embed: relationshipChangedEmbed }
}


// Syncs a Discord member's roles based on their character's region and social class
async function syncMemberRolesWithCharacter(player, character) {
  const guild = await client.guilds.fetch(guilds.cot);
  const member = await guild.members.fetch(player.id);

  // If could not find the member on the server, return false
  if (!member) {
    console.log('Could not find member with ID ' + player.id + ' on the server.');
    return false;
  }

  // If member has banned role, do not change roles
  if (member.roles.cache.has(roles.banned)) {
    console.log('Member with ID ' + player.id + ' is banned, not changing roles.');
    return false;
  }

  // Go through the possible roles and track which to add and remove
  let rolesToAdd = [];
  let rolesToRemove = [];

  // Region roles
  try {
    const currentRegion = await character.getRegion();
    const allOtherRegions = await Regions.findAll({ where: { id: { [Op.not]: currentRegion.id } } });
    // Remove all other region roles
    for (const otherRegion of allOtherRegions) {
      if (otherRegion.roleId && member.roles.cache.has(otherRegion.roleId)) {
        rolesToRemove.push(otherRegion.roleId);
      }
    }
    // Add current region role if they don't have it
    if (currentRegion && currentRegion.roleId) {
      if (!member.roles.cache.has(currentRegion.roleId)) {
        rolesToAdd.push(currentRegion.roleId);
      }
    }
  }
  catch (error) {
    console.log('Failed to assign region role: ' + error);
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
    // Check whether character is steelbearer by looking at steelbearers
    const steelbearerRecord = await Steelbearers.findOne({ where: { characterId: character.id } });
    if (steelbearerRecord) {
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
  changeRegionInDatabase,
  changeHouseInDatabase,
  changePlayableChildInDatabase,
  changeRelationshipInDatabase,
  assignSteelbearerToRegion,
  syncMemberRolesWithCharacter,
  COLORS
}; 