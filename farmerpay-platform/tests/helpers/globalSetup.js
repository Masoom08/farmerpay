/**
 * Global Setup
 * Runs once before all test suites. Sets test environment variables.
 */

module.exports = async () => {
  process.env.NODE_ENV = 'test';
  process.env.PORT = '0'; // Random port
  process.env.JWT_SECRET = 'test-jwt-secret-key-farmerpay-2025';
  process.env.JWT_REFRESH_SECRET = 'test-jwt-refresh-secret-key-farmerpay-2025';
  process.env.ENCRYPTION_KEY = 'test-encryption-key-32-bytes-ok!';
  process.env.DB_NAME = process.env.DB_NAME_TEST || 'farmerpay_test';
  process.env.DB_LOGGING = 'false';
  process.env.REDIS_DB = '1'; // Use separate Redis DB for tests
};
