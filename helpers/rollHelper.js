const { Players } = require('../dbObjects.js');
const { ageToFertilityModifier } = require('../misc.js');
const { inlineCode, bold, italic } = require('discord.js');

// Returns a random integer between 1 and max (inclusive)
function randomInteger(max) {
  return Math.floor(Math.random() * max + 1);
}

// Centralized thresholds for offspring rolls
const REL_THRESHOLDS = [41, 66, 91, 94, 97, 100];
const BAST_THRESHOLDS = [61, 79, 97, 98, 99, 100];
const OFFSPRING_LABELS = ['Childless', 'Son', 'Daughter', 'Twin Daughters', 'Twin Sons', 'Fraternal Twins'];

function calculateFromThresholds(childless, son, daughter, twinDaughters, twinSons, twinFraternal, offspringCheck) {
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

function calculateRoll({ age1, age2 = 0, isBastardRoll = false } = {}) {
  const fertilityModifier = ageToFertilityModifier(age1) * ageToFertilityModifier(age2) * 100;
  const fertilityCheck = randomInteger(100);

  if (fertilityCheck > 100 - fertilityModifier) {
    const offspringCheck = randomInteger(100);
    if (isBastardRoll) {
      const result = calculateFromThresholds(...BAST_THRESHOLDS, offspringCheck);
      return { result, fertilityCheck, offspringCheck, fertilityModifier };
    } else {
      const result = calculateFromThresholds(...REL_THRESHOLDS, offspringCheck);
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


module.exports = {
  REL_THRESHOLDS,
  BAST_THRESHOLDS,
  OFFSPRING_LABELS,
  calculateFromThresholds,
  calculateRoll,
  formatOffspringCounts,
  getPlayerSnowflakeForCharacter,
  buildOffspringPairLine
};