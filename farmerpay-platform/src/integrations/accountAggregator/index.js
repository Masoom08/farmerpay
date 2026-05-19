/**
 * Account Aggregator Integration — Public API
 * FarmerPay acts as FIU (Financial Information User).
 */

const { getProvider, listProviders } = require('./services/aaProviderFactory');
const aaConfig = require('./config/aaConfig');

module.exports = {
  getProvider,
  listProviders,
  aaConfig,
};
