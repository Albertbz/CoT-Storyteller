const assert = require('assert');
const path = require('path');

// Load the module under test
const startrolls = require(path.resolve(__dirname, '../commands/utility/startrolls.js'));

// Extract helpers
const formatOffspringCounts = startrolls.formatOffspringCounts || startrolls.__test && startrolls.__test.formatOffspringCounts;
const buildOffspringPairLine = startrolls.buildOffspringPairLine || startrolls.__test && startrolls.__test.buildOffspringPairLine;

if (!formatOffspringCounts) {
  console.error('formatOffspringCounts not exported for testing.');
  process.exit(1);
}

if (!buildOffspringPairLine) {
  console.error('buildOffspringPairLine not exported for testing.');
  process.exit(1);
}

console.log('Running tests for startrolls helpers...');

// Test cases for formatOffspringCounts
const tests = [
  { input: ['Son'], expect: { amountOfSons: 1, amountOfDaughters: 0, text: 'Son' } },
  { input: ['Daughter'], expect: { amountOfSons: 0, amountOfDaughters: 1, text: 'Daughter' } },
  { input: ['Son', 'Son'], expect: { amountOfSons: 2, amountOfDaughters: 0, text: 'Twin Sons' } },
  { input: ['Daughter', 'Daughter'], expect: { amountOfSons: 0, amountOfDaughters: 2, text: 'Twin Daughters' } },
  { input: ['Son', 'Daughter'], expect: { amountOfSons: 1, amountOfDaughters: 1, text: 'Fraternal Twins' } },
  { input: ['Son', 'Son', 'Son'], expect: { amountOfSons: 3, amountOfDaughters: 0, text: 'Triplet Sons' } },
  { input: ['Daughter', 'Daughter', 'Daughter'], expect: { amountOfSons: 0, amountOfDaughters: 3, text: 'Triplet Daughters' } },
  { input: ['Son', 'Son', 'Daughter'], expect: { amountOfSons: 2, amountOfDaughters: 1, text: 'Triplets (2 Sons and 1 Daughter)' } },
  { input: ['Son', 'Son', 'Son', 'Son'], expect: { amountOfSons: 4, amountOfDaughters: 0, text: 'Quadruplet Sons' } },
  { input: ['Daughter', 'Daughter', 'Daughter', 'Daughter'], expect: { amountOfSons: 0, amountOfDaughters: 4, text: 'Quadruplet Daughters' } },
  { input: ['Son', 'Son', 'Daughter', 'Daughter'], expect: { amountOfSons: 2, amountOfDaughters: 2, text: 'Quadruplets (2 Sons and 2 Daughters)' } },
];

for (const t of tests) {
  const res = formatOffspringCounts(t.input);
  try {
    assert.strictEqual(res.amountOfSons, t.expect.amountOfSons, `amountOfSons mismatch for ${t.input}`);
    assert.strictEqual(res.amountOfDaughters, t.expect.amountOfDaughters, `amountOfDaughters mismatch for ${t.input}`);
    assert.strictEqual(res.text, t.expect.text, `text mismatch for ${t.input} (got: ${res.text})`);
    console.log('PASS formatOffspringCounts', t.input.join(','));
  } catch (err) {
    console.error('FAIL formatOffspringCounts', t.input.join(','), err.message);
    process.exit(1);
  }
}

// Test buildOffspringPairLine returns expected structure (we'll check it contains the friendly text)
const line = buildOffspringPairLine('Alice', 'Bob', ['Son', 'Son'], { fertilityCheck: 12, offspringCheck: 88 });
if (!line.includes('Twin Sons')) {
  console.error('FAIL buildOffspringPairLine did not include Twin Sons:', line);
  process.exit(1);
}
console.log('PASS buildOffspringPairLine twin test');

// Test special-case 100 -> triplets/quadruplets via calculateFromThresholds
const calculateFromThresholds = startrolls.__test.calculateFromThresholds;
if (!calculateFromThresholds) {
  console.error('calculateFromThresholds not exported for testing.');
  process.exit(1);
}

const special = calculateFromThresholds(0, 1, 2, 3, 4, 5, 100);
if (!Array.isArray(special) || !(special.length === 3 || special.length === 4)) {
  console.error('FAIL special-case 100 did not return 3 or 4 children:', special);
  process.exit(1);
}
for (const c of special) {
  if (c !== 'Son' && c !== 'Daughter') {
    console.error('FAIL special-case returned invalid child sex:', c);
    process.exit(1);
  }
}
console.log('PASS special-case 100 produces 3-4 children');

console.log('All tests passed!');
process.exit(0);
