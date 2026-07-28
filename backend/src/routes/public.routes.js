const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { checkParticipation, draw } = require('../controllers/public.controller');
const devStorage = require('../services/dev-storage.service');

const router = express.Router();
const prisma = new PrismaClient();

router.get('/public/settings', async (_req, res, next) => {
  try {
    const settings = await prisma.gameSettings.findFirst();
    return res.json({ success: true, data: settings || { isGameActive: false } });
  } catch (error) {
    if (devStorage.isDevelopmentFallbackEnabled()) {
      return res.json({ success: true, data: devStorage.getSettings(), storage: 'development-memory' });
    }
    next(error);
  }
});

router.get('/public/prizes', async (_req, res, next) => {
  try {
    const prizes = await prisma.prize.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'asc' },
    });
    return res.json({ success: true, data: prizes });
  } catch (error) {
    if (devStorage.isDevelopmentFallbackEnabled()) {
      return res.json({ success: true, data: devStorage.getPrizes(), storage: 'development-memory' });
    }
    next(error);
  }
});

router.post('/public/check-participation', checkParticipation);
router.post('/public/draw', draw);

module.exports = router;
