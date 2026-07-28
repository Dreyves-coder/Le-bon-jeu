require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const sourceFile = path.resolve(__dirname, '../../data/dev-store.json');
const markerFile = path.resolve(__dirname, '../../data/dev-store.imported');

async function importStore() {
  if (!fs.existsSync(sourceFile)) {
    console.log('Aucune donnée locale à importer.');
    return;
  }
  if (fs.existsSync(markerFile)) {
    console.log('Les données locales ont déjà été importées.');
    return;
  }

  const source = JSON.parse(fs.readFileSync(sourceFile, 'utf8'));
  await prisma.$transaction(async (tx) => {
    for (const prize of source.prizes || []) {
      await tx.prize.upsert({
        where: { id: prize.id },
        update: {},
        create: {
          id: prize.id,
          name: prize.name,
          description: prize.description || null,
          probability: Number(prize.probability),
          initialStock: Number(prize.initialStock),
          remainingStock: Number(prize.remainingStock),
          isActive: Boolean(prize.isActive) && Number(prize.remainingStock) > 0,
          createdAt: new Date(prize.createdAt || Date.now()),
        },
      });
    }

    for (const participant of source.participants || []) {
      await tx.participant.upsert({
        where: { id: participant.id },
        update: {},
        create: {
          id: participant.id,
          name: participant.name,
          phone: participant.phone,
          normalizedPhone: participant.normalizedPhone,
          gameConsent: Boolean(participant.gameConsent),
          marketingConsent: Boolean(participant.marketingConsent),
          createdAt: new Date(participant.createdAt || Date.now()),
        },
      });
    }

    for (const draw of source.draws || []) {
      await tx.draw.upsert({
        where: { id: draw.id },
        update: {},
        create: {
          id: draw.id,
          participantId: draw.participantId,
          prizeId: draw.prizeId || null,
          resultType: draw.resultType === 'WIN' ? 'WIN' : 'LOSS',
          createdAt: new Date(draw.createdAt || Date.now()),
        },
      });
    }

    await tx.gameSettings.upsert({
      where: { id: 'default' },
      update: { ...source.settings, id: undefined, isGameActive: false },
      create: { id: 'default', ...source.settings, isGameActive: false },
    });
  });

  fs.writeFileSync(markerFile, `Import terminé le ${new Date().toISOString()}\n`, 'utf8');
  console.log(`${source.prizes?.length || 0} lots, ${source.participants?.length || 0} participants et ${source.draws?.length || 0} tirages importés.`);
}

importStore()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
