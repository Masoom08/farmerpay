/**
 * Feature Gate Middleware
 *
 * Returns 404 when the specified feature flag is off.
 * This makes the endpoint invisible (not just forbidden) so
 * frontends that check flags before calling never see an error,
 * and direct callers get a clean "not found" rather than a partial response.
 *
 * Must be placed BEFORE the route handler in the middleware chain.
 *
 * @example
 * router.get('/readiness/:uuid', featureGate('readiness.farmerBadge'), controller.get);
 */

const config = require('../config');

/**
 * Resolve a dot-path (e.g. 'readiness.farmerBadge') against config.features.
 * @param {string} flagPath - Dot-delimited path under config.features
 * @returns {boolean}
 */
const resolveFlag = (flagPath) => {
  const parts = flagPath.split('.');
  let node = config.features;
  for (const part of parts) {
    if (node == null || typeof node !== 'object') return false;
    node = node[part];
  }
  return !!node;
};

/**
 * Creates middleware that blocks the request when the flag is off.
 * @param {string} flagPath - Dot-path under config.features (e.g. 'readiness.bankerMatrix')
 * @returns {Function} Express middleware
 */
const featureGate = (flagPath) => {
  return (req, res, next) => {
    if (resolveFlag(flagPath)) return next();

    return res.status(404).json({
      success: false,
      message: 'Not found',
      errorCode: 'FEATURE_NOT_AVAILABLE',
    });
  };
};

module.exports = featureGate;
