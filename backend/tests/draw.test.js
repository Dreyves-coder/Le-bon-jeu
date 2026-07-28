const test = require('node:test');
const assert = require('node:assert/strict');
const { pickPrize } = require('../src/utils/draw');

test('selects a prize using configured probabilities', () => {
    const prizes = [
      { name: 'Rien gagné', probability: 60, isActive: true, remainingStock: 100 },
      { name: 'Café offert', probability: 20, isActive: true, remainingStock: 100 },
      { name: 'Dessert offert', probability: 20, isActive: true, remainingStock: 100 },
    ];

    const chosen = pickPrize(prizes, 0.1);
    assert.ok(chosen);
    assert.ok(['Rien gagné', 'Café offert', 'Dessert offert'].includes(chosen.name));
  });

test('ignores inactive or out-of-stock prizes', () => {
    const prizes = [
      { name: 'Rien gagné', probability: 100, isActive: true, remainingStock: 0 },
      { name: 'Café offert', probability: 0, isActive: false, remainingStock: 10 },
      { name: 'Dessert offert', probability: 0, isActive: true, remainingStock: 10 },
    ];

    const chosen = pickPrize(prizes, 0.5);
    assert.strictEqual(chosen, null);
});

test('returns no prize when the random value falls in the remaining loss probability', () => {
  const prizes = [
    { name: 'Café offert', probability: 0.2, isActive: true, remainingStock: 10 },
    { name: 'Dessert offert', probability: 0.1, isActive: true, remainingStock: 10 },
  ];

  assert.strictEqual(pickPrize(prizes, 0.9), null);
});
