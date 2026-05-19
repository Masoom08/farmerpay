/**
 * Admin Auth Middleware
 *
 * Two pieces:
 *   1. `requireAdmin` — gate any admin route; redirects to /admin/login
 *      if no session, or rejects if the session's admin row has been
 *      deactivated.
 *   2. `requireRole(...roles)` — role check on top of requireAdmin.
 *
 * Sessions are stored via express-session (in-memory MemoryStore by
 * default — fine for the pilot since there's only a handful of bank-ops
 * users and the store is scoped to this process). Swap to Redis store
 * in a later phase if the admin UI ever gets traffic.
 *
 * The authenticated admin user is attached to `res.locals.admin` so EJS
 * templates can read it directly (`<%= admin.name %>`).
 */

const requireAdmin = async (req, res, next) => {
  if (!req.session || !req.session.adminId) {
    return res.redirect('/admin/login?next=' + encodeURIComponent(req.originalUrl));
  }
  try {
    const { AdminUser } = require('../../../shared/models');
    const admin = await AdminUser.findByPk(req.session.adminId);
    if (!admin || !admin.is_active) {
      req.session.destroy(() => {});
      return res.redirect('/admin/login?error=session_invalid');
    }
    req.admin = admin;
    res.locals.admin = {
      id: admin.id,
      email: admin.email,
      name: admin.name,
      role: admin.role,
      bankNameScope: admin.bank_name_scope,
    };
    return next();
  } catch (err) {
    return next(err);
  }
};

const requireRole = (...roles) => (req, res, next) => {
  if (!req.admin) return res.redirect('/admin/login');
  if (!roles.includes(req.admin.role)) {
    return res.status(403).render('admin/error', {
      title: 'Forbidden',
      error: 'Your role does not permit access to this page.',
    });
  }
  return next();
};

module.exports = { requireAdmin, requireRole };
