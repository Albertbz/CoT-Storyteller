const { Players, DeathRollDeaths, Characters, Worlds } = require('../dbObjects.js');
const { ageToFertilityModifier, changeCharacterInDatabase, postInLogChannel } = require('../misc.js');
const { inlineCode, bold, italic, userMention, EmbedBuilder, ContainerBuilder, TextDisplayBuilder, MessageFlags } = require('discord.js');
const { COLORS } = require('../misc.js');

const MAX_EMBED_DESCRIPTION_LENGTH = 3000;

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

  return { result: ['Failed Fertility Roll'], fertilityCheck, offspringCheck: undefined, fertilityModifier };
}

async function getFertilityModifier(yearOfMaturity1, yearOfMaturity2 = undefined) {
  const world = await Worlds.findOne({ where: { name: 'Elstrand' } });

  const age1 = world.currentYear - yearOfMaturity1;
  const age2 = yearOfMaturity2 === undefined ? 1 : world.currentYear - yearOfMaturity2;

  const fertilityModifier1 = ageToFertilityModifier(age1);
  const fertilityModifier2 = yearOfMaturity2 === undefined ? 1 : ageToFertilityModifier(age2);
  const combinedFertilityModifier = fertilityModifier1 * fertilityModifier2;

  // Return both individual and combined fertility modifiers
  return { fertilityModifier1, fertilityModifier2, combinedFertilityModifier };
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
  let color = COLORS.BLUE;
  if (status === 'unharmed') {
    resultDescription = inlineCode(character.name) + ' (' + age + ' years old) rolled ' + inlineCode(roll) + ' and did not lose any PvE lives.';
    color = COLORS.GREEN;
  } else if (status === 'gains_pve_deaths') {
    resultDescription = inlineCode(character.name) + ' (' + age + ' years old) rolled ' + inlineCode(roll) + ' and lost ' + inlineCode(deathsFromRoll) + ' PvE li' + (deathsFromRoll > 1 ? 'ves' : 'fe') + '.';
    color = COLORS.ORANGE;
  } else if (status === 'dies') {
    resultDescription = inlineCode(character.name) + ' (' + age + ' years old) rolled ' + inlineCode(roll) + ' and will die on ' + inlineCode(dayOfDeath + ' ' + monthOfDeath + ', \'' + yearOfDeath) + '.';
    color = COLORS.RED;
  }

  return { resultDescription, color, roll, deathsFromRoll, status, dayOfDeath, monthOfDeath, yearOfDeath };
}

async function saveDeathRollResultToDatabase(character, interactionUser, nextYear, roll, deathsFromRoll, status, dayOfDeath, monthOfDeath, yearOfDeath, diedCharacters, lost1PveLife, lost2PveLives, lost3PveLives, shouldPostInLogChannel) {
  // Get player that plays the character
  const player = await Players.findOne({ where: { characterId: character.id } });

  if (!player) {
    console.log(`No player found for character ${character.name} (ID: ${character.id}).`);
  }

  // Save the death roll result to the database by updating
  // the character's PvE deaths or adding them to the temporary 
  // DeathRollDeaths table, as well as updating the character
  // deathRollX corresponding to their age next year - 3
  let deathRollFieldNumber = nextYear - character.yearOfMaturity - 3;
  if (deathRollFieldNumber > 5) deathRollFieldNumber = 5;
  const deathRollField = `newDeathRoll${deathRollFieldNumber}`;
  const toUpdate = {};
  toUpdate[deathRollField] = roll;

  if (status === 'gains_pve_deaths') {
    toUpdate['newPveDeaths'] = character.pveDeaths + deathsFromRoll;

    // Add to summary tracking
    if (deathsFromRoll === 1) {
      lost1PveLife.push({ character, player });
    } else if (deathsFromRoll === 2) {
      lost2PveLives.push({ character, player });
    } else if (deathsFromRoll === 3) {
      lost3PveLives.push({ character, player });
    }

  }
  else if (status === 'dies') {
    await DeathRollDeaths.create({
      characterId: character.id,
      dayOfDeath: dayOfDeath,
      monthOfDeath: monthOfDeath,
      yearOfDeath: yearOfDeath,
      playedById: player ? player.id : null
    });

    if (shouldPostInLogChannel) {
      await postInLogChannel(
        'Character Scheduled for Death',
        '**Scheduled by: ' + userMention(interactionUser.id) + '**\n\n' +
        'Name: `' + character.name + '`\n' +
        'Date of Death: `' + dayOfDeath + ' ' + monthOfDeath + ', \'' + yearOfDeath + '`\n' +
        (player ? 'Played by: ' + userMention(player.id) : 'Played by: None'),
        COLORS.BLUE
      );
    }
    // Add to summary tracking
    diedCharacters.push({ character, player, dayOfDeath, monthOfDeath, yearOfDeath });
  }

  try {
    await changeCharacterInDatabase(interactionUser, character, shouldPostInLogChannel, toUpdate);
  }
  catch (error) {
    console.error(`Error updating character ${character.name} (ID: ${character.id}):`, error);
  }
  return;
}

function makeDeathRollsSummaryMessages(linesList, messageTitle, containerColor) {
  // Whenever a message is too long, split it into multiple messages
  // A message is too long if it exceeds 4000 characters
  let currentMessageLength = messageTitle.length + 1; // +1 for the newline after the title
  const currentMessageLines = [];
  const messages = [];

  for (const line of linesList) {
    if (currentMessageLength + line.length + 1 > 4000) { // +1 for the newline
      // Create a message with the current message lines and start a new one
      const container = new ContainerBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder()
            .setContent(
              `# ${messageTitle}\n` +
              currentMessageLines.join('\n')
            )
        )
        .setAccentColor(containerColor);

      const message = { components: [container], flags: MessageFlags.IsComponentsV2 }

      messages.push(message);
      currentMessageLines.length = 0; // Clear the current message lines
      currentMessageLines.push(line);
      currentMessageLength = messageTitle.length + 1 + line.length + 1; // +1 for the newline
    } else {
      currentMessageLines.push(line);
      currentMessageLength += line.length + 1; // +1 for the newline
    }
  }

  // Add the last message if there's any remaining content
  if (currentMessageLines.length > 0) {
    const container = new ContainerBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder()
          .setContent(
            `# ${messageTitle}\n` +
            currentMessageLines.join('\n')
          )
      )
      .setAccentColor(containerColor);

    const message = { components: [container], flags: MessageFlags.IsComponentsV2 }

    messages.push(message);
  }

  return messages;
}

// Build an embed that shows the roll chance thresholds for relationships and bastards
function buildChanceDescription(thresholds, labels) {
  let desc = '';
  let prev = 1;
  for (let i = 0; i < thresholds.length; i++) {
    const t = thresholds[i];
    const label = labels[i];
    if (t === 100) {
      const end = t - 1;
      if (prev < end) desc += `**${label}:** ${prev}-${end}\n`;
      else if (prev === end) desc += `**${label}:** ${prev}\n`;
      desc += `**Triplets+ (3-6 children):** 100\n`;
    } else {
      const end = t - 1;
      if (prev < end) desc += `**${label}:** ${prev}-${end}\n`;
      else if (prev === end) desc += `**${label}:** ${prev}\n`;
      prev = t;
    }
  }
  return desc;
}

function buildOffspringChanceEmbed() {
  const rollChancesDescription = '**Intercharacter Rolls**\n' + buildChanceDescription(REL_THRESHOLDS, OFFSPRING_LABELS) + '\n**NPC Rolls**\n' + buildChanceDescription(BAST_THRESHOLDS, OFFSPRING_LABELS);

  const rollChancesEmbed = new EmbedBuilder()
    .setTitle('Offspring roll chances')
    .setDescription(rollChancesDescription)
    .setColor(COLORS.BLUE);
  return rollChancesEmbed;
}


module.exports = {
  REL_THRESHOLDS,
  BAST_THRESHOLDS,
  OFFSPRING_LABELS,
  randomInteger,
  determineOffspringResult,
  calculateOffspringRoll,
  formatOffspringCounts,
  getPlayerSnowflakeForCharacter,
  buildOffspringPairLine,
  calculateDeathRoll,
  rollDeathAndGetResult,
  saveDeathRollResultToDatabase,
  makeDeathRollsSummaryMessages,
  buildOffspringChanceEmbed,
  getFertilityModifier
};