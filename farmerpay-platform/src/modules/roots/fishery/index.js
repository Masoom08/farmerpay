/**
 * ROOTS Fishery Module
 * Combines v1 legacy routes and v2 financial logbook routes (profile, ponds,
 * vessels, cost/revenue events, stocking/harvest, trips, treatment, recurring,
 * weekly summaries, hybrid P&L). v2 is mounted under /v2.
 */

const express = require('express');
const router = express.Router();

const fisheryRoutes = require('./routes/fisheryRoutes');
const fisheryV2Routes = require('./routes/fisheryV2Routes');

router.use('/v2', fisheryV2Routes);
router.use('/', fisheryRoutes);

module.exports = router;
