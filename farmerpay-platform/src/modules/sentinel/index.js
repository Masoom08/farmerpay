/**
 * SENTINEL Module
 * Exports sentinel, portfolio, and recovery routers for mounting in app.js.
 */

const sentinelRoutes = require('./routes/sentinelRoutes');
const portfolioRoutes = require('./routes/portfolioRoutes');
const recoveryRoutes = require('./routes/recoveryRoutes');

module.exports = { sentinelRoutes, portfolioRoutes, recoveryRoutes };
