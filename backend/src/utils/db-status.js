require('dotenv').config();

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function status() {
  const [adminUsers, prizes, participants, draws] = await Promise.all([
    prisma.adminUser.findMany({ select: { email: true, lastLoginAt: true } }),
    prisma.prize.count(),
    prisma.participant.count(),
    prisma.draw.count(),
  ]);
  console.log(JSON.stringify({
    database: 'connected',
    admins: adminUsers.length,
    adminEmails: adminUsers.map((admin) => admin.email),
    prizes,
    participants,
    draws,
  }, null, 2));
}

status()
  .catch((error) => {
    console.error(`Connexion PostgreSQL impossible : ${error.message}`);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
