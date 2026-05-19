/**
 * AA Module — Account Aggregator Financial Intelligence
 * Exports authenticated routes and webhook router (no auth) for mounting in app.js.
 */

const aaRoutes = require('./routes/aaRoutes');
const { webhookRouter: aaWebhookRoutes } = require('./routes/aaRoutes');

module.exports = { aaRoutes, aaWebhookRoutes };
