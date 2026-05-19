/**
 * ROOTS Crop Module — Knowledge base + execution tracking.
 */
const express = require('express');
const router = express.Router();

// Knowledge base routes (public)
router.use('/', require('./routes/cropRoutes'));

// Execution routes (authenticated)
router.use('/', require('./routes/executionRoutes'));

// Soil health card OCR routes (authenticated)
router.use('/', require('./routes/soilHealthRoutes'));

module.exports = router;
