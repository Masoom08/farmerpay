/**
 * Jest Configuration — INTEGRATION TESTS ONLY.
 *
 * Requires MySQL + Redis running and reachable via the DB_* / REDIS_URL
 * env vars. Run with:
 *
 *     npm run test:integration
 *
 * See docs/testing/integration-tests.md for local setup (docker compose
 * snippet, migration + seed steps, env var cheatsheet).
 *
 * These tests are excluded from the default `npm test` run because CI's
 * default Test Backend matrix doesn't reliably provide the DB — see the
 * comment in jest.config.js.
 */

module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/tests/integration'],
  testMatch: ['**/*.test.js'],
  setupFilesAfterSetup: ['<rootDir>/tests/helpers/setup.js'],
  globalSetup: '<rootDir>/tests/helpers/globalSetup.js',
  globalTeardown: '<rootDir>/tests/helpers/globalTeardown.js',
  testTimeout: 60000,
  verbose: true,
  forceExit: true,
  detectOpenHandles: true,
  // Coverage intentionally disabled here — the default config already
  // measures coverage over the unit suite; layering integration coverage
  // on top would require a merge step we don't yet have.
  collectCoverage: false,
};
