const { PrismaClient } = require('@prisma/client');
const { normalizePhone, pickPrize } = require('../utils/draw');
const { participationSchema } = require('../validators/participation.validator');
const devStorage = require('../services/dev-storage.service');

const prisma = new PrismaClient();

function httpError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function validateParticipation(body, res) {
  const parsed = participationSchema.safeParse(body);
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      message: parsed.error.issues[0]?.message || 'Données invalides.',
    });
    return null;
  }
  if (devStorage.isDevelopmentFallbackEnabled() && !devStorage.getSettings().isGameActive) {
    res.status(403).json({ success: false, message: 'Aucune partie n’est autorisée pour le moment.' });
    return null;
  }
  return parsed.data;
}

function getDayBounds() {
  const today = new Date();
  return {
    startOfDay: new Date(today.getFullYear(), today.getMonth(), today.getDate()),
    endOfDay: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1),
  };
}

async function checkParticipation(req, res, next) {
  const data = validateParticipation(req.body, res);
  if (!data) return;

  try {
    if (!devStorage.isDevelopmentFallbackEnabled()) {
      const settings = await prisma.gameSettings.findFirst();
      if (!settings?.isGameActive) {
        return res.status(403).json({ success: false, message: 'Aucune partie n’est autorisée pour le moment.' });
      }
    }
    const normalizedPhone = normalizePhone(data.phone);
    const { startOfDay, endOfDay } = getDayBounds();
    const existing = await prisma.participant.findFirst({
      where: { normalizedPhone, createdAt: { gte: startOfDay, lt: endOfDay } },
    });
    return res.json({ success: true, canParticipate: !existing });
  } catch (error) {
    if (devStorage.isDevelopmentFallbackEnabled()) {
      return res.json({ success: true, canParticipate: devStorage.canParticipate(data.phone) });
    }
    next(error);
  }
}

async function draw(req, res, next) {
  const data = validateParticipation(req.body, res);
  if (!data) return;

  try {
    if (devStorage.isDevelopmentFallbackEnabled()) {
      const result = devStorage.draw(data);
      if (!result) {
        return res.status(409).json({ success: false, message: 'Cette partie n’est plus disponible ou ce client a déjà joué aujourd’hui.' });
      }
      return res.json({ success: true, data: result, storage: 'development-file' });
    }

    const normalizedPhone = normalizePhone(data.phone);
    const { startOfDay, endOfDay } = getDayBounds();
    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.participant.findFirst({
        where: { normalizedPhone, createdAt: { gte: startOfDay, lt: endOfDay } },
      });
      if (existing) throw httpError(409, 'Vous avez déjà participé aujourd’hui.');

      const authorization = await tx.gameSettings.updateMany({
        where: { isGameActive: true },
        data: { isGameActive: false },
      });
      if (authorization.count === 0) {
        throw httpError(403, 'Aucune partie n’est autorisée pour le moment.');
      }

      const prizes = await tx.prize.findMany({
        where: { isActive: true, remainingStock: { gt: 0 } },
        orderBy: { createdAt: 'asc' },
      });
      const selectedPrize = pickPrize(prizes, Math.random());
      const participant = await tx.participant.create({
        data: {
          name: data.name,
          phone: data.phone,
          normalizedPhone,
          gameConsent: data.gameConsent,
          marketingConsent: data.marketingConsent,
        },
      });
      const savedDraw = await tx.draw.create({
        data: {
          participantId: participant.id,
          prizeId: selectedPrize?.id || null,
          resultType: selectedPrize ? 'WIN' : 'LOSS',
        },
      });

      if (selectedPrize) {
        const updatedPrize = await tx.prize.update({
          where: { id: selectedPrize.id },
          data: { remainingStock: { decrement: 1 } },
        });
        if (updatedPrize.remainingStock <= 0) {
          await tx.prize.update({
            where: { id: selectedPrize.id },
            data: { remainingStock: 0, isActive: false },
          });
        }
      }

      return {
        participantId: participant.id,
        drawId: savedDraw.id,
        resultType: selectedPrize ? 'WIN' : 'LOSS',
        prize: selectedPrize ? { id: selectedPrize.id, name: selectedPrize.name } : null,
      };
    });

    return res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

module.exports = { checkParticipation, draw };
