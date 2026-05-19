/**
 * Admin Loan Inbox Controller — EJS views + form handlers.
 *
 * Session-auth workforce path (admin_users table + express-session).
 * Delegates all business logic to the same banker loanInboxService
 * used by the JSON API SPA tab — zero duplication.
 *
 * Routes are mounted in src/modules/admin/routes/adminRoutes.js under
 * /admin/loans with requireAdmin + requireRole('bank_admin',
 * 'pilot_ops', 'system_admin').
 */

const loanInboxService = require('../../banker/services/loanInboxService');
const { AdminUser } = require('../../../shared/models');
const logger = require('../../../shared/utils/logger');

/** GET /admin/loans — list pending applications */
const showList = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page || '1', 10);
    const limit = 20;
    const offset = (page - 1) * limit;
    const status = req.query.status || 'submitted,under_review';

    const data = await loanInboxService.listApplications(
      { status, search: req.query.search || null },
      { page, limit, offset },
    );

    return res.render('admin/loan-inbox', {
      title: 'Loan Inbox — FarmerPay Bank Ops',
      rows: data.rows,
      meta: data.meta,
      statusFilter: status,
      search: req.query.search || '',
      flash: req.query.flash || null,
    });
  } catch (err) {
    logger.error(`admin loan inbox list error: ${err.message}`);
    return next(err);
  }
};

/** GET /admin/loans/:applicationId — detail + action forms */
const showDetail = async (req, res, next) => {
  try {
    const applicationId = parseInt(req.params.applicationId, 10);
    const data = await loanInboxService.getApplicationDetail(applicationId);
    return res.render('admin/loan-detail', {
      title: 'Application ' + (data.application.applicationUuid || '').slice(0, 8).toUpperCase(),
      app: data.application,
      statusHistory: data.statusHistory,
      documents: data.documents,
      finacleEvents: data.finacleEvents,
      flash: req.query.flash || null,
      error: req.query.error || null,
    });
  } catch (err) {
    return next(err);
  }
};

/**
 * Admin users and farmer users are in DIFFERENT tables. The
 * loanInboxService transition helper writes a transitioned_by FK
 * that points at users.id (the farmer side). For audit purposes,
 * we need to create or look up a "ghost" users row that mirrors
 * this admin user so the FK resolves. In v1 we cheat by using
 * farmer id 1 (Ramesh) as the banker id — this is clearly a demo
 * hack but it's enough to exercise the flow. Production would
 * either unify the tables or drop the FK to users.id.
 */
const BANKER_GHOST_USER_ID = 1;
const bankerIdFromAdmin = () => BANKER_GHOST_USER_ID;

/** POST /admin/loans/:applicationId/claim */
const doClaim = async (req, res, next) => {
  try {
    const applicationId = parseInt(req.params.applicationId, 10);
    await loanInboxService.claimApplication(applicationId, bankerIdFromAdmin(req));
    return res.redirect(`/admin/loans/${applicationId}?flash=claimed`);
  } catch (err) {
    return res.redirect(
      `/admin/loans/${req.params.applicationId}?error=${encodeURIComponent(err.message)}`,
    );
  }
};

/** POST /admin/loans/:applicationId/approve */
const doApprove = async (req, res, next) => {
  try {
    const applicationId = parseInt(req.params.applicationId, 10);
    const { approvalAmount, approvalInterestRate, approvalTenureMonths, notes } = req.body || {};
    if (!approvalAmount || !approvalInterestRate || !approvalTenureMonths) {
      return res.redirect(
        `/admin/loans/${applicationId}?error=${encodeURIComponent('All approval fields are required')}`,
      );
    }
    await loanInboxService.approveApplication(applicationId, bankerIdFromAdmin(req), {
      approvalAmount: parseFloat(approvalAmount),
      approvalInterestRate: parseFloat(approvalInterestRate),
      approvalTenureMonths: parseInt(approvalTenureMonths, 10),
      notes: notes || '',
    });
    return res.redirect(`/admin/loans/${applicationId}?flash=approved`);
  } catch (err) {
    return res.redirect(
      `/admin/loans/${req.params.applicationId}?error=${encodeURIComponent(err.message)}`,
    );
  }
};

/** POST /admin/loans/:applicationId/reject */
const doReject = async (req, res, next) => {
  try {
    const applicationId = parseInt(req.params.applicationId, 10);
    const { rejectionReason } = req.body || {};
    if (!rejectionReason || !rejectionReason.trim()) {
      return res.redirect(
        `/admin/loans/${applicationId}?error=${encodeURIComponent('Rejection reason is required')}`,
      );
    }
    await loanInboxService.rejectApplication(applicationId, bankerIdFromAdmin(req), {
      rejectionReason: rejectionReason.trim(),
    });
    return res.redirect(`/admin/loans/${applicationId}?flash=rejected`);
  } catch (err) {
    return res.redirect(
      `/admin/loans/${req.params.applicationId}?error=${encodeURIComponent(err.message)}`,
    );
  }
};

module.exports = { showList, showDetail, doClaim, doApprove, doReject };
