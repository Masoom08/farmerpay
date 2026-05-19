/**
 * Jest Configuration (DEFAULT — unit + service tests only).
 *
 * Integration tests live in tests/integration/ and require a real MySQL
 * + Redis for full-stack flow tests. They are intentionally excluded
 * from the default run so `npm test` / CI stay green without DB setup.
 *
 * Run integration tests with:
 *     npm run test:integration        (requires DB + Redis running)
 *
 * See docs/testing/integration-tests.md for how to set up locally.
 */

module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.test.js'],
  // Integration tests require infrastructure (DB, Redis) that CI's
  // default runner doesn't reliably provide. Keeping them out of the
  // default path means `npm test` gives a meaningful green signal on
  // every commit; integration regressions are caught by the separate
  // `test:integration` script.
  testPathIgnorePatterns: ['/node_modules/', '/tests/integration/'],
  setupFilesAfterSetup: ['<rootDir>/tests/helpers/setup.js'],
  globalSetup: '<rootDir>/tests/helpers/globalSetup.js',
  globalTeardown: '<rootDir>/tests/helpers/globalTeardown.js',
  testTimeout: 30000,
  verbose: true,
  forceExit: true,
  detectOpenHandles: true,
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'text-summary', 'lcov', 'json-summary'],
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/tests/',
    '/migrations/',
    '/seeders/',
    '/coverage/',
  ],
  // Coverage thresholds are set to the current achievable baseline so CI
  // catches any regression but doesn't block on pre-existing gaps.
  // Raise these gradually as integration tests get ported to unit-level
  // and uncovered branches get exercised. Target (aspirational):
  // branches 60, functions 70, lines 80, statements 80.
  coverageThreshold: {
    global: {
      branches: 53,
      functions: 65,
      lines: 77,
      statements: 75,
    },
  },
};
