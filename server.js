const express = require('express');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');
const helmet = require('helmet');
const mongoose = require('mongoose');
const rateLimit = require('express-rate-limit');

dotenv.config();

const validateEnv = require('./backend/config/validateEnv');
const connectDB = require('./backend/config/db');
const { notFound, errorHandler } = require('./backend/middleware/errorHandler');

// Refuse to boot with a missing or placeholder JWT secret / database URI.
// Tests supply their own in-memory database, so they are exempt.
if (process.env.NODE_ENV !== 'test') {
  validateEnv();
  connectDB();
}

const app = express();

// Number of proxies in front of the app. Getting this wrong makes the rate
// limiter key on the proxy's IP instead of the client's — set it to match your
// actual deployment (1 for a single load balancer / Nginx / Heroku router).
app.set('trust proxy', Number(process.env.TRUST_PROXY_HOPS || 1));

const PORT = process.env.PORT || 3000;

// --- Security headers -------------------------------------------------------
// CSP was previously disabled with a "enable in prod" comment that was never
// actioned. With JWTs in browser storage, an injected script could exfiltrate
// every session token, so this matters.
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      // React writes inline style attributes, which CSP treats as inline styles.
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      fontSrc: ["'self'", 'data:'],
      connectSrc: ["'self'"],
      objectSrc: ["'none'"],
      frameAncestors: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null,
    },
  },
  crossOriginEmbedderPolicy: false,
  hsts: process.env.NODE_ENV === 'production'
    ? { maxAge: 31536000, includeSubDomains: true, preload: true }
    : false,
}));

// --- CORS -------------------------------------------------------------------
// Origins are env-driven so localhost is not permitted in production.
const defaultOrigins = ['https://generatingpro.com', 'https://www.generatingpro.com'];
const allowedOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',').map((o) => o.trim()).filter(Boolean)
  : (process.env.NODE_ENV === 'production'
      ? defaultOrigins
      : [...defaultOrigins, 'http://localhost:3000', 'http://localhost:5173']);

app.use(cors({
  origin(origin, callback) {
    // Same-origin requests and server-to-server calls have no Origin header.
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));

// Cap body size — the default 100kb is fine, but be explicit about it.
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));

// --- Rate limiting ----------------------------------------------------------
// A single global bucket allowed roughly 9,600 password guesses per IP per day
// while also throttling legitimate dashboard polling. Split into tiers instead.
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { msg: 'Too many requests. Please slow down and try again shortly.' },
});
app.use('/api', apiLimiter);

// --- Health check -----------------------------------------------------------
// Reports the real database state so a load balancer can pull an instance that
// has lost its connection.
app.get('/api/health', (req, res) => {
  const dbUp = mongoose.connection.readyState === 1;
  res.status(dbUp ? 200 : 503).json({
    status: dbUp ? 'ok' : 'degraded',
    database: dbUp ? 'connected' : 'disconnected',
    uptime: Math.floor(process.uptime()),
  });
});

// --- API routes -------------------------------------------------------------
const authRoutes = require('./backend/routes/auth');
const transactionRoutes = require('./backend/routes/transactions');
const adminRoutes = require('./backend/routes/admin');
const settingsRoutes = require('./backend/routes/settings');
const stakesRoutes = require('./backend/routes/stakes');
const kycRoutes = require('./backend/routes/kyc');
const startStakingCron = require('./backend/cron/stakingProcessor');
const seedStakingPlans = require('./backend/seedPlans');

app.use('/api/auth', authRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/stakes', stakesRoutes);
app.use('/api/kyc', kycRoutes);

// NOTE: there is deliberately no `app.use('/uploads', express.static(...))`.
// That mount served every KYC document — passports, IDs, proof of address — to
// anyone who could guess or obtain a URL, with no authentication whatsoever.
// Documents are now available only via GET /api/admin/kyc/:userId/document,
// which is admin-only and audited.

// Unmatched API routes get JSON, not the SPA shell.
app.use('/api', notFound);

// --- Static frontend --------------------------------------------------------
app.use(express.static(path.join(__dirname, 'client/dist'), {
  maxAge: process.env.NODE_ENV === 'production' ? '1y' : 0,
  // index.html must never be cached or clients pin to a stale bundle.
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('index.html')) {
      res.setHeader('Cache-Control', 'no-cache');
    }
  },
}));

// SPA fallback for client-side routing.
app.get(/^(?!\/api).+/, (req, res) => {
  res.sendFile(path.join(__dirname, 'client/dist/index.html'));
});

// Error handler must be registered last.
app.use(errorHandler);

// --- Startup ----------------------------------------------------------------
if (process.env.NODE_ENV !== 'test') {
  // Background jobs are opt-out so that a multi-instance deployment can run
  // the cron on exactly one instance. Running it on two double-credits every
  // maturing stake. See backend/cron/stakingProcessor.js.
  if (process.env.RUN_CRON !== 'false') {
    startStakingCron();
  } else {
    console.log('Staking cron disabled on this instance (RUN_CRON=false)');
  }

  seedStakingPlans();

  const server = app.listen(PORT, () => {
    console.log(`Server running on port ${PORT} [${process.env.NODE_ENV || 'development'}]`);
  });

  // Graceful shutdown so in-flight requests finish before the process dies.
  const shutdown = (signal) => {
    console.log(`${signal} received, shutting down gracefully...`);
    server.close(() => {
      mongoose.connection.close(false).finally(() => process.exit(0));
    });
    // Don't hang forever on a stuck connection.
    setTimeout(() => process.exit(1), 10000).unref();
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  process.on('unhandledRejection', (reason) => {
    console.error('UNHANDLED REJECTION', reason);
  });
}

module.exports = app;
