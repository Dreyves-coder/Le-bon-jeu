const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeChanges } = require('../src/controllers/prize-update.controller');

const currentPrize = {
  id: 'prize-1',
  name: 'Café offert',
  probability: 0.2,
  initialStock: 10,
  remainingStock: 4,
  isActive: true,
};

test('rejects invalid prize probabilities and stocks', () => {
  assert.throws(() => normalizeChanges({ probability: 1.1 }, currentPrize), /comprise entre 0 et 100/);
  assert.throws(() => normalizeChanges({ remainingStock: -1 }, currentPrize), /nombre entier/);
  assert.throws(() => normalizeChanges({ remainingStock: 2.5 }, currentPrize), /nombre entier/);
});

test('updates the reference stock when replenishing above the initial stock', () => {
  assert.deepEqual(normalizeChanges({ remainingStock: 15 }, currentPrize), {
    remainingStock: 15,
    initialStock: 15,
  });
});

test('automatically disables a prize whose stock reaches zero', () => {
  assert.deepEqual(normalizeChanges({ remainingStock: 0, isActive: true }, currentPrize), {
    remainingStock: 0,
    isActive: false,
  });
});

test('ignores fields that administrators are not allowed to update', () => {
  assert.deepEqual(normalizeChanges({ id: 'changed', deletedAt: null, initialStock: 999 }, currentPrize), {});
});
