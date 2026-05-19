/**
 * Poultry Routes — Flock management, daily logs, health, costs, revenue, analytics.
 * All routes require authentication.
 */
const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/poultryController');
const validate = require('../../../../middleware/validate');
const { authenticate } = require('../../../../middleware/auth');
const roleCheck = require('../../../../middleware/roleCheck');
const v = require('../validators/poultryValidator');

router.use(authenticate);
router.use(roleCheck('FARMER', 'AGENT', 'ADMIN'));

// Flock CRUD
router.post('/', validate(v.createFlockSchema), ctrl.createFlock);
router.get('/me', ctrl.listMyFlocks);
router.get('/:flockId', ctrl.getFlockDetail);
router.put('/:flockId', validate(v.updateFlockSchema), ctrl.updateFlock);
router.post('/:flockId/complete', ctrl.completeFlock);
router.get('/:flockId/dashboard', ctrl.getFlockDashboard);

// Daily logs
router.post('/:flockId/daily-log', validate(v.dailyLogSchema), ctrl.createDailyLog);
router.get('/:flockId/daily-logs', ctrl.getDailyLogs);

// Health events
router.post('/:flockId/health-events', validate(v.healthEventSchema), ctrl.createHealthEvent);
router.get('/:flockId/health-events', ctrl.getHealthEvents);

// Cost events
router.post('/:flockId/costs', validate(v.costEventSchema), ctrl.createCostEvent);
router.get('/:flockId/costs', ctrl.getCostEvents);

// Revenue events
router.post('/:flockId/revenue', validate(v.revenueEventSchema), ctrl.createRevenueEvent);
router.get('/:flockId/revenue', ctrl.getRevenueEvents);

// Analytics
router.get('/:flockId/summary', ctrl.getBatchSummary);
router.get('/:flockId/pop-comparison', ctrl.getPopComparison);
router.get('/:flockId/alerts', ctrl.getAlerts);

module.exports = router;
