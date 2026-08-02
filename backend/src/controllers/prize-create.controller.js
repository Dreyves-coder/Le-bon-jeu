const { PrismaClient } = require('@prisma/client');
const devStorage = require('../services/dev-storage.service');

const prisma = new PrismaClient();

function validationError(res, message) {
  return res.status(400).json({ success: false, message });
}

async function createPrize(req, res, next) {
  const name = String(req.body?.name || '').trim();
  const description = String(req.body?.description || '').trim();
  const probability = Number(req.body?.probability);
  const initialStock = Number(req.body?.initialStock);
  const requestedActive = req.body?.isActive !== false;

  if (!name) return validationError(res, 'Le nom du lot est obligatoire.');
  if (!Number.isFinite(probability) || probability < 0 || probability > 1) {
    return validationError(res, 'La probabilité doit être comprise entre 0 et 100 %.');
  }
  if (!Number.isInteger(initialStock) || initialStock < 0) {
    return validationError(res, 'Le stock initial doit être un nombre entier positif ou nul.');
  }

  const isActive = requestedActive && initialStock > 0;

  if (devStorage.isDevelopmentFallbackEnabled()) {
    const currentTotal = devStorage.getPrizes()
      .filter((prize) => prize.isActive && prize.remainingStock > 0)
      .reduce((sum, prize) => sum + Number(prize.probability), 0);
    if (isActive && currentTotal + probability > 1.000001) {
      return validationError(res, 'La probabilité totale des lots ne peut pas dépasser 100 %.');
    }
    return res.status(201).json({
      success: true,
      data: devStorage.createPrize({
        name,
        description,
        probability,
        initialStock,
        isActive,
      }),
      storage: 'development-local',
    });
  }

  try {
    if (isActive) {
      const totals = await prisma.prize.aggregate({
        where: { deletedAt: null, isActive: true, remainingStock: { gt: 0 } },
        _sum: { probability: true },
      });
      if (Number(totals._sum.probability || 0) + probability > 1.000001) {
        return validationError(res, 'La probabilité totale des lots ne peut pas dépasser 100 %.');
      }
    }

    const prize = await prisma.prize.create({
      data: {
        name,
        description: description || null,
        probability,
        initialStock,
        remainingStock: initialStock,
        isActive,
      },
    });
    return res.status(201).json({ success: true, data: prize });
  } catch (error) {
    return next(error);
  }
}

module.exports = { createPrize };
