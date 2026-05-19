/**
 * Sequelize Database Configuration
 * Environment-based config for development, test, and production.
 * Features: Winston logging, retry logic, read replica support, utf8mb4 charset.
 */

const config = require('./index');
const logger = require('../shared/utils/logger');

/**
 * Sequelize-compatible logging function that routes SQL queries through Winston.
 * @param {string} msg - SQL query string from Sequelize
 */
const sequelizeLogger = (msg) => {
  logger.debug(`[SQL] ${msg}`);
};

/**
 * Shared model definition options applied to all environments.
 */
const sharedDefine = {
  timestamps: true,
  underscored: true,
  charset: 'utf8mb4',
  collate: 'utf8mb4_unicode_ci',
};

/**
 * Shared dialect options for utf8mb4 multi-language and emoji support.
 */
const sharedDialectOptions = {
  charset: 'utf8mb4',
  dateStrings: true,
  typeCast: true,
};

/**
 * Retry configuration for transient connection failures.
 * Sequelize will retry connection up to `max` times with `match` error patterns.
 */
const retryConfig = {
  max: 5,
  match: [
    /ETIMEDOUT/,
    /ECONNREFUSED/,
    /ECONNRESET/,
    /PROTOCOL_CONNECTION_LOST/,
    /ER_CON_COUNT_ERROR/,
    /ER_LOCK_DEADLOCK/,
    /ER_LOCK_WAIT_TIMEOUT/,
  ],
};

const dbConfig = {
  development: {
    username: config.db.user,
    password: config.db.password,
    database: config.db.name,
    host: config.db.host,
    port: config.db.port,
    dialect: config.db.dialect,
    logging: config.db.logging ? sequelizeLogger : false,
    pool: {
      max: parseInt(process.env.DB_POOL_MAX, 10) || 20,
      min: parseInt(process.env.DB_POOL_MIN, 10) || 5,
      acquire: 30000,
      idle: 10000,
    },
    define: sharedDefine,
    dialectOptions: sharedDialectOptions,
    timezone: '+05:30', // IST
    retry: retryConfig,
  },

  test: {
    username: config.db.user,
    password: config.db.password,
    database: `${config.db.name}_test`,
    host: config.db.host,
    port: config.db.port,
    dialect: config.db.dialect,
    logging: false,
    pool: {
      max: 10,
      min: 2,
      acquire: 30000,
      idle: 10000,
    },
    define: sharedDefine,
    dialectOptions: sharedDialectOptions,
    timezone: '+05:30',
    retry: retryConfig,
  },

  production: {
    username: config.db.user,
    password: config.db.password,
    database: config.db.name,
    host: config.db.host,
    port: config.db.port,
    dialect: config.db.dialect,
    logging: false,
    pool: {
      max: parseInt(process.env.DB_POOL_MAX, 10) || 20,
      min: parseInt(process.env.DB_POOL_MIN, 10) || 5,
      acquire: 30000,
      idle: 10000,
    },
    define: sharedDefine,
    dialectOptions: {
      ...sharedDialectOptions,
      ssl: {
        require: true,
        rejectUnauthorized: true,
      },
    },
    timezone: '+05:30',
    retry: retryConfig,

    // Read replica support — enable by setting DB_READ_HOST in production
    // Sequelize will route SELECT queries to the read replica automatically
    ...(process.env.DB_READ_HOST && {
      replication: {
        read: [
          {
            host: process.env.DB_READ_HOST,
            port: parseInt(process.env.DB_READ_PORT, 10) || config.db.port,
            username: process.env.DB_READ_USER || config.db.user,
            password: process.env.DB_READ_PASSWORD || config.db.password,
          },
        ],
        write: {
          host: config.db.host,
          port: config.db.port,
          username: config.db.user,
          password: config.db.password,
        },
      },
    }),
  },
};

module.exports = dbConfig;
