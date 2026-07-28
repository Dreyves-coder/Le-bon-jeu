const test = require('node:test');
const assert = require('node:assert/strict');
const { validatePassword, getJwtSecret, normalizeAndValidateEmail } = require('../src/services/admin.service');

test('rejects weak administrator passwords', () => {
  assert.throws(() => validatePassword('admin123'));
  assert.throws(() => validatePassword('motdepassebeaucoupplustropfaible'));
});

test('accepts a strong administrator password', () => {
  assert.equal(validatePassword('Mahana!2026Secure'), 'Mahana!2026Secure');
});

test('rejects an insecure JWT secret', () => {
  const previousSecret = process.env.JWT_SECRET;
  process.env.JWT_SECRET = 'change-me-in-production';
  assert.throws(() => getJwtSecret());
  process.env.JWT_SECRET = previousSecret;
});

test('accepts only normalized .fr or .com administrator emails', () => {
  assert.equal(normalizeAndValidateEmail(' Admin@Mahana.FR '), 'admin@mahana.fr');
  assert.equal(normalizeAndValidateEmail('direction@mahana.com'), 'direction@mahana.com');
  assert.throws(() => normalizeAndValidateEmail('admin@mahana.local'));
  assert.throws(() => normalizeAndValidateEmail('adresse-invalide'));
});
