/**
 * LOS Controller
 * Handles Loan Origination System endpoints.
 */

const {
  initiateOrigination,
  submitForApproval,
  approverReview,
  checkerApproval,
  generateSanctionLetter,
  recordDisbursement,
  getOriginationStatus,
} = require('../services/losService');
const { success } = require('../../../shared/utils/responseHelper');
const STATUS_CODES = require('../../../shared/constants/statusCodes');
const { User } = require('../../../shared/models');

const resolveUserId = async (req) => {
  const user = await User.findOne({ where: { user_id: req.user.id, is_active: true } });
  if (!user) {
    const err = new Error('User not found');
    err.statusCode = 404;
    throw err;
  }
  return user.id;
};

/** POST /dice/los/initiate */
const initiate = async (req, res, next) => {
  try {
    const farmerId = await resolveUserId(req);
    const result = await initiateOrigination({ farmerId, ...req.body });
    return success(res, {
      message: 'Loan origination initiated',
      data: result,
      statusCode: STATUS_CODES.CREATED,
    });
  } catch (err) {
    next(err);
  }
};

/** POST /dice/los/:applicationId/submit */
const submit = async (req, res, next) => {
  try {
    const farmerId = await resolveUserId(req);
    const applicationId = parseInt(req.params.applicationId, 10);
    const result = await submitForApproval(applicationId, farmerId);
    return success(res, { message: 'Application submitted for approval', data: result });
  } catch (err) {
    next(err);
  }
};

/** POST /dice/los/:applicationId/review */
const review = async (req, res, next) => {
  try {
    const reviewerId = await resolveUserId(req);
    const applicationId = parseInt(req.params.applicationId, 10);
    const { decision, remarks } = req.body;
    const result = await approverReview(applicationId, reviewerId, decision, remarks);
    return success(res, { message: 'Application reviewed', data: result });
  } catch (err) {
    next(err);
  }
};

/** POST /dice/los/:applicationId/checker-approval */
const checker = async (req, res, next) => {
  try {
    const checkerId = await resolveUserId(req);
    const applicationId = parseInt(req.params.applicationId, 10);
    const { decision, remarks } = req.body;
    const result = await checkerApproval(applicationId, checkerId, decision, remarks);
    return success(res, { message: 'Checker decision recorded', data: result });
  } catch (err) {
    next(err);
  }
};

/** GET /dice/los/:applicationId/sanction-letter */
const sanctionLetter = async (req, res, next) => {
  try {
    const farmerId = await resolveUserId(req);
    const applicationId = parseInt(req.params.applicationId, 10);
    // Sanction letter contains full loan terms — must be scoped to the
    // owning farmer. Without this any Aadhaar-verified user could fetch
    // another farmer's letter by iterating applicationIds.
    const { LoanApplication } = require('../../../shared/models');
    const app = await LoanApplication.findOne({
      where: { id: applicationId, farmer_id: farmerId, is_active: true },
    });
    if (!app) {
      const err = new Error('Loan application not found');
      err.statusCode = 404;
      err.errorCode = 'RES_001';
      throw err;
    }
    const result = await generateSanctionLetter(applicationId);
    return success(res, { message: 'Sanction letter generated', data: result });
  } catch (err) {
    next(err);
  }
};

/** POST /dice/los/:applicationId/disburse */
const disburse = async (req, res, next) => {
  try {
    await resolveUserId(req);
    const applicationId = parseInt(req.params.applicationId, 10);
    const result = await recordDisbursement(applicationId, req.body);
    return success(res, {
      message: 'Disbursement recorded',
      data: result,
      statusCode: STATUS_CODES.CREATED,
    });
  } catch (err) {
    next(err);
  }
};

/** GET /dice/los/:applicationId/status */
const originationStatus = async (req, res, next) => {
  try {
    await resolveUserId(req);
    const applicationId = parseInt(req.params.applicationId, 10);
    const result = await getOriginationStatus(applicationId);
    return success(res, { message: 'Origination status retrieved', data: result });
  } catch (err) {
    next(err);
  }
};

module.exports = { initiate, submit, review, checker, sanctionLetter, disburse, originationStatus };
