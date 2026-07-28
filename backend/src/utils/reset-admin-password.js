require('dotenv').config();

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const { validatePassword } = require('../services/admin.service');

const prisma = new PrismaClient();

async function resetPassword() {
  const email = String(process.env.ADMIN_RESET_EMAIL || '').trim().toLowerCase();
  const password = validatePassword(process.env.ADMIN_RESET_PASSWORD);
  const admin = await prisma.adminUser.findUnique({ where: { email } });
  if (!admin) throw new Error(`Aucun administrateur trouvé pour ${email}.`);

  await prisma.adminUser.update({
    where: { id: admin.id },
    data: {
      passwordHash: await bcrypt.hash(password, 12),
      passwordChangedAt: new Date(),
      mustChangePassword: false,
      tokenVersion: { increment: 1 },
    },
  });
  console.log(`Mot de passe mis à jour pour ${email}.`);
}

resetPassword()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
