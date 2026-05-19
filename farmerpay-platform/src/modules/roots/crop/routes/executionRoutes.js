/**
 * Execution Routes — Farm, field, cultivation cycle, task execution, harvest, sales.
 * All routes require authentication.
 * @swagger
 * tags:
 *   name: ROOTS Execution
 *   description: Crop cultivation cycle execution tracking
 */
const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/executionController');
const validate = require('../../../../middleware/validate');
const { authenticate } = require('../../../../middleware/auth');
const roleCheck = require('../../../../middleware/roleCheck');
const v = require('../validators/executionValidator');

router.use(authenticate);
router.use(roleCheck('FARMER', 'AGENT', 'ADMIN'));

// Farm & Fields
router.post('/farm/register', validate(v.registerFarmSchema), ctrl.registerFarm);
router.post('/farm/:registerId/fields', validate(v.addFieldSchema), ctrl.addField);

// Cultivation Cycles
router.post('/cycles', validate(v.createCycleSchema), ctrl.createCycle);
// Must come BEFORE /cycles/:cycleId/* so "me" isn't parsed as a cycleId
router.get('/cycles/me', ctrl.listMyCycles);
router.get('/cycles/:cycleId/workbands', ctrl.getCycleWorkbands);
router.get('/cycles/:cycleId/summary', ctrl.getCycleSummary);

// Workband & Task Execution
router.post('/workbands/:workbandId/execute', validate(v.executeWorkbandSchema), ctrl.executeWorkband);
router.post('/tasks/:taskId/execute', validate(v.executeTaskSchema), ctrl.executeTask);
router.post('/tasks/:taskId/complete', validate(v.completeTaskSchema), ctrl.completeTask);

// Harvest & Sales
router.post('/cycles/:cycleId/harvest', validate(v.harvestSchema), ctrl.recordHarvest);
router.post('/harvest/:harvestRecordId/sales', validate(v.saleSchema), ctrl.recordSale);

// Post-Harvest PULSE × DICE Intelligence
router.get('/cycles/:cycleId/pulse-realisation', ctrl.getCyclePulseRealisation);

// PoP Compliance
router.get('/cycles/:cycleId/pop-compliance', ctrl.getPopCompliance);
router.get('/cycles/:cycleId/pop-deviations', ctrl.getPopDeviations);

// Variance Engine Compliance (Prompt 1.3+)
router.get('/cycles/:cycleId/compliance', ctrl.getCycleCompliance);

// Farmer Health Summary ("Am I on Track?")
router.get('/farmer/me/health-summary', ctrl.getFarmerHealthSummary);

// VYAPAR-ROOTS Bridge
router.post('/vyapar-link/unlink', ctrl.unlinkVyaparTransaction);
router.get('/vyapar-link/suggestions', ctrl.getVyaparLinkSuggestions);

module.exports = router;
