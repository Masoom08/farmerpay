/**
 * ROOTS Goatery Module — Herd management, individual animal tracking,
 * breeding lifecycle, health, feed, cost, revenue, analytics.
 */
const express = require('express');
const router = express.Router();

router.use('/', require('./routes/goateryRoutes'));

module.exports = router;
