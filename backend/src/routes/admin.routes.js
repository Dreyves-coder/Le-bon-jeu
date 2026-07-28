const express = require('express');
const rateLimit = require('express-rate-limit');
const {
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
} = require('../controllers/admin.controller');
const authMiddleware = require('../middlewares/auth.middleware');

const router = express.Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => res.status(429).json({
    success: false,
    message: 'Trop de tentatives de connexion. Réessayez dans 15 minutes.',
  }),
});

router.post('/admin/login', loginLimiter, login);
router.post('/admin/logout', logout);
router.use('/admin', authMiddleware);
router.get('/admin/session', getSession);
router.put('/admin/password', changePassword);
router.put('/admin/email', changeEmail);
router.get('/admin/dashboard', getDashboard);
router.get('/admin/prizes', getPrizes);
router.post('/admin/prizes', createPrize);
router.put('/admin/prizes/:id', updatePrize);
router.get('/admin/participants', getParticipants);
router.get('/admin/draws', getDraws);
router.get('/admin/settings', getSettings);
router.put('/admin/settings', updateSettings);

module.exports = router;
