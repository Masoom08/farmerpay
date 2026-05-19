/**
 * Fishery v2 Routes — financial logbook
 * Mounted under /api/v1/roots/fishery/v2 by the fishery module index.
 *
 * @swagger
 * tags:
 *   name: ROOTS Fishery v2
 *   description: Fishery financial logbook (inland + sea, hybrid allocation, tiered UX)
 */

const express = require('express');
const router = express.Router();

const c = require('../controllers/fisheryV2Controller');
const validate = require('../../../../middleware/validate');
const { authenticate } = require('../../../../middleware/auth');
const v = require('../validators/fisheryV2Validator');

router.use(authenticate);

// --------- Profile ---------
router.post('/profile', validate(v.upsertProfileSchema), c.upsertProfile);
router.get('/profile', c.getProfile);

// --------- Ponds (inland) ---------
router.post('/ponds', validate(v.addPondSchema), c.addPond);
router.get('/ponds', c.listPonds);
router.get('/ponds/:pondUuid', c.getPond);
router.patch('/ponds/:pondUuid', validate(v.updatePondSchema), c.updatePond);
router.post('/ponds/:pondUuid/exit', validate(v.exitPondSchema), c.exitPond);

// --------- Vessels (sea) ---------
router.post('/vessels', validate(v.addVesselSchema), c.addVessel);
router.get('/vessels', c.listVessels);
router.get('/vessels/:vesselUuid', c.getVessel);
router.patch('/vessels/:vesselUuid', validate(v.updateVesselSchema), c.updateVessel);
router.post('/vessels/:vesselUuid/exit', validate(v.exitVesselSchema), c.exitVessel);

// --------- Cost events ---------
router.post('/cost-events', validate(v.createCostEventSchema), c.createCostEvent);
router.get('/cost-events', c.listCostEvents);
router.get('/cost-events/pending', c.listPendingEvents);
router.post(
  '/cost-events/:eventUuid/confirm',
  validate(v.confirmPendingEventSchema),
  c.confirmPendingEvent,
);

// --------- Revenue events ---------
router.post('/revenue-events', validate(v.createRevenueEventSchema), c.createRevenueEvent);
router.get('/revenue-events', c.listRevenueEvents);

// --------- Stocking / Harvest (inland pond cycles) ---------
router.post('/stocking', validate(v.createStockingSchema), c.createStockingEvent);
router.post('/harvest', validate(v.createHarvestSchema), c.createHarvestEvent);

// --------- Trips (sea) ---------
router.post('/trips', validate(v.createTripSchema), c.createTrip);
router.get('/trips', c.listTrips);

// --------- Treatment ---------
router.post('/treatment', validate(v.createTreatmentSchema), c.createTreatmentEvent);
router.get('/treatment', c.listTreatmentEvents);

// --------- Recurring templates ---------
router.post('/recurring', validate(v.createTemplateSchema), c.createTemplate);
router.get('/recurring', c.listTemplates);
router.delete('/recurring/:templateUuid', c.deleteTemplate);

// --------- Weekly summary (Large tier bulk entry) ---------
router.post('/weekly', validate(v.upsertWeeklySummarySchema), c.upsertWeeklySummary);
router.get('/weekly', c.listWeeklySummaries);
router.post('/weekly/:summaryUuid/finalize', c.finalizeWeek);

// --------- P&L (hybrid allocation engine) ---------
/**
 * @swagger
 * /roots/fishery/v2/pnl/farm:
 *   get:
 *     tags: [ROOTS Fishery v2]
 *     summary: Get farm-level P&L for a date range
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: startDate
 *         required: true
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: endDate
 *         required: true
 *         schema: { type: string, format: date }
 */
router.get('/pnl/farm', validate(v.pnlQuerySchema, 'query'), c.getFarmPnl);
router.get('/pnl/per-pond', validate(v.pnlQuerySchema, 'query'), c.getPerPondPnl);
router.get('/pnl/per-vessel', validate(v.pnlQuerySchema, 'query'), c.getPerVesselPnl);
router.get('/pnl/per-trip', validate(v.pnlQuerySchema, 'query'), c.getPerTripPnl);

// --------- Persona phase: aggregate units save-and-lock ---------
router.post('/units/aggregate', c.saveAggregateUnits);

module.exports = router;
