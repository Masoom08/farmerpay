/**
 * Goatery Routes — Herds, animals, breeding, health, feed, cost, revenue, analytics.
 */
const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/goateryController');
const validate = require('../../../../middleware/validate');
const { authenticate } = require('../../../../middleware/auth');
const roleCheck = require('../../../../middleware/roleCheck');
const v = require('../validators/goateryValidator');

router.use(authenticate);
router.use(roleCheck('FARMER', 'AGENT', 'ADMIN'));

// Herds
router.post('/', validate(v.createHerdSchema), ctrl.createHerd);
router.get('/me', ctrl.listMyHerds);
router.get('/:herdId', ctrl.getHerdDetail);
router.put('/:herdId', ctrl.updateHerd);

// Animals
router.post('/:herdId/animals', validate(v.registerAnimalSchema), ctrl.registerAnimal);
router.get('/:herdId/animals', ctrl.listAnimals);
router.put('/animals/:animalId/weight', ctrl.updateWeight);
router.post('/animals/:animalId/sell', ctrl.sellAnimal);
router.post('/animals/:animalId/death', ctrl.markDead);

// Growth logs
router.post('/animals/:animalId/growth', validate(v.growthLogSchema), ctrl.createGrowthLog);
router.get('/animals/:animalId/growth', ctrl.getGrowthLogs);

// Breeding
router.post('/animals/:doeId/breeding', validate(v.breedingServiceSchema), ctrl.recordBreedingService);
router.post('/breeding/:eventId/kidding', validate(v.kiddingSchema), ctrl.recordKidding);
router.get('/:herdId/breeding-calendar', ctrl.getBreedingCalendar);

// Health
router.post('/:herdId/health-events', validate(v.healthEventSchema), ctrl.createHealthEvent);
router.get('/:herdId/health-events', ctrl.getHealthEvents);
router.get('/:herdId/vaccination-schedule', ctrl.getVaccSchedule);

// Feed logs
router.post('/:herdId/feed', validate(v.feedLogSchema), ctrl.createFeedLog);
router.get('/:herdId/feed', ctrl.getFeedLogs);

// Cost & Revenue
router.post('/:herdId/costs', validate(v.costEventSchema), ctrl.createCostEvent);
router.get('/:herdId/costs', ctrl.getCostEvents);
router.post('/:herdId/revenue', validate(v.revenueEventSchema), ctrl.createRevenueEvent);
router.get('/:herdId/revenue', ctrl.getRevenueEvents);

// Analytics
router.get('/:herdId/economics', ctrl.getEconomics);
router.get('/:herdId/pop-comparison', ctrl.getPopComparison);
router.get('/:herdId/reproductive-efficiency', ctrl.getReproductive);

module.exports = router;
