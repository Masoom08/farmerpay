/**
 * FarmerPay Platform — Express Application Entry Point
 *
 * Sets up all middleware, routes, Swagger docs, and graceful shutdown.
 * Start with: node src/app.js
 */

require('dotenv').config();

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const morgan = require('morgan');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');

const config = require('./config');
const logger = require('./shared/utils/logger');
const requestId = require('./middleware/requestId');
const language = require('./middleware/language');
const { defaultLimiter } = require('./middleware/rateLimiter');
const errorHandler = require('./middleware/errorHandler');
const { testConnection } = require('./shared/models');
const { getRedisClient, closeRedisConnection } = require('./config/redis');
const { closeRabbitMQ } = require('./config/rabbitmq');

// ─── Startup secret checks ─────────────────────────────────────────
// Refuse to start in production without the secrets that protect money-moving
// webhooks and admin sessions. Dev is permissive; prod is strict.
if (config.env === 'production') {
  const requiredSecrets = ['FINACLE_WEBHOOK_SECRET', 'ADMIN_SESSION_SECRET'];
  const missing = requiredSecrets.filter((k) => !process.env[k]);
  if (missing.length) {
    logger.error(`Refusing to start: missing required secrets in production: ${missing.join(', ')}`);
    process.exit(1);
  }
}

const app = express();

// Trust first proxy (required for correct req.ip behind load balancer)
app.set('trust proxy', 1);

// ─── Security Headers ──────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: false,  // Disabled for development — enable with proper nonce-based CSP in production
  // Force HTTPS for a year on every subdomain. Banker dashboards and the
  // admin UI transmit session cookies; without HSTS a network attacker
  // can downgrade the connection and steal them. Preload list inclusion
  // is deliberate — farmerpay is a bank-tied platform, HTTP is never OK.
  hsts: { maxAge: 365 * 24 * 60 * 60, includeSubDomains: true, preload: true },
  frameguard: { action: 'deny' },
  noSniff: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
}));

// ─── CORS ──────────────────────────────────────────────────────────
app.use(
  cors({
    // Empty allow-list = deny all in production (default-deny); dev falls
    // back to `true` so local tooling still works. A blank env var should
    // not silently open the API to every origin in prod — that's how we
    // got credential-bearing CORS breaches in prior audits.
    // origin: config.cors.allowedOrigins.length > 0
    //   ? config.cors.allowedOrigins.map(s => s.trim()).filter(Boolean)
    //   : (config.env === 'production' ? false : true),
    origin: [
      "http://localhost:8082",
      "http://localhost:8081",
      "http://localhost:19006"
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    // x-aadhaar-token is the Tier-2 step-up header that apiDicePost sends
    // for DICE financial endpoints. Without this in the allowed list the
    // browser CORS layer blocks every Tier-2 POST with net::ERR_FAILED
    // even though the OPTIONS preflight returns 204.
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID', 'X-Language', 'x-aadhaar-token'],
  })
);

app.options("*", cors());

// ─── Body Parsing ──────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ─── Compression ───────────────────────────────────────────────────
app.use(compression());

// ─── Static Files (Banker Dashboard) ───────────────────────────────
const path = require('path');
app.use(express.static(path.join(__dirname, '../public')));

// ─── Admin UI: EJS view engine + session ───────────────────────────
// Bank-ops admin pages live at /admin (May 2026 pilot). Server-rendered
// EJS via express-session cookies. Separate from the JSON API auth flow
// used by the farmer-app — these are workforce accounts, not farmers.
const session = require('express-session');
const cookieParser = require('cookie-parser');
app.set('view engine', 'ejs');
app.set('views', [
  path.join(__dirname, 'modules/admin/views'),
]);
app.use(cookieParser());
app.use(
  session({
    name: 'fp_admin_sid',
    secret: process.env.ADMIN_SESSION_SECRET || 'change-me-in-production-pilot-only',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 1000 * 60 * 60 * 12, // 12-hour bank-ops shift
      sameSite: 'lax',
    },
  })
);

// ─── Request ID ────────────────────────────────────────────────────
app.use(requestId);

// ─── Language Detection ────────────────────────────────────────────
app.use(language);

// ─── HTTP Request Logging ──────────────────────────────────────────
const morganFormat = config.env === 'production' ? 'combined' : 'dev';
app.use(
  morgan(morganFormat, {
    stream: { write: (msg) => logger.info(msg.trim()) },
    skip: (req) => req.url === '/health',
  })
);

// ─── Rate Limiting ─────────────────────────────────────────────────
app.use(`${config.apiPrefix}/`, defaultLimiter);

// ─── Swagger / OpenAPI 3.0 Docs ────────────────────────────────────
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'FarmerPay Platform API',
      version: '1.0.0',
      description: 'Agrarian fintech platform for India — REST API documentation',
      contact: {
        name: 'FarmerPay Team',
        email: 'dev@farmerpay.in',
      },
    },
    servers: [
      { url: `http://localhost:${config.port}${config.apiPrefix}`, description: 'Local' },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    security: [{ bearerAuth: [] }],
  },
  apis: ['./src/modules/**/routes/*.js', './src/modules/**/*.routes.js'],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, { explorer: true }));

// ─── Health Check ──────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'FarmerPay API is running',
    data: {
      service: config.appName,
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    },
  });
});

// ─── API Routes ────────────────────────────────────────────────────
app.use(`${config.apiPrefix}/auth`, require('./modules/auth'));
const { farmerRoutes, agentRoutes } = require('./modules/farmer');
app.use(`${config.apiPrefix}/farmer`, farmerRoutes);
const { popRoutes } = require('./modules/pop');
app.use(`${config.apiPrefix}/farmer/pop`, popRoutes);
app.use(`${config.apiPrefix}/agent`, agentRoutes);
app.use(`${config.apiPrefix}/location`, require('./modules/location'));
const { trustRoutes, adminTrustRoutes, sathiTaskRoutes } = require('./modules/trust');
app.use(`${config.apiPrefix}/trust`, trustRoutes);
app.use(`${config.apiPrefix}/admin/trust`, adminTrustRoutes);
app.use(`${config.apiPrefix}/sathi/trust-tasks`, sathiTaskRoutes);
app.use(`${config.apiPrefix}/dice`, require('./modules/dice'));
app.use(`${config.apiPrefix}/insurance`, require('./modules/insurance'));
app.use(`${config.apiPrefix}/roots`, require('./modules/roots/crop'));
app.use(`${config.apiPrefix}/roots/dairy`, require('./modules/roots/dairy'));
app.use(`${config.apiPrefix}/roots/fishery`, require('./modules/roots/fishery'));
app.use(`${config.apiPrefix}/roots/horticulture`, require('./modules/roots/horticulture'));
app.use(`${config.apiPrefix}/roots/poultry`, require('./modules/roots/poultry'));
app.use(`${config.apiPrefix}/roots/goatery`, require('./modules/roots/goatery'));
app.use(`${config.apiPrefix}/sage`, require('./modules/sage'));
app.use(`${config.apiPrefix}/pulse`, require('./modules/pulse'));
app.use(`${config.apiPrefix}/banker`, require('./modules/banker'));
const { bankRoutes, finacleRoutes } = require('./modules/bank');
app.use(`${config.apiPrefix}/bank`, bankRoutes);
app.use(`${config.apiPrefix}/bank`, finacleRoutes);
const { sentinelRoutes, portfolioRoutes, recoveryRoutes } = require('./modules/sentinel');
app.use(`${config.apiPrefix}/sentinel`, sentinelRoutes);
app.use(`${config.apiPrefix}/sentinel`, portfolioRoutes);
app.use(`${config.apiPrefix}/sentinel`, recoveryRoutes);
app.use(`${config.apiPrefix}/compliance`, require('./modules/compliance'));
app.use(`${config.apiPrefix}/choice`, require('./modules/choice'));
app.use(`${config.apiPrefix}/sathi`, require('./modules/choice').sathiRoutes);
app.use(`${config.apiPrefix}/agristack`, require('./modules/agristack'));
app.use(`${config.apiPrefix}/drishti`, require('./modules/drishti'));
const { aaRoutes, aaWebhookRoutes } = require('./modules/aa');
app.use(`${config.apiPrefix}/aa`, aaRoutes);
app.use(`${config.apiPrefix}/aa`, aaWebhookRoutes);  // Webhook routes — no auth middleware
const { readinessRoutes } = require('./modules/readiness');
app.use(`${config.apiPrefix}/readiness`, readinessRoutes);

// ─── Admin UI (EJS, NOT under /api/v1) ─────────────────────────────
// Bank-ops admin pages for the May 2026 pilot. Mounted at /admin so it's
// reachable via the browser without the API prefix.
app.use('/admin', require('./modules/admin/routes/adminRoutes'));
const { vendorRoutes, transactionRoutes, ecosystemRoutes, farmerVendorRoutes } = require('./modules/vyapar');
app.use(`${config.apiPrefix}/vyapar`, vendorRoutes);
app.use(`${config.apiPrefix}/vyapar`, transactionRoutes);
app.use(`${config.apiPrefix}/vyapar`, ecosystemRoutes);
app.use(`${config.apiPrefix}/vyapar/farmer`, farmerVendorRoutes);
// ... additional modules mounted here as developed

// ─── 404 Handler ───────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.originalUrl} not found`,
    errorCode: 'RES_001',
  });
});

// ─── Global Error Handler (must be last) ───────────────────────────
app.use(errorHandler);

// ─── Start Server ──────────────────────────────────────────────────
const startServer = async () => {
  try {
    // Validate critical secrets before starting
    if (config.env === 'production') {
      if (!process.env.JWT_ACCESS_SECRET || process.env.JWT_ACCESS_SECRET === 'change-me-access-secret') {
        throw new Error('FATAL: JWT_ACCESS_SECRET is not configured or has default value');
      }
      if (!process.env.JWT_REFRESH_SECRET || process.env.JWT_REFRESH_SECRET === 'change-me-refresh-secret') {
        throw new Error('FATAL: JWT_REFRESH_SECRET is not configured or has default value');
      }
    }

    // Test database connection
    await testConnection();

    // Initialize Redis (warm up connection)
    getRedisClient();

    const server = app.listen(config.port, () => {
      logger.info(`FarmerPay API running on port ${config.port} [${config.env}]`);
      logger.info(`Swagger docs: http://localhost:${config.port}/api-docs`);
      logger.info(`Health check: http://localhost:${config.port}/health`);
    });

    // Start scheduled jobs (after DB + server ready)
    try {
      require('./jobs/dairyRecurringJob').start();
    } catch (jobErr) {
      logger.error(`Failed to start dairyRecurringJob: ${jobErr.message}`);
    }
    try {
      require('./jobs/fisheryRecurringJob').start();
    } catch (jobErr) {
      logger.error(`Failed to start fisheryRecurringJob: ${jobErr.message}`);
    }
    try {
      require('./jobs/cropAdvisoryJob').start();
    } catch (jobErr) {
      logger.error(`Failed to start cropAdvisoryJob: ${jobErr.message}`);
    }
    try {
      require('./jobs/imdWeatherFetchJob').start();
    } catch (jobErr) {
      logger.error(`Failed to start imdWeatherFetchJob: ${jobErr.message}`);
    }
    try {
      require('./jobs/bankNpaRecalcJob').start();
    } catch (jobErr) {
      logger.error(`Failed to start bankNpaRecalcJob: ${jobErr.message}`);
    }
    // PULSE Phase 3 — daily mandi price ingest + forecast regen
    try {
      require('./jobs/pulseDailyIngestJob').start();
    } catch (jobErr) {
      logger.error(`Failed to start pulseDailyIngestJob: ${jobErr.message}`);
    }
    // PULSE Phase 3 — daily SENTINEL market_risk scan
    try {
      require('./jobs/pulseSentinelScanJob').start();
    } catch (jobErr) {
      logger.error(`Failed to start pulseSentinelScanJob: ${jobErr.message}`);
    }
    // AA V2 — daily transaction purge (24-month retention)
    try {
      require('./jobs/aaDataPurgeJob').start();
    } catch (jobErr) {
      logger.error(`Failed to start aaDataPurgeJob: ${jobErr.message}`);
    }
    // AA V2 — daily consent expiry check
    try {
      require('./jobs/aaConsentExpiryJob').start();
    } catch (jobErr) {
      logger.error(`Failed to start aaConsentExpiryJob: ${jobErr.message}`);
    }

    // ROOTS — daily missed step detector + red flag engine
    try {
      require('./jobs/rootsMissedStepDetectorJob').start();
    } catch (jobErr) {
      logger.error(`Failed to start rootsMissedStepDetectorJob: ${jobErr.message}`);
    }
    // ROOTS — daily smart stage notifications (8 AM IST)
    try {
      require('./jobs/rootsStageNotificationJob').start();
    } catch (jobErr) {
      logger.error(`Failed to start rootsStageNotificationJob: ${jobErr.message}`);
    }

    // ─── Graceful Shutdown ───────────────────────────────────────────
    const shutdown = async (signal) => {
      logger.info(`${signal} received — shutting down gracefully...`);

      server.close(async () => {
        logger.info('HTTP server closed');

        try {
          await closeRedisConnection();
          await closeRabbitMQ();
          const { sequelize } = require('./shared/models');
          await sequelize.close();
          logger.info('All connections closed');
        } catch (err) {
          logger.error('Error during shutdown:', err.message);
        }

        process.exit(0);
      });

      // Force exit after 10 seconds
      setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    // Catch unhandled rejections and exceptions
    process.on('unhandledRejection', (reason) => {
      logger.error('Unhandled Rejection:', reason);
    });

    process.on('uncaughtException', (err) => {
      logger.error('Uncaught Exception:', err);
      process.exit(1);
    });
  } catch (err) {
    logger.error('Failed to start server:', err.message);
    process.exit(1);
  }
};

// Only boot the server when this file is the process entry point. Tests
// that do `require('../../src/app')` (e.g. supertest(app)) previously
// triggered startServer(), which attempted a DB connection and called
// process.exit(1) in CI where no DB exists — killing Jest mid-suite and
// hiding every real test failure behind a single generic crash.
if (require.main === module) {
  startServer();
}

module.exports = app;
