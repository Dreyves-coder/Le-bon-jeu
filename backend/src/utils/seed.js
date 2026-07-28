require('dotenv').config();

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function seed() {
  await prisma.gameSettings.upsert({
    where: { id: 'default' },
    update: {},
    create: {
      id: 'default',
      gameName: 'Mahana Win',
      welcomeMessage: 'Tentez votre chance',
      loseMessage: 'Dommage, ce sera pour une prochaine fois.',
      participationPeriod: 'daily',
      isGameActive: false,
      returnDelaySeconds: 5,
      privacyPolicyUrl: '/politique-confidentialite',
      rulesUrl: '/reglement.html',
    },
  });

  const email = String(process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  const password = process.env.ADMIN_INITIAL_PASSWORD;
  const existingAdmin = email ? await prisma.adminUser.findUnique({ where: { email } }) : null;

  if (!existingAdmin) {
    if (!email || !password) {
      throw new Error('ADMIN_EMAIL et ADMIN_INITIAL_PASSWORD sont requis pour créer le premier administrateur.');
    }
    const passwordHash = await bcrypt.hash(password, 12);
    await prisma.adminUser.create({
      data: {
        name: 'Administrateur',
        email,
        passwordHash,
        mustChangePassword: false,
        passwordChangedAt: new Date(),
      },
    });
  }
}

seed()
  .then(() => console.log('Configuration initiale enregistrée.'))
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
