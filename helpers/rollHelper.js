const { Players, DeathRollDeaths, Characters } = require('../dbObjects.js');
const { ageToFertilityModifier, changeCharacterAndLog, postInLogChannel } = require('../misc.js');
const { inlineCode, bold, italic, userMention } = require('discord.js');

const BLUE_COLOR = 0x0000A3;
const GREEN_COLOR = 0x00A300;
const RED_COLOR = 0xA30000;
const LIGHT_YELLOW_COLOR = 0xFFFFA3;
const YELLOW_COLOR = 0xA3A300;
const ORANGE_COLOR = 0xFFA500;

// Returns a random integer between 1 and max (inclusive)
function randomInteger(max) {
  return Math.floor(Math.random() * max + 1);
}

// Centralized thresholds for offspring rolls
const REL_THRESHOLDS = [41, 66, 91, 94, 97, 100];
const BAST_THRESHOLDS = [61, 79, 97, 98, 99, 100];
const OFFSPRING_LABELS = ['Childless', 'Son', 'Daughter', 'Twin Daughters', 'Twin Sons', 'Fraternal Twins'];

// Determine offspring result from thresholds
function determineOffspringResult(childless, son, daughter, twinDaughters, twinSons, twinFraternal, offspringCheck) {
  if (offspringCheck < childless) return ['Childless'];
  if (offspringCheck < son) return ['Son'];
  if (offspringCheck < daughter) return ['Daughter'];
  if (offspringCheck < twinDaughters) return ['Daughter', 'Daughter'];
  if (offspringCheck < twinSons) return ['Son', 'Son'];
  if (offspringCheck < twinFraternal) return ['Son', 'Daughter'];
  if (offspringCheck === 100) {
    const offspringAmount = randomInteger(4) + 2; // 3..6
    const offspring = [];
    for (let i = 0; i < offspringAmount; i++) {
      offspring.push(randomInteger(2) === 1 ? 'Son' : 'Daughter');
    }
    return offspring;
  }
}

function calculateOffspringRoll({ age1, age2 = 0, isBastardRoll = false } = {}) {
  const fertilityModifier = ageToFertilityModifier(age1) * ageToFertilityModifier(age2) * 100;
  const fertilityCheck = randomInteger(100);

  if (fertilityCheck > 100 - fertilityModifier) {
    const offspringCheck = randomInteger(100);
    if (isBastardRoll) {
      const result = determineOffspringResult(...BAST_THRESHOLDS, offspringCheck);
      return { result, fertilityCheck, offspringCheck, fertilityModifier };
    } else {
      const result = determineOffspringResult(...REL_THRESHOLDS, offspringCheck);
      return { result, fertilityCheck, offspringCheck, fertilityModifier };
    }
  }

  return { result: ['Failed Fertility Roll'], fertilityCheck, fertilityModifier };
}

// Human-friendly offspring formatting used by commands
function formatOffspringCounts(rollRes) {
  let amountOfSons = 0;
  let amountOfDaughters = 0;
  for (const r of rollRes) {
    if (r === 'Son') amountOfSons++;
    if (r === 'Daughter') amountOfDaughters++;
  }

  // Special phrasing for twins/fraternal twins
  let text = '';
  if (rollRes.length === 2) {
    if (amountOfSons === 2) text = 'Twin Sons';
    else if (amountOfDaughters === 2) text = 'Twin Daughters';
    else if (amountOfSons === 1 && amountOfDaughters === 1) text = 'Fraternal Twins';
  }

  // Triplets and quadruplets
  if (rollRes.length === 3) {
    if (amountOfSons === 3) text = 'Triplet Sons';
    else if (amountOfDaughters === 3) text = 'Triplet Daughters';
    else text = 'Triplets (' + (amountOfSons + ' Son' + (amountOfSons !== 1 ? 's' : '')) + (amountOfDaughters > 0 ? ' and ' + amountOfDaughters + ' Daughter' + (amountOfDaughters !== 1 ? 's' : '') : '') + ')';
  }

  if (rollRes.length === 4) {
    if (amountOfSons === 4) text = 'Quadruplet Sons';
    else if (amountOfDaughters === 4) text = 'Quadruplet Daughters';
    else text = 'Quadruplets (' + (amountOfSons + ' Son' + (amountOfSons !== 1 ? 's' : '')) + (amountOfDaughters > 0 ? ' and ' + amountOfDaughters + ' Daughter' + (amountOfDaughters !== 1 ? 's' : '') : '') + ')';
  }

  // Quintuplets and sextuplets
  if (rollRes.length === 5) {
    if (amountOfSons === 5) text = 'Quintuplet Sons';
    else if (amountOfDaughters === 5) text = 'Quintuplet Daughters';
    else text = 'Quintuplets (' + (amountOfSons + ' Son' + (amountOfSons !== 1 ? 's' : '')) + (amountOfDaughters > 0 ? ' and ' + amountOfDaughters + ' Daughter' + (amountOfDaughters !== 1 ? 's' : '') : '') + ')';
  }

  if (rollRes.length === 6) {
    if (amountOfSons === 6) text = 'Sextuplet Sons';
    else if (amountOfDaughters === 6) text = 'Sextuplet Daughters';
    else text = 'Sextuplets (' + (amountOfSons + ' Son' + (amountOfSons !== 1 ? 's' : '')) + (amountOfDaughters > 0 ? ' and ' + amountOfDaughters + ' Daughter' + (amountOfDaughters !== 1 ? 's' : '') : '') + ')';
  }

  if (!text) {
    const childrenText = [];
    if (amountOfSons > 1) childrenText.push(amountOfSons + ' Sons');
    else if (amountOfSons === 1) childrenText.push('Son');

    if (amountOfDaughters > 1) childrenText.push(amountOfDaughters + ' Daughters');
    else if (amountOfDaughters === 1) childrenText.push('Daughter');

    text = childrenText.join(' and ');
  }

  return { amountOfSons, amountOfDaughters, text };
}

async function getPlayerSnowflakeForCharacter(characterId) {
  const player = await Players.findOne({ where: { characterId } });
  return player ? player.id : null;
}

function buildOffspringPairLine(bearingName, conceivingName, rollRes, checks = {}) {
  let offspringText = '';
  if (Array.isArray(rollRes) && rollRes.length > 0) {
    const { text } = formatOffspringCounts(rollRes);
    offspringText = text || rollRes.join(', ');
  } else {
    offspringText = Array.isArray(rollRes) ? rollRes.join(', ') : String(rollRes);
  }

  let line = inlineCode(bearingName) + ' & ' + inlineCode(conceivingName) + ' (' + checks.fertilityModifier + '% fertile)' + ':\n' + bold(offspringText)
  const parts = []
  if (typeof checks.fertilityCheck !== 'undefined') parts.push('Fertility: ' + checks.fertilityCheck)
  if (typeof checks.offspringCheck !== 'undefined') parts.push('Offspring: ' + checks.offspringCheck)
  if (parts.length > 0) line += ' ' + italic('(' + parts.join(' / ') + ')')
  return line
}

/**
 * Calculate death roll. Takes age of character, returns whether the character
 * dies, gets X PvE deaths, or lives.
 * Roll a D100, then check the following thresholds:
 * If age = 4, 1-5: Fail roll (1 PvE death)
 * If age = 5, 1-25: Fail roll (2 PvE deaths)
 * If age = 6, 1-50: Fail roll (3 PvE deaths)
 * If age = 7, 1-75: Fail roll (Guaranteed death)
 * If age >= 8, 1-90: Fail roll (Guaranteed death)
 * If roll fails, check for number of PvE deaths the character currently has,
 * and if the number of PvE deaths added to the number of PvE deaths from this
 * roll is more than 3, the character dies. Otherwise, they gain the number of
 * PvE deaths from this roll.
 * @param {Characters} character The character to roll death for.
 * @returns {Object} An object with the roll result. Contains:
 *  - roll: The D100 roll result.
 *  - deathsFromRoll: Number of PvE deaths from the roll (0 if unharmed).
 *  - status: One of 'unharmed', 'gains_pve_deaths', 'dies'.
 */

function calculateDeathRoll(character, worldYear) {
  const roll = randomInteger(100);
  let deathsFromRoll = 0;
  const age = worldYear - character.yearOfMaturity;
  if (age === 4 && roll <= 5) {
    deathsFromRoll = 1;
  } else if (age === 5 && roll <= 25) {
    deathsFromRoll = 2;
  } else if (age === 6 && roll <= 50) {
    deathsFromRoll = 3;
  } else if (age === 7 && roll <= 75) {
    deathsFromRoll = 4; // Guaranteed death
  } else if (age >= 8 && roll <= 90) {
    deathsFromRoll = 4; // Guaranteed death
  }

  if (deathsFromRoll === 0) {
    return { roll, deathsFromRoll: 0, status: 'unharmed' };
  }

  const totalPvEDeaths = (character.pveDeaths || 0) + deathsFromRoll;
  if (totalPvEDeaths >= 4) {
    return { roll, deathsFromRoll, status: 'dies' };
  } else {
    return { roll, deathsFromRoll, status: 'gains_pve_deaths' };
  }
}

function rollDeathAndGetResult(character, nextYear) {
  // Do the roll itself
  const { roll, deathsFromRoll, status } = calculateDeathRoll(character, nextYear);

  const age = nextYear - character.yearOfMaturity;

  // To use if the character has died
  // 24 days, random day
  const dayOfDeath = Math.floor(Math.random() * 24) + 1;
  // 4 months, random month. Map to month names now
  const monthOfDeathNumber = Math.floor(Math.random() * 4) + 1;
  const monthNames = ['January', 'February', 'March', 'April'];
  const monthOfDeath = monthNames[monthOfDeathNumber - 1];
  // Year of death is next year
  const yearOfDeath = nextYear;

  let resultDescription = '';
  let color = BLUE_COLOR;
  if (status === 'unharmed') {
    resultDescription = inlineCode(character.name) + ' (' + age + ' years old) rolled ' + inlineCode(roll) + ' and did not lose any PvE lives.';
    color = GREEN_COLOR;
  } else if (status === 'gains_pve_deaths') {
    resultDescription = inlineCode(character.name) + ' (' + age + ' years old) rolled ' + inlineCode(roll) + ' and lost ' + inlineCode(deathsFromRoll) + ' PvE li' + (deathsFromRoll > 1 ? 'ves' : 'fe') + '.';
    color = ORANGE_COLOR;
  } else if (status === 'dies') {
    resultDescription = inlineCode(character.name) + ' (' + age + ' years old) rolled ' + inlineCode(roll) + ' and will die on ' + inlineCode(dayOfDeath + ' ' + monthOfDeath + ', \'' + yearOfDeath) + '.';
    color = RED_COLOR;
  }

  return { resultDescription, color, roll, deathsFromRoll, status, dayOfDeath, monthOfDeath, yearOfDeath };
}

async function saveDeathResultToDatabase(character, interactionUser, nextYear, roll, deathsFromRoll, status, dayOfDeath, monthOfDeath, yearOfDeath, diedCharacters, lost1PveLife, lost2PveLives, lost3PveLives) {
  // Get player that plays the character
  const player = await Players.findOne({ where: { characterId: character.id } });

  if (!player) {
    console.log(`No player found for character ${character.name} (ID: ${character.id}).`);
  }

  // Save the death roll result to the database by updating
  // the character's PvE deaths or adding them to the temporary 
  // DeathRollDeaths table, as well as updating the character
  // deathRollX corresponding to their age next year - 3
  if (status === 'gains_pve_deaths') {
    await changeCharacterAndLog(
      interactionUser, character, {
      newPveDeaths: character.pveDeaths + deathsFromRoll,
      [`newDeathRoll${nextYear - character.yearOfMaturity - 3}`]: roll
    });

    // Add to summary tracking
    if (deathsFromRoll === 1) {
      lost1PveLife.push({ character, player });
    } else if (deathsFromRoll === 2) {
      lost2PveLives.push({ character, player });
    } else if (deathsFromRoll === 3) {
      lost3PveLives.push({ character, player });
    }

  } else if (status === 'dies') {
    // Update the character's deathRollX
    await changeCharacterAndLog(interactionUser, character, {
      [`newDeathRoll${nextYear - character.yearOfMaturity - 3}`]: roll
    });

    await DeathRollDeaths.create({
      characterId: character.id,
      dayOfDeath: dayOfDeath,
      monthOfDeath: monthOfDeath,
      yearOfDeath: yearOfDeath,
      playedById: player ? player.id : null
    });

    await postInLogChannel(
      'Character Scheduled for Death',
      '**Scheduled by: ' + userMention(interactionUser.id) + '** (during death rolls)\n\n' +
      'Name: `' + character.name + '`\n' +
      'Date of Death: `' + dayOfDeath + ' ' + monthOfDeath + ', \'' + yearOfDeath + '`\n' +
      (player ? 'Played by: ' + userMention(player.id) : 'Played by: None'),
      BLUE_COLOR
    );

    // Add to summary tracking
    diedCharacters.push({ character, player, dayOfDeath, monthOfDeath, yearOfDeath });
  }
  else if (status === 'unharmed') {
    // Just update the character's deathRollX
    await changeCharacterAndLog(interactionUser, character, {
      [`newDeathRoll${nextYear - character.yearOfMaturity - 3}`]: roll
    });
  }
}


module.exports = {
  REL_THRESHOLDS,
  BAST_THRESHOLDS,
  OFFSPRING_LABELS,
  determineOffspringResult,
  calculateOffspringRoll,
  formatOffspringCounts,
  getPlayerSnowflakeForCharacter,
  buildOffspringPairLine,
  calculateDeathRoll,
  rollDeathAndGetResult,
  saveDeathResultToDatabase
};