/**
 * Vistaar Mandi Price Service — STUB
 *
 * Vistaar provides raw AgMarkNet mandi prices (free).
 * PULSE adds ML forecasting: 7/14/30-day predictions, sell/hold, loan alignment.
 *
 * Flow: Vistaar raw prices → this adapter → PULSE price engine
 *       → forecast + sell recommendation + loan repayment alignment
 */

const logger = require('../../../shared/utils/logger');
const vistaarConfig = require('../config/vistaarConfig');

/**
 * Fetches latest mandi prices from Vistaar/AgMarkNet.
 * STUB — returns null until Vistaar API is available.
 * Fallback: PULSE already has pulse_price_records populated via other sources.
 */
const fetchMandiPrices = async (commodityCode, stateId, districtId) => {
  if (!vistaarConfig.features.mandiPricesEnabled) {
    logger.debug('Vistaar mandi prices disabled — using PULSE internal data');
    return null;
  }

  // TODO: Implement when Vistaar opens API
  // Will feed into pulse_price_records table
  return null;
};

/**
 * Syncs Vistaar mandi prices into PULSE price records.
 * Scheduled job — runs every 4 hours when enabled.
 */
const syncMandiPricesToPulse = async () => {
  if (!vistaarConfig.features.mandiPricesEnabled) return { synced: 0 };

  // TODO: Fetch all commodity prices from Vistaar
  // Upsert into pulse_price_records
  // PULSE ML engine then runs forecast on top

  return { synced: 0, message: 'Vistaar API not yet available' };
};

module.exports = { fetchMandiPrices, syncMandiPricesToPulse };
