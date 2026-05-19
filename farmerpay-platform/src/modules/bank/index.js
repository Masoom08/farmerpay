/**
 * Bank Integration Module
 * Pathway 1: CSV import and manual data entry (pilot phase)
 * Pathway 2-3: Finacle webhook receiver and outbound push APIs
 */

const bankRoutes = require('./routes/bankRoutes');
const finacleRoutes = require('./routes/finacleRoutes');

module.exports = { bankRoutes, finacleRoutes };
