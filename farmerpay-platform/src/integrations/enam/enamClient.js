/**
 * eNAM Client — PULSE Phase 3 (stub)
 *
 * eNAM (https://enam.gov.in) does NOT publish a public read API as of
 * 2026 — their dashboards are HTML-only and bilateral data sharing is
 * partner-only. This file is intentionally empty: it exists so the
 * pulseIngestionService can iterate `[agmarknetClient, enamClient, ...]`
 * uniformly. When a future Phase 3.5 lands a partner feed or a sanctioned
 * scraper, the implementation drops in here without any caller change.
 */

const logger = require('../../shared/utils/logger');

let warned = false;
const fetchPrices = async (_params) => {
  if (!warned) {
    logger.info('[enamClient] stub — eNAM has no public API. Returning [] for all calls.');
    warned = true;
  }
  return [];
};

module.exports = { fetchPrices };
