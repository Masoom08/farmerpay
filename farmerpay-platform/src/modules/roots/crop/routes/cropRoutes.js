/**
 * Crop Routes — Public endpoints for ROOTS crop knowledge base.
 * @swagger
 * tags:
 *   name: ROOTS Crops
 *   description: Crop knowledge base — varieties, practices, inputs
 */
const express = require('express');
const router = express.Router();
const cropController = require('../controllers/cropController');

// All routes are public — no authentication required
router.get('/crops', cropController.getCrops);
router.get('/crops/:cropId/varieties', cropController.getVarieties);
// Phase 1 alias used by the farmer-app variety dropdown: GET /roots/varieties?cropId=...
router.get('/varieties', (req, res, next) => {
  req.params = { ...(req.params || {}), cropId: req.query.cropId };
  return cropController.getVarieties(req, res, next);
});
router.get('/varieties/:varietyId/suitability', cropController.getVarietySuitability);
router.get('/varieties/:varietyId/traits', cropController.getVarietyTraits);
router.get('/pop/search', cropController.searchPractices);
router.get('/pop/:popId/details', cropController.getPracticeDetail);
router.get('/inputs', cropController.getInputs);
router.get('/inputs/:itemId/packs', cropController.getInputPacks);

module.exports = router;
