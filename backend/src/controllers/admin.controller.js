const { PrismaClient } = require('@prisma/client');
const { loginAdmin, changeAdminPassword, changeAdminEmail } = require('../services/admin.service');
const devStorage = require('../services/dev-storage.service');

const prisma = new PrismaClient();

function sessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: Number(process.env.ADMIN_SESSION_MAX_AGE_MS || 7200000),
    path: '/api/admin',
  };
}

function clearSessionCookie(res) {
  const { maxAge: _maxAge, ...options } = sessionCookieOptions();
  res.clearCookie('mahana_admin_session', options);
}

async function login(req, res, next) {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Email et mot de passe requis.' });
  }
  try {
    const result = await loginAdmin(email, password);
    res.cookie('mahana_admin_session', result.token, sessionCookieOptions());
    return res.json({ success: true, data: { admin: result.admin } });
  } catch (error) {
    next(error);
  }
}

function logout(_req, res) {
  clearSessionCookie(res);
  return res.json({ success: true });
}

function getSession(req, res) {
  return res.json({ success: true, data: { admin: req.user } });
}

async function changePassword(req, res, next) {
  try {
    await changeAdminPassword(req.user.id, req.body?.currentPassword, req.body?.newPassword);
    clearSessionCookie(res);
    return res.json({ success: true, message: 'Mot de passe modifié. Reconnectez-vous avec votre nouveau mot de passe.' });
  } catch (error) {
    next(error);
  }
}

async function changeEmail(req, res, next) {
  try {
    const email = await changeAdminEmail(req.user.id, req.body?.currentPassword, req.body?.newEmail);
    clearSessionCookie(res);
    return res.json({
      success: true,
      data: { email },
      message: 'Adresse de connexion modifiée. Reconnectez-vous avec la nouvelle adresse.',
    });
  } catch (error) {
    next(error);
  }
}

async function getDashboard(_req, res, next) {
  try {
    const availablePrizeFilter = { deletedAt: null };
    const [participantsCount, drawsCount, winnersCount, activePrizesCount, stock, recentDraws, allPrizes] = await Promise.all([
      prisma.participant.count(),
      prisma.draw.count(),
      prisma.draw.count({ where: { resultType: 'WIN' } }),
      prisma.prize.count({ where: { ...availablePrizeFilter, isActive: true, remainingStock: { gt: 0 } } }),
      prisma.prize.aggregate({ where: availablePrizeFilter, _sum: { remainingStock: true } }),
      prisma.draw.findMany({
        take: 6,
        orderBy: { createdAt: 'desc' },
        include: { participant: true, prize: true },
      }),
      prisma.prize.findMany({ where: availablePrizeFilter }),
    ]);
    const lowStockPrizes = allPrizes.filter((prize) => {
      const threshold = Math.max(2, Math.ceil(prize.initialStock * 0.2));
      return prize.isActive && prize.remainingStock > 0 && prize.remainingStock <= threshold;
    }).map((prize) => ({
      id: prize.id,
      name: prize.name,
      remainingStock: prize.remainingStock,
      threshold: Math.max(2, Math.ceil(prize.initialStock * 0.2)),
    }));
    const outOfStockPrizes = allPrizes
      .filter((prize) => prize.remainingStock === 0)
      .map((prize) => ({ id: prize.id, name: prize.name }));
    return res.json({
      success: true,
      data: {
        participantsCount,
        drawsCount,
        winnersCount,
        activePrizesCount,
        remainingStock: stock._sum.remainingStock || 0,
        winRate: drawsCount ? Math.round((winnersCount / drawsCount) * 1000) / 10 : 0,
        recentDraws,
        lowStockPrizes,
        outOfStockPrizes,
      },
    });
  } catch (error) {
    if (devStorage.isDevelopmentFallbackEnabled()) {
      return res.json({ success: true, data: devStorage.getDashboard(), storage: 'development-local' });
    }
    next(error);
  }
}

async function getPrizes(_req, res, next) {
  try {
    const prizes = await prisma.prize.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'asc' },
    });
    return res.json({ success: true, data: prizes });
  } catch (error) {
    if (devStorage.isDevelopmentFallbackEnabled()) return res.json({ success: true, data: devStorage.getPrizes() });
    next(error);
  }
}

async function createPrize(req, res, next) {
  if (!String(req.body?.name || '').trim()) {
    return res.status(400).json({ success: false, message: 'Le nom du lot est obligatoire.' });
  }
  if (devStorage.isDevelopmentFallbackEnabled()) {
    const probability = Number(req.body.probability) || 0;
    const currentTotal = devStorage.getPrizes()
      .filter((prize) => prize.isActive && prize.remainingStock > 0)
      .reduce((sum, prize) => sum + Number(prize.probability), 0);
    if (req.body.isActive !== false && Number(req.body.initialStock) > 0 && currentTotal + probability > 1.000001) {
      return res.status(400).json({ success: false, message: 'La probabilité totale des lots ne peut pas dépasser 100 %.' });
    }
  }
  try {
    const data = {
      ...req.body,
      isActive: Number(req.body.initialStock) > 0 && req.body.isActive !== false,
    };
    return res.status(201).json({ success: true, data: await prisma.prize.create({ data }) });
  } catch (error) {
    if (devStorage.isDevelopmentFallbackEnabled()) {
      return res.status(201).json({ success: true, data: devStorage.createPrize(req.body), storage: 'development-local' });
    }
    next(error);
  }
}

async function archivePrize(id, res) {
  const prize = await prisma.prize.findFirst({ where: { id, deletedAt: null } });
  if (!prize) {
    return res.status(404).json({ success: false, message: 'Lot introuvable.' });
  }

  await prisma.prize.update({
    where: { id },
    data: {
      deletedAt: new Date(),
      isActive: false,
      probability: 0,
      remainingStock: 0,
    },
  });
  return res.json({ success: true, message: 'Lot supprimé du catalogue.' });
}

async function updatePrize(req, res, next) {
  if (req.body?._delete === true) {
    if (devStorage.isDevelopmentFallbackEnabled()) {
      return res.status(503).json({
        success: false,
        message: 'La suppression nécessite une connexion à PostgreSQL.',
      });
    }
    try {
      return await archivePrize(req.params.id, res);
    } catch (error) {
      return next(error);
    }
  }

  if (devStorage.isDevelopmentFallbackEnabled()) {
    const prizes = devStorage.getPrizes();
    const current = prizes.find((prize) => prize.id === req.params.id);
    if (current) {
      const updated = { ...current, ...req.body };
      const total = prizes.reduce((sum, prize) => {
        const candidate = prize.id === current.id ? updated : prize;
        return candidate.isActive && Number(candidate.remainingStock) > 0
          ? sum + Number(candidate.probability)
          : sum;
      }, 0);
      if (total > 1.000001) {
        return res.status(400).json({ success: false, message: 'La probabilité totale des lots ne peut pas dépasser 100 %.' });
      }
    }
  }
  try {
    const data = { ...req.body };
    if (data.remainingStock !== undefined && Number(data.remainingStock) <= 0) {
      data.remainingStock = 0;
      data.isActive = false;
    }
    return res.json({
      success: true,
      data: await prisma.prize.update({ where: { id: req.params.id, deletedAt: null }, data }),
    });
  } catch (error) {
    if (devStorage.isDevelopmentFallbackEnabled()) {
      const prize = devStorage.updatePrize(req.params.id, req.body);
      if (!prize) return res.status(404).json({ success: false, message: 'Lot introuvable.' });
      return res.json({ success: true, data: prize, storage: 'development-local' });
    }
    next(error);
  }
}

async function getParticipants(_req, res, next) {
  try {
    const data = await prisma.participant.findMany({ orderBy: { createdAt: 'desc' }, include: { draws: true } });
    return res.json({ success: true, data });
  } catch (error) {
    if (devStorage.isDevelopmentFallbackEnabled()) {
      return res.json({ success: true, data: devStorage.getParticipants(), storage: 'development-local' });
    }
    next(error);
  }
}

async function getDraws(_req, res, next) {
  try {
    const data = await prisma.draw.findMany({ orderBy: { createdAt: 'desc' }, include: { participant: true, prize: true } });
    return res.json({ success: true, data });
  } catch (error) {
    if (devStorage.isDevelopmentFallbackEnabled()) {
      return res.json({ success: true, data: devStorage.getDraws(), storage: 'development-local' });
    }
    next(error);
  }
}

async function getSettings(_req, res, next) {
  try {
    const settings = await prisma.gameSettings.findFirst();
    return res.json({ success: true, data: settings || { isGameActive: false } });
  } catch (error) {
    if (devStorage.isDevelopmentFallbackEnabled()) {
      return res.json({ success: true, data: devStorage.getSettings(), storage: 'development-memory' });
    }
    next(error);
  }
}

async function updateSettings(req, res, next) {
  try {
    const id = req.body.id || 'default';
    const settings = await prisma.gameSettings.upsert({
      where: { id },
      update: req.body,
      create: { id, ...req.body },
    });
    return res.json({ success: true, data: settings });
  } catch (error) {
    if (devStorage.isDevelopmentFallbackEnabled()) {
      return res.json({
        success: true,
        data: devStorage.updateSettings(req.body || {}),
        storage: 'development-memory',
      });
    }
    next(error);
  }
}

module.exports = {
  login,
  logout,
  getSession,
  getDashboard,
  getPrizes,
  createPrize,
  updatePrize,
  getParticipants,
  getDraws,
  getSettings,
  updateSettings,
  changePassword,
  changeEmail,
};
