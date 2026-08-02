const test = require('node:test');
const assert = require('node:assert/strict');
const { participationSchema } = require('../src/validators/participation.validator');

const validParticipation = {
  name: 'Marie Martin',
  phone: '06 12 34 56 78',
  gameConsent: true,
  marketingConsent: false,
};

test('accepts valid French local and international phone numbers', () => {
  assert.equal(participationSchema.safeParse(validParticipation).success, true);
  assert.equal(participationSchema.safeParse({ ...validParticipation, phone: '+33 6 12 34 56 78' }).success, true);
});

test('rejects participation without accepted game consent', () => {
  assert.equal(participationSchema.safeParse({ ...validParticipation, gameConsent: false }).success, false);
});

test('rejects malformed phone numbers', () => {
  assert.equal(participationSchema.safeParse({ ...validParticipation, phone: 'abcdefghij' }).success, false);
  assert.equal(participationSchema.safeParse({ ...validParticipation, phone: '06123' }).success, false);
});
