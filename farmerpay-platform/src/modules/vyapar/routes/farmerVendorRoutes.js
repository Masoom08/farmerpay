/**
 * Farmer-facing Vendor Routes ("Krishi Bazaar")
 *
 * Mounted at /vyapar/farmer in app.js. Requires farmer JWT.
 *
 * @swagger
 * tags:
 *   name: KrishiBazaar
 *   description: Farmer-facing vendor discovery, purchases, and rating
 */

const express = require('express');
const router = express.Router();

const ctrl = require('../controllers/farmerVendorController');
const { authenticate } = require('../../../middleware/auth');

router.use(authenticate);

/** GET /vyapar/farmer/my-vendors — list vendors I've bought from */
router.get('/my-vendors', ctrl.getMyVendors);

/** GET /vyapar/farmer/vendor/:vendorId — vendor detail + catalog + credit */
router.get('/vendor/:vendorId', ctrl.getVendorDetail);

/** GET /vyapar/farmer/purchases — my purchase history across all vendors */
router.get('/purchases', ctrl.getMyPurchases);

/** POST /vyapar/farmer/purchase — record a new purchase */
router.post('/purchase', ctrl.recordPurchase);

/** POST /vyapar/farmer/rate-vendor — rate a vendor */
router.post('/rate-vendor', ctrl.rateVendor);

/** GET /vyapar/farmer/sathi-vendor — check if my Sathi is also a vendor */
router.get('/sathi-vendor', ctrl.getSathiVendor);

/** POST /vyapar/farmer/add-vendor — register a new local vendor */
router.post('/add-vendor', ctrl.addVendor);

/** POST /vyapar/farmer/make-sathi — make a vendor my Sathi too */
router.post('/make-sathi', ctrl.makeSathi);

/** POST /vyapar/farmer/register-farmer — vendor registers a new farmer customer */
router.post('/register-farmer', ctrl.registerFarmer);

/**GET /vyapar/farmer/my-farmers -  */
router.get('/my-farmers', ctrl.getMyFarmers);

/** POST /vyapar/farmer/give-credit — vendor extends credit to a farmer */
router.post('/give-credit', ctrl.giveCreditHandler);

module.exports = router;
