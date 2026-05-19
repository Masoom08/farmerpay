/**
 * SoF Admin Controller
 * Handles Scale of Finance CRUD operations (admin-only).
 */

const { createSofEntry, updateSofEntry, listSofEntries, getSofHistory } = require('../services/sofAdminService');
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

/** POST /dice/sof-admin */
const create = async (req, res, next) => {
  try {
    await resolveUserId(req);
    const result = await createSofEntry(req.body);
    return success(res, {
      message: 'Scale of Finance entry created',
      data: result,
      statusCode: STATUS_CODES.CREATED,
    });
  } catch (err) {
    next(err);
  }
};

/** PUT /dice/sof-admin/:sofId */
const update = async (req, res, next) => {
  try {
    await resolveUserId(req);
    const result = await updateSofEntry(parseInt(req.params.sofId, 10), req.body);
    return success(res, { message: 'Scale of Finance entry updated', data: result });
  } catch (err) {
    next(err);
  }
};

/** GET /dice/sof-admin */
const list = async (req, res, next) => {
  try {
    await resolveUserId(req);
    const filters = {
      districtId: req.query.districtId ? parseInt(req.query.districtId, 10) : undefined,
      cropId: req.query.cropId ? parseInt(req.query.cropId, 10) : undefined,
      season: req.query.season,
      financialYear: req.query.financialYear,
    };
    const result = await listSofEntries(filters, req.query);
    return success(res, { message: 'SoF entries retrieved', data: result.entries, meta: result.meta });
  } catch (err) {
    next(err);
  }
};

/** GET /dice/sof-admin/history */
const history = async (req, res, next) => {
  try {
    await resolveUserId(req);
    const districtId = parseInt(req.query.districtId, 10);
    const cropId = parseInt(req.query.cropId, 10);
    if (!districtId || !cropId) {
      const err = new Error('districtId and cropId are required');
      err.statusCode = 400;
      throw err;
    }
    const result = await getSofHistory(districtId, cropId);
    return success(res, { message: 'SoF history retrieved', data: result });
  } catch (err) {
    next(err);
  }
};

module.exports = { create, update, list, history };
