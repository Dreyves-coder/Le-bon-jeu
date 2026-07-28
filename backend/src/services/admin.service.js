const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const prisma = new PrismaClient();
const dummyHash = '$2b$12$KIXQ4YVQ8YaDFYzE7LrF.O1l0T1RkL1Qgx7W0y2QO4vJz7HkS9y6C';

function httpError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function validatePassword(password) {
  const value = String(password || '');
  const valid = value.length >= 12
    && /[A-Z]/.test(value)
    && /[a-z]/.test(value)
    && /\d/.test(value)
    && /[^A-Za-z0-9]/.test(value);
  if (!valid) {
    throw httpError(400, 'Le mot de passe doit contenir au moins 12 caractères, une majuscule, une minuscule, un chiffre et un symbole.');
  }
  return value;
}

function normalizeAndValidateEmail(email) {
  const value = String(email || '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.(fr|com)$/i.test(value)) {
    throw httpError(400, 'Saisissez une adresse email valide se terminant par .fr ou .com.');
  }
  return value;
}

function getJwtSecret() {
  const secret = process.env.JWT_SECRET || '';
  if (secret.length < 32 || secret === 'change-me-in-production') {
    throw new Error('JWT_SECRET doit contenir au moins 32 caractères aléatoires.');
  }
  return secret;
}

async function ensureDefaultAdmin() {
  getJwtSecret();
  const adminCount = await prisma.adminUser.count();
  if (adminCount === 0) {
    throw new Error('Aucun administrateur configuré. Exécutez npm.cmd run setup.');
  }
}

async function loginAdmin(email, password) {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  const admin = await prisma.adminUser.findUnique({ where: { email: normalizedEmail } });
  const valid = await bcrypt.compare(String(password || ''), admin?.passwordHash || dummyHash);
  if (!admin || !valid) {
    throw httpError(401, 'Identifiants invalides.');
  }

  await prisma.adminUser.update({
    where: { id: admin.id },
    data: { lastLoginAt: new Date() },
  });

  const token = jwt.sign(
    { sub: admin.id, email: admin.email, role: admin.role, tokenVersion: admin.tokenVersion },
    getJwtSecret(),
    {
      expiresIn: process.env.JWT_EXPIRES_IN || '2h',
      issuer: 'mahana-api',
      audience: 'mahana-admin',
    },
  );

  return {
    token,
    admin: {
      id: admin.id,
      name: admin.name,
      email: admin.email,
      role: admin.role,
      mustChangePassword: admin.mustChangePassword,
    },
  };
}

async function changeAdminPassword(adminId, currentPassword, newPassword) {
  const admin = await prisma.adminUser.findUnique({ where: { id: adminId } });
  if (!admin || !(await bcrypt.compare(String(currentPassword || ''), admin.passwordHash))) {
    throw httpError(401, 'Le mot de passe actuel est incorrect.');
  }

  const validatedPassword = validatePassword(newPassword);
  if (await bcrypt.compare(validatedPassword, admin.passwordHash)) {
    throw httpError(400, 'Le nouveau mot de passe doit être différent de l’ancien.');
  }

  const passwordHash = await bcrypt.hash(validatedPassword, 12);
  await prisma.adminUser.update({
    where: { id: admin.id },
    data: {
      passwordHash,
      passwordChangedAt: new Date(),
      mustChangePassword: false,
      tokenVersion: { increment: 1 },
    },
  });
}

async function changeAdminEmail(adminId, currentPassword, newEmail) {
  const admin = await prisma.adminUser.findUnique({ where: { id: adminId } });
  if (!admin || !(await bcrypt.compare(String(currentPassword || ''), admin.passwordHash))) {
    throw httpError(401, 'Le mot de passe actuel est incorrect.');
  }

  const email = normalizeAndValidateEmail(newEmail);
  if (email === admin.email) {
    throw httpError(400, 'Cette adresse est déjà utilisée par votre compte.');
  }
  const existing = await prisma.adminUser.findUnique({ where: { email } });
  if (existing) {
    throw httpError(409, 'Cette adresse est déjà utilisée par un autre compte.');
  }

  await prisma.adminUser.update({
    where: { id: admin.id },
    data: {
      email,
      tokenVersion: { increment: 1 },
    },
  });
  return email;
}

module.exports = {
  ensureDefaultAdmin,
  loginAdmin,
  changeAdminPassword,
  changeAdminEmail,
  validatePassword,
  normalizeAndValidateEmail,
  getJwtSecret,
};
