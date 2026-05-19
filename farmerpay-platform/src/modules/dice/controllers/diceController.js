/**
 * DICE Controller — Handles loan discovery, application, and bookmark endpoints.
 */
const { searchProducts, getProductDetail } = require('../services/loanMatchingService');
const { checkEligibility } = require('../services/eligibilityService');
const { applyForLoan, getApplications, getApplicationDetail, withdrawApplication, captureConsent, recordRepayment, resubmitApplication } = require('../services/applicationService');
const { success } = require('../../../shared/utils/responseHelper');
const STATUS_CODES = require('../../../shared/constants/statusCodes');
const { User, FarmerLoanBookmark, LoanProduct, LoanProvider } = require('../../../shared/models');

const resolveUserId = async (req) => {
  const user = await User.findOne({ where: { user_id: req.user.id, is_active: true } });
  if (!user) { const err = new Error('User not found'); err.statusCode = 404; throw err; }
  return user.id;
};

/** GET /dice/products */
const getProducts = async (req, res, next) => {
  try {
    const result = await searchProducts(req.query, req.query);
    return success(res, { message: 'Loan products retrieved', data: result.products, meta: result.meta });
  } catch (err) { next(err); }
};

/** GET /dice/products/:productId */
const getProduct = async (req, res, next) => {
  try {
    const product = await getProductDetail(parseInt(req.params.productId, 10));
    return success(res, { message: 'Product details retrieved', data: product });
  } catch (err) { next(err); }
};

/** GET /dice/products/:productId/eligibility */
const getEligibility = async (req, res, next) => {
  try {
    const farmerId = await resolveUserId(req);
    const result = await checkEligibility(farmerId, parseInt(req.params.productId, 10));
    return success(res, { message: 'Eligibility checked', data: result });
  } catch (err) { next(err); }
};

/** POST /dice/apply */
const apply = async (req, res, next) => {
  try {
    const farmerId = await resolveUserId(req);
    const result = await applyForLoan(farmerId, req.body);
    return success(res, { message: 'Application submitted', data: result, statusCode: STATUS_CODES.CREATED });
  } catch (err) { next(err); }
};

/** GET /dice/applications */
const listApplications = async (req, res, next) => {
  try {
    const farmerId = await resolveUserId(req);
    const result = await getApplications(farmerId, req.query);
    return success(res, { message: 'Applications retrieved', data: result.applications, meta: result.meta });
  } catch (err) { next(err); }
};

/**
 * GET /dice/loans/me
 *
 * Unified loan feed used by the Money tab + repayments screen in the
 * farmer-app. Returns both FarmerPay-originated loan applications AND
 * bank-imported loan accounts (May 2026 pilot) in a single response,
 * each row discriminated by `source: 'farmerpay' | 'bank'`.
 */
const getMyLoansHandler = async (req, res, next) => {
  try {
    const farmerId = await resolveUserId(req);
    const farmerLoanFeedService = require('../services/farmerLoanFeedService');
    const result = await farmerLoanFeedService.getMyLoans(farmerId);
    return success(res, { message: 'Loans retrieved', data: result });
  } catch (err) { next(err); }
};

/** GET /dice/applications/:applicationId */
const getApplication = async (req, res, next) => {
  try {
    const farmerId = await resolveUserId(req);
    const application = await getApplicationDetail(farmerId, parseInt(req.params.applicationId, 10));
    return success(res, { message: 'Application details retrieved', data: application });
  } catch (err) { next(err); }
};

/** PUT /dice/applications/:applicationId/withdraw */
const withdraw = async (req, res, next) => {
  try {
    const farmerId = await resolveUserId(req);
    const result = await withdrawApplication(farmerId, parseInt(req.params.applicationId, 10));
    return success(res, { message: result.message, data: result });
  } catch (err) { next(err); }
};

/** POST /dice/products/:productId/bookmark */
const bookmarkProduct = async (req, res, next) => {
  try {
    const farmerId = await resolveUserId(req);
    const productId = parseInt(req.params.productId, 10);
    await FarmerLoanBookmark.upsert({
      farmer_id: farmerId, product_id: productId,
      bookmark_notes: req.body.notes || null, bookmarked_at: new Date(),
    });
    return success(res, { message: 'Product bookmarked', data: { message: 'Bookmarked' }, statusCode: STATUS_CODES.CREATED });
  } catch (err) { next(err); }
};

/** GET /dice/bookmarked-products */
const getBookmarks = async (req, res, next) => {
  try {
    const farmerId = await resolveUserId(req);
    const bookmarks = await FarmerLoanBookmark.findAll({
      where: { farmer_id: farmerId, is_active: true },
      include: [{ model: LoanProduct, as: 'product', include: [{ model: LoanProvider, as: 'provider', attributes: ['provider_name'] }] }],
      order: [['bookmarked_at', 'DESC']],
    });
    const data = bookmarks.map((b) => ({
      productId: b.product?.id, productName: b.product?.product_name,
      provider: b.product?.provider?.provider_name,
      bookmarkNotes: b.bookmark_notes, bookmarkedAt: b.bookmarked_at,
    }));
    return success(res, { message: 'Bookmarks retrieved', data });
  } catch (err) { next(err); }
};

/** POST /dice/consent — Capture lending consent */
const consent = async (req, res, next) => {
  try {
    const farmerId = await resolveUserId(req);
    // Pull ip + userAgent from the request, not from the body. A malicious
    // farmer could otherwise forge either field on the consent record they
    // own, defeating forensic trace-back in disputes.
    const result = await captureConsent(farmerId, {
      ...req.body,
      ipAddress: req.ip,
      userAgent: req.get('user-agent') || null,
    });
    return success(res, { message: 'Consent captured', data: result, statusCode: 201 });
  } catch (err) { next(err); }
};

/** POST /dice/repayment — Record loan repayment */
const repayment = async (req, res, next) => {
  try {
    const farmerId = await resolveUserId(req);
    const result = await recordRepayment(farmerId, req.body);
    return success(res, { message: 'Repayment recorded', data: result, statusCode: 201 });
  } catch (err) { next(err); }
};

/** POST /dice/applications/:applicationId/resubmit — Resubmit rejected application */
const resubmit = async (req, res, next) => {
  try {
    const farmerId = await resolveUserId(req);
    const result = await resubmitApplication(farmerId, parseInt(req.params.applicationId, 10));
    return success(res, { message: 'Application resubmitted', data: result });
  } catch (err) { next(err); }
};

module.exports = {
  getProducts, getProduct, getEligibility, apply, listApplications, getApplication, withdraw,
  getMyLoansHandler,
  bookmarkProduct, getBookmarks, consent, repayment, resubmit,
};
