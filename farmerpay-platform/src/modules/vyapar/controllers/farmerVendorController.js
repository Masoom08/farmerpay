/**
 * Farmer-facing Vendor Controller
 *
 * Powers the "Krishi Bazaar" farmer experience.
 * JWT subject = farmer user. Resolves farmer_id from req.user.
 */

const farmerVendorService = require('../services/farmerVendorService');
const { success } = require('../../../shared/utils/responseHelper');
const { User } = require('../../../shared/models');

const resolveUserId = async (req) => {
  const user = await User.findOne({ where: { user_id: req.user.id, is_active: true } });
  if (!user) {
    const err = new Error('User not found');
    err.statusCode = 404;
    err.errorCode = 'RES_001';
    throw err;
  }
  return user.id;
};

/** GET /vyapar/farmer/my-vendors */
const getMyVendors = async (req, res, next) => {
  try {
    const farmerId = await resolveUserId(req);
    const data = await farmerVendorService.getMyVendors(farmerId);
    return success(res, { message: 'My vendors', data });
  } catch (err) { next(err); }
};

/** GET /vyapar/farmer/vendor/:vendorId */
const getVendorDetail = async (req, res, next) => {
  try {
    const farmerId = await resolveUserId(req);
    const data = await farmerVendorService.getVendorDetail(
      parseInt(req.params.vendorId, 10),
      farmerId
    );
    if (!data) {
      const err = new Error('Vendor not found');
      err.statusCode = 404;
      throw err;
    }
    return success(res, { message: 'Vendor detail', data });
  } catch (err) { next(err); }
};

/** GET /vyapar/farmer/purchases */
const getMyPurchases = async (req, res, next) => {
  try {
    const farmerId = await resolveUserId(req);
    const limit = parseInt(req.query.limit, 10) || 20;
    const data = await farmerVendorService.getMyPurchases(farmerId, limit);
    return success(res, { message: 'Purchase history', data });
  } catch (err) { next(err); }
};

/** POST /vyapar/farmer/purchase */
const recordPurchase = async (req, res, next) => {
  try {
    const farmerId = await resolveUserId(req);
    const data = await farmerVendorService.recordPurchase(farmerId, req.body);
    return success(res, { message: 'Purchase recorded', data, statusCode: 201 });
  } catch (err) { next(err); }
};

/** POST /vyapar/farmer/rate-vendor */
const rateVendor = async (req, res, next) => {
  try {
    const farmerId = await resolveUserId(req);
    const { vendorId, score, feedback } = req.body;
    const data = await farmerVendorService.rateVendor(farmerId, vendorId, score, feedback);
    return success(res, { message: 'Rating submitted', data });
  } catch (err) { next(err); }
};

/** GET /vyapar/farmer/sathi-vendor */
const getSathiVendor = async (req, res, next) => {
  try {
    const farmerId = await resolveUserId(req);
    const data = await farmerVendorService.getSathiVendorBridge(farmerId);
    return success(res, { message: data ? 'Sathi is also a vendor' : 'No Sathi-vendor link', data });
  } catch (err) { next(err); }
};

/** POST /vyapar/farmer/add-vendor */
const addVendor = async (req, res, next) => {
  try {
    const farmerId = await resolveUserId(req);
    const data = await farmerVendorService.addVendor(farmerId, req.body);
    return success(res, { message: 'Vendor registered', data, statusCode: 201 });
  } catch (err) { next(err); }
};

/** POST /vyapar/farmer/make-sathi */
const makeSathi = async (req, res, next) => {
  try {
    const farmerId = await resolveUserId(req);
    const data = await farmerVendorService.makeSathi(farmerId, req.body.vendorId);
    return success(res, { message: data.message, data });
  } catch (err) { next(err); }
};

/** POST /vyapar/farmer/register-farmer — vendor registers a farmer */
const registerFarmer = async (req, res, next) => {
  try {
    const vendorUserId = await resolveUserId(req);
    const data = await farmerVendorService.registerFarmer(vendorUserId, req.body);
    return success(res, { message: 'Farmer registered', data, statusCode: 201 });
  } catch (err) { next(err); }
};

/** POST /vyapar/farmer/give-credit — vendor extends credit to farmer */
const giveCreditHandler = async (req, res, next) => {
  try {
    const vendorUserId = await resolveUserId(req);
    const data = await farmerVendorService.giveCredit(vendorUserId, req.body);
    return success(res, { message: 'Credit extended', data });
  } catch (err) { next(err); }
};

module.exports = {
  getMyVendors,
  getVendorDetail,
  getMyPurchases,
  recordPurchase,
  rateVendor,
  getSathiVendor,
  addVendor,
  makeSathi,
  registerFarmer,
  giveCreditHandler,
};
