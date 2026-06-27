/**
 * Vendor Controller
 * Handles vendor registration, profile, KYC, catalog, inventory, performance, ratings.
 */

const vendorService = require('../services/vendorService');
const creditService = require('../services/creditService');
const { success } = require('../../../shared/utils/responseHelper');
const { User, VendorProfile } = require('../../../shared/models');

const resolveUserId = async (req) => {
  const user = await User.findOne({ where: { user_id: req.user.id, is_active: true } });
  if (!user) { const err = new Error('User not found'); err.statusCode = 404; err.errorCode = 'RES_001'; throw err; }
  return user.id;
};

const resolveVendorId = async (userId) => {
  const vendor = await VendorProfile.findOne({ where: { vendor_user_id: userId, is_active: true } });
  if (!vendor) { const err = new Error('Vendor profile not found'); err.statusCode = 404; err.errorCode = 'RES_001'; throw err; }
  return vendor.id;
};

/** POST /vyapar/register */
const register = async (req, res, next) => {
  try {
    const userId = await resolveUserId(req);
    const result = await vendorService.registerVendor(userId, req.body);
    return success(res, { message: 'Vendor registered', data: result, statusCode: 201 });
  } catch (err) { next(err); }
};

/** GET /vyapar/profile */
const getProfile = async (req, res, next) => {
  try {
    const userId = await resolveUserId(req);
    const vendorId = await resolveVendorId(userId);
    const result = await vendorService.getProfile(vendorId);
    return success(res, { message: 'Vendor profile retrieved', data: result });
  } catch (err) { next(err); }
};

/** PUT /vyapar/profile:*/
const updateProfile = async (req, res, next) => {
  try {
    const userId = await resolveUserId(req);
    const vendorId = await resolveVendorId(userId);

    const result = await vendorService.updateProfile(
      vendorId,
      req.body
    );

    return success(res, {
      message: "Vendor profile updated",
      data: result
    });
  } catch (err) {
    next(err);
  }
};

/** GET /vyapar/catalog */
const getCatalog = async (req, res, next) => {
  try {
    const userId = await resolveUserId(req);
    const vendorId = await resolveVendorId(userId);
    const result = await vendorService.getCatalog(vendorId, {}, req.query);
    return success(res, { message: 'Catalog retrieved', data: result.catalog, meta: result.meta });
  } catch (err) { next(err); }
};

/** POST /vyapar/catalog */
const addCatalogItem = async (req, res, next) => {
  try {
    const userId = await resolveUserId(req);
    const vendorId = await resolveVendorId(userId);
    const result = await vendorService.addCatalogItem(vendorId, req.body);
    return success(res, { message: 'Catalog item added', data: result, statusCode: 201 });
  } catch (err) { next(err); }
};

/** PUT /vyapar/catalog/:catalogId */
const updateCatalogItem = async (req, res, next) => {
  try {
    const userId = await resolveUserId(req);
    const vendorId = await resolveVendorId(userId);
    const result = await vendorService.updateCatalogItem(vendorId, parseInt(req.params.catalogId, 10), req.body);
    return success(res, { message: 'Catalog item updated', data: result });
  } catch (err) { next(err); }
};

/** GET /vyapar/performance */
const getPerformance = async (req, res, next) => {
  try {
    const userId = await resolveUserId(req);
    const vendorId = await resolveVendorId(userId);
    const result = await vendorService.getPerformance(vendorId, req.query.month, req.query.year);
    return success(res, { message: 'Performance metrics retrieved', data: result });
  } catch (err) { next(err); }
};

/** GET /vyapar/ratings */
const getRatings = async (req, res, next) => {
  try {
    const userId = await resolveUserId(req);
    const vendorId = await resolveVendorId(userId);
    const result = await vendorService.getRatings(vendorId);
    return success(res, { message: 'Ratings retrieved', data: result });
  } catch (err) { next(err); }
};

/** GET /vyapar/inventory */
const getInventory = async (req, res, next) => {
  try {
    const userId = await resolveUserId(req);
    const vendorId = await resolveVendorId(userId);
    const result = await vendorService.getInventory(vendorId);
    return success(res, { message: 'Inventory retrieved', data: result });
  } catch (err) { next(err); }
};

/** GET /vyapar/credit-ledger */
const getCreditLedger = async (req, res, next) => {
  try {
    const userId = await resolveUserId(req);
    const vendorId = await resolveVendorId(userId);

    const result = await vendorService.getCreditLedger(
      vendorId,
      req.query
    );

    return success(res, {
      message: 'Credit ledger retrieved',
      data: result.ledgers,
      meta: result.meta,
    });
  } catch (err) {
    next(err);
  }
};

/** GET /vyapar/credit-ledger/:farmerId */
const getFarmerCreditDetail = async (
  req,
  res,
  next
) => {
  try {
    const userId = await resolveUserId(req);
    const vendorId = await resolveVendorId(userId);

    const result =
      await vendorService.getFarmerCreditDetail(
        vendorId,
        parseInt(req.params.farmerId, 10)
      );

    return success(res, {
      message:
        'Farmer credit detail retrieved',
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

/** POST /vyapar/credit-ledger/:farmerId/payment */
const recordCreditPayment = async (
  req,
  res,
  next
) => {
  try {
    const userId = await resolveUserId(req);
    const vendorId = await resolveVendorId(userId);

    const result =
      await vendorService.recordCreditPayment(
        vendorId,
        parseInt(req.params.farmerId, 10),
        req.body
      );

    return success(res, {
      message: 'Payment recorded',
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  register, getProfile, updateProfile, getCatalog, addCatalogItem, updateCatalogItem,
  getPerformance, getRatings, getInventory,
  getCreditLedger, getFarmerCreditDetail, recordCreditPayment,
};
