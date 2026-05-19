/**
 * AgriStack Routes — authenticated wrappers around the AgriStack integration.
 * Persona phase: currently only land-lookup. More endpoints (crop data,
 * village ROR, scheme eligibility) land here as the persona flows need them.
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../../../middleware/auth');
const landLookupController = require('../controllers/landLookupController');

router.use(authenticate);

router.post('/land-lookup', landLookupController.landLookup);

module.exports = router;
