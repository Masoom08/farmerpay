/**
 * Loan Inbox Controller — Thin express handlers over loanInboxService.
 * All routes are mounted under /banker/loan-inbox which already has
 * authenticate + roleCheck('dice_analyst', 'system_admin', 'FARMER')
 * applied via the parent router.
 */

const loanInboxService = require('../services/loanInboxService');
const { success } = require('../../../shared/utils/responseHelper');
const { parsePagination } = require('../../../shared/utils/paginationHelper');
const { User } = require('../../../shared/models');

// Resolve the current banker's DB id from the JWT payload. Mirrors
// the pattern used in diceController and postharvestController.
const resolveBankerId = async (req) => {
  const user = await User.findOne({ where: { user_id: req.user.id, is_active: true } });
  if (!user) {
    const err = new Error('Banker user not found');
    err.statusCode = 404;
    throw err;
  }
  return user.id;
};

/** GET /banker/loan-inbox?status=submitted,under_review&page=1&limit=20 */
const list = async (req, res, next) => {
  try {
    const pagination = parsePagination(req.query);
    const filters = {
      status: req.query.status || null,
      district: req.query.district || null,
      search: req.query.search || null,
    };
    const data = await loanInboxService.listApplications(filters, pagination);
    return success(res, {
      message: 'Loan inbox retrieved',
      data: data.rows,
      meta: data.meta,
    });
  } catch (e) {
    next(e);
  }
};

/** GET /banker/loan-inbox/:applicationId */
const detail = async (req, res, next) => {
  try {
    const applicationId = parseInt(req.params.applicationId, 10);
    const data = await loanInboxService.getApplicationDetail(applicationId);
    return success(res, { message: 'Application detail retrieved', data });
  } catch (e) {
    next(e);
  }
};

/** POST /banker/loan-inbox/:applicationId/claim */
const claim = async (req, res, next) => {
  try {
    const bankerId = await resolveBankerId(req);
    const applicationId = parseInt(req.params.applicationId, 10);
    const result = await loanInboxService.claimApplication(applicationId, bankerId);
    return success(res, { message: 'Application claimed for review', data: result });
  } catch (e) {
    next(e);
  }
};

/** POST /banker/loan-inbox/:applicationId/approve */
const approve = async (req, res, next) => {
  try {
    const bankerId = await resolveBankerId(req);
    const applicationId = parseInt(req.params.applicationId, 10);
    const {
      approvalAmount,
      approvalInterestRate,
      approvalTenureMonths,
      notes,
    } = req.body || {};

    if (!approvalAmount || !approvalInterestRate || !approvalTenureMonths) {
      const err = new Error(
        'approvalAmount, approvalInterestRate, and approvalTenureMonths are required',
      );
      err.statusCode = 400;
      err.errorCode = 'VAL_001';
      throw err;
    }

    const result = await loanInboxService.approveApplication(applicationId, bankerId, {
      approvalAmount: parseFloat(approvalAmount),
      approvalInterestRate: parseFloat(approvalInterestRate),
      approvalTenureMonths: parseInt(approvalTenureMonths, 10),
      notes,
    });
    return success(res, { message: 'Application approved', data: result });
  } catch (e) {
    next(e);
  }
};

/** POST /banker/loan-inbox/:applicationId/reject */
const reject = async (req, res, next) => {
  try {
    const bankerId = await resolveBankerId(req);
    const applicationId = parseInt(req.params.applicationId, 10);
    const { rejectionReason } = req.body || {};

    if (!rejectionReason || !String(rejectionReason).trim()) {
      const err = new Error('rejectionReason is required');
      err.statusCode = 400;
      err.errorCode = 'VAL_001';
      throw err;
    }

    const result = await loanInboxService.rejectApplication(applicationId, bankerId, {
      rejectionReason: String(rejectionReason).trim(),
    });
    return success(res, { message: 'Application rejected', data: result });
  } catch (e) {
    next(e);
  }
};

module.exports = { list, detail, claim, approve, reject };
