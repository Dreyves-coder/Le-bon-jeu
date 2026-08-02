const { PrismaClient } = require('@prisma/client');
const devStorage = require('../services/dev-storage.service');

const prisma = new PrismaClient();

function httpError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function normalizeChanges(body, current) {
  const data = {};

  if (body.name !== undefined) {
    const name = String(body.name).trim();
    if (!name || name.length > 120) throw httpError(400, 'Le nom du lot est invalide.');
    data.name = name;
  }
  if (body.description !== undefined) {
    const description = String(body.description || '').trim();
    if (description.length > 500) throw httpError(400, 'La description est trop longue.');
    data.description = description || null;
  }
  if (body.probability !== undefined) {
    const probability = Number(body.probability);
    if (!Number.isFinite(probability) || probability < 0 || probability > 1) {
      throw httpError(400, 'La probabilité doit être comprise entre 0 et 100 %.');
    }
    data.probability = probability;
  }
  if (body.remainingStock !== undefined) {
    const remainingStock = Number(body.remainingStock);
    if (!Number.isInteger(remainingStock) || remainingStock < 0) {
      throw httpError(400, 'Le stock doit être un nombre entier positif ou nul.');
    }
    data.remainingStock = remainingStock;
    if (remainingStock > current.initialStock) data.initialStock = remainingStock;
  }
  if (body.isActive !== undefined) {
    if (typeof body.isActive !== 'boolean') throw httpError(400, 'Le statut du lot est invalide.');
    data.isActive = body.isActive;
  }

  const nextStock = data.remainingStock ?? current.remainingStock;
  if (nextStock === 0) data.isActive = false;
  if (data.isActive === true && nextStock === 0) data.isActive = false;
  return data;
}

async function archivePrize(id, res) {
  const prize = await prisma.prize.findFirst({ where: { id, deletedAt: null } });
  if (!prize) return res.status(404).json({ success: false, message: 'Lot introuvable.' });

  await prisma.prize.update({
    where: { id },
    data: { deletedAt: new Date(), isActive: false, probability: 0, remainingStock: 0 },
  });
  return res.json({ success: true, message: 'Lot supprimé du catalogue.' });
}

async function updateDevelopmentPrize(id, body, res) {
  const prizes = devStorage.getPrizes();
  const current = prizes.find((prize) => prize.id === id);
  if (!current) return res.status(404).json({ success: false, message: 'Lot introuvable.' });

  const changes = normalizeChanges(body, current);
  const candidate = { ...current, ...changes };
  const total = prizes.reduce((sum, prize) => {
    const item = prize.id === id ? candidate : prize;
    return item.isActive && item.remainingStock > 0 ? sum + Number(item.probability) : sum;
  }, 0);
  if (total > 1.000001) throw httpError(400, 'La probabilité totale des lots ne peut pas dépasser 100 %.');

  const prize = devStorage.updatePrize(id, changes);
  return res.json({ success: true, data: prize, storage: 'development-local' });
}

async function updatePrize(req, res, next) {
  try {
    if (req.body?._delete === true) {
      if (devStorage.isDevelopmentFallbackEnabled()) {
        return res.status(503).json({ success: false, message: 'La suppression nécessite PostgreSQL.' });
      }
      return await archivePrize(req.params.id, res);
    }

    if (devStorage.isDevelopmentFallbackEnabled()) {
      return await updateDevelopmentPrize(req.params.id, req.body || {}, res);
    }

    const prize = await prisma.$transaction(async (tx) => {
      const current = await tx.prize.findFirst({ where: { id: req.params.id, deletedAt: null } });
      if (!current) throw httpError(404, 'Lot introuvable.');

      const changes = normalizeChanges(req.body || {}, current);
      const candidate = { ...current, ...changes };
      if (candidate.isActive && candidate.remainingStock > 0) {
        const totals = await tx.prize.aggregate({
          where: {
            deletedAt: null,
            isActive: true,
            remainingStock: { gt: 0 },
            id: { not: current.id },
          },
          _sum: { probability: true },
        });
        if (Number(totals._sum.probability || 0) + candidate.probability > 1.000001) {
          throw httpError(400, 'La probabilité totale des lots ne peut pas dépasser 100 %.');
        }
      }

      return tx.prize.update({ where: { id: current.id }, data: changes });
    }, { isolationLevel: 'Serializable' });

    return res.json({ success: true, data: prize });
  } catch (error) {
    return next(error);
  }
}

module.exports = { updatePrize, normalizeChanges };
