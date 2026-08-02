const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizePhone, pickPrize } = require('../src/utils/draw');

test('selects the prize matching the configured probability interval', () => {
  const prizes = [
    { name: 'Café offert', probability: 0.2, isActive: true, remainingStock: 10 },
    { name: 'Dessert offert', probability: 0.3, isActive: true, remainingStock: 10 },
  ];

  assert.equal(pickPrize(prizes, 0.1).name, 'Café offert');
  assert.equal(pickPrize(prizes, 0.35).name, 'Dessert offert');
});

test('rejects a total probability above 100 percent', () => {
  const prizes = [
    { probability: 0.7, isActive: true, remainingStock: 10 },
    { probability: 0.4, isActive: true, remainingStock: 10 },
  ];
  assert.throws(() => pickPrize(prizes, 0.2), /dépasse 100/);
});

test('ignores inactive or out-of-stock prizes', () => {
  const prizes = [
    { probability: 1, isActive: true, remainingStock: 0 },
    { probability: 1, isActive: false, remainingStock: 10 },
    { probability: 0, isActive: true, remainingStock: 10 },
  ];
  assert.equal(pickPrize(prizes, 0.5), null);
});

test('returns no prize in the remaining loss probability', () => {
  const prizes = [
    { probability: 0.2, isActive: true, remainingStock: 10 },
    { probability: 0.1, isActive: true, remainingStock: 10 },
  ];
  assert.equal(pickPrize(prizes, 0.9), null);
});

test('normalizes French local and international phone formats identically', () => {
  assert.equal(normalizePhone('06 12 34 56 78'), '0612345678');
  assert.equal(normalizePhone('+33 6 12 34 56 78'), '0612345678');
  assert.equal(normalizePhone('0033 6 12 34 56 78'), '0612345678');
});
