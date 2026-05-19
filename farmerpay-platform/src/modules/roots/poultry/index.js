/**
 * ROOTS Poultry Module — Flock management, daily logs, health, cost, revenue, analytics.
 */
const express = require('express');
const router = express.Router();

router.use('/', require('./routes/poultryRoutes'));

module.exports = router;
