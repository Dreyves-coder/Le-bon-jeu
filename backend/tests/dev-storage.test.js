const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const testFile = path.join(os.tmpdir(), `mahana-storage-${process.pid}.json`);
process.env.DEV_DATA_FILE = testFile;

const store = require('../src/services/dev-storage.service');

test.after(() => {
  if (fs.existsSync(testFile)) fs.rmSync(testFile);
});

test('persists a completed game, decrements stock and revokes client authorization', () => {
  const initialStock = store.getPrizes()[0].remainingStock;
  store.updateSettings({ isGameActive: true });

  const originalRandom = Math.random;
  Math.random = () => 0;
  const result = store.draw({
    name: 'Test isolé',
    phone: '06 00 00 00 99',
    gameConsent: true,
    marketingConsent: false,
  });
  Math.random = originalRandom;

  const dashboard = store.getDashboard();
  assert.equal(result.resultType, 'WIN');
  assert.equal(store.getPrizes()[0].remainingStock, initialStock - 1);
  assert.equal(store.getSettings().isGameActive, false);
  assert.equal(dashboard.participantsCount, 1);
  assert.equal(dashboard.drawsCount, 1);
  assert.equal(dashboard.winnersCount, 1);
  assert.equal(dashboard.activePrizesCount, 4);
});

test('creates and updates a prize in persistent development storage', () => {
  const prize = store.createPrize({
    name: 'Menu offert',
    description: 'Test du catalogue',
    probability: 0.05,
    initialStock: 4,
    isActive: true,
  });
  const updated = store.updatePrize(prize.id, { remainingStock: 9, isActive: false });

  assert.equal(updated.name, 'Menu offert');
  assert.equal(updated.remainingStock, 9);
  assert.equal(updated.initialStock, 9);
  assert.equal(updated.isActive, false);
  assert.ok(fs.existsSync(testFile));
});

test('warns on low stock and automatically disables a prize at zero', () => {
  const prize = store.getPrizes()[0];
  store.updatePrize(prize.id, { remainingStock: 1, isActive: true });

  const beforeDraw = store.getDashboard();
  assert.ok(beforeDraw.lowStockPrizes.some((item) => item.id === prize.id));

  store.updateSettings({ isGameActive: true });
  const originalRandom = Math.random;
  Math.random = () => 0;
  store.draw({
    name: 'Dernier lot',
    phone: '06 00 00 01 00',
    gameConsent: true,
    marketingConsent: false,
  });
  Math.random = originalRandom;

  const exhaustedPrize = store.getPrizes().find((item) => item.id === prize.id);
  const afterDraw = store.getDashboard();
  assert.equal(exhaustedPrize.remainingStock, 0);
  assert.equal(exhaustedPrize.isActive, false);
  assert.ok(afterDraw.outOfStockPrizes.some((item) => item.id === prize.id));
});
