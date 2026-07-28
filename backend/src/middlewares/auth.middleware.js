const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');
const { getJwtSecret } = require('../services/admin.service');

const prisma = new PrismaClient();

async function authMiddleware(req, res, next) {
  const header = req.headers.authorization || '';
  const cookies = Object.fromEntries(
    String(req.headers.cookie || '')
      .split(';')
      .map((item) => item.trim().split('='))
      .filter(([key, value]) => key && value)
      .map(([key, value]) => [key, decodeURIComponent(value)]),
  );
  const token = header.startsWith('Bearer ') ? header.slice(7) : cookies.mahana_admin_session;
  if (!token) {
    return res.status(401).json({ success: false, message: 'Authentification requise.' });
  }

  try {
    const payload = jwt.verify(token, getJwtSecret(), {
      issuer: 'mahana-api',
      audience: 'mahana-admin',
    });
    const admin = await prisma.adminUser.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, role: true, tokenVersion: true, mustChangePassword: true },
    });
    if (!admin || admin.tokenVersion !== payload.tokenVersion || admin.role !== 'admin') {
      return res.status(401).json({ success: false, message: 'Session expirée ou révoquée.' });
    }
    req.user = admin;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Session expirée ou invalide.' });
    }
    next(error);
  }
}

module.exports = authMiddleware;
