require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const healthRoutes = require('./routes/health.routes');
const publicRoutes = require('./routes/public.routes');
const adminRoutes = require('./routes/admin.routes');
const errorHandler = require('./middlewares/errorHandler');
const { ensureDefaultAdmin } = require('./services/admin.service');

const app = express();
const port = Number(process.env.PORT || 4000);
const allowedOrigins = String(process.env.CORS_ORIGINS || process.env.CORS_ORIGIN || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

function isPrivateDevelopmentOrigin(origin) {
  if (process.env.NODE_ENV !== 'development') return false;
  try {
    const url = new URL(origin);
    const hostname = url.hostname;
    const privateAddress = hostname === 'localhost'
      || hostname === '127.0.0.1'
      || /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname)
      || /^192\.168\.\d{1,3}\.\d{1,3}$/.test(hostname)
      || /^172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}$/.test(hostname);
    const port = Number(url.port);
    const developmentPort = port === 4173 || (port >= 5173 && port <= 5199);
    return url.protocol === 'http:' && developmentPort && privateAddress;
  } catch {
    return false;
  }
}

if (process.env.TRUST_PROXY === 'true') app.set('trust proxy', 1);

app.disable('x-powered-by');
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'same-site' },
}));
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin) || isPrivateDevelopmentOrigin(origin)) {
      return callback(null, true);
    }
    const error = new Error('Origine non autorisée.');
    error.statusCode = 403;
    return callback(error);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json({ limit: '50kb' }));
app.use(rateLimit({
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS || 900000),
  max: Number(process.env.RATE_LIMIT_MAX_REQUESTS || 100),
  skip: (req) => req.method === 'GET',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => res.status(429).json({
    success: false,
    message: 'Trop de tentatives. Patientez quelques instants avant de réessayer.',
  }),
}));

app.use('/api', healthRoutes);
app.use('/api', publicRoutes);
app.use('/api', adminRoutes);

app.get('/', (_req, res) => {
  res.json({ message: 'Mahana API' });
});

app.use(errorHandler);

async function startServer() {
  await ensureDefaultAdmin();
  app.listen(port, '0.0.0.0', () => {
    console.log(`Backend Mahana disponible sur http://localhost:${port}`);
  });
}

if (require.main === module) {
  startServer().catch((error) => {
    console.error(`Démarrage refusé : ${error.message}`);
    process.exitCode = 1;
  });
}

module.exports = app;
