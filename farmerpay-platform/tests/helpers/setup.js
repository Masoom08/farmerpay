/**
 * Test Setup
 * Creates app instance, database connection, and cleanup utilities.
 */

const request = require('supertest');

let app;
let db;

/**
 * Initializes the Express app and database connection for testing.
 * Call once in beforeAll() of each test suite.
 */
const initApp = async () => {
  process.env.NODE_ENV = 'test';
  process.env.PORT = '0';
  process.env.DB_LOGGING = 'false';

  // Require app after env vars are set
  app = require('../../src/app');
  db = require('../../src/shared/models');

  await db.testConnection();
  return { app, db };
};

/**
 * Creates a supertest agent bound to the app.
 */
const getAgent = () => {
  if (!app) throw new Error('Call initApp() first');
  return request(app);
};

/**
 * Truncates specified tables in order (respects FK constraints).
 * @param {string[]} tableNames - Table names to truncate
 */
const truncateTables = async (tableNames) => {
  if (!db) throw new Error('Call initApp() first');

  await db.sequelize.query('SET FOREIGN_KEY_CHECKS = 0');
  for (const table of tableNames) {
    await db.sequelize.query(`TRUNCATE TABLE \`${table}\``);
  }
  await db.sequelize.query('SET FOREIGN_KEY_CHECKS = 1');
};

/**
 * Closes database and Redis connections. Call in afterAll().
 */
const closeConnections = async () => {
  if (db && db.sequelize) {
    await db.sequelize.close();
  }
  try {
    const { closeRedisConnection } = require('../../src/config/redis');
    await closeRedisConnection();
  } catch (_) {
    // Redis may not be available in test
  }
};

module.exports = {
  initApp,
  getAgent,
  truncateTables,
  closeConnections,
};
