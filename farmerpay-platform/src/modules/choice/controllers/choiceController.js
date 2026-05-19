/**
 * Choice Controller
 * Handles intermediary registration, farmer assignment, field visits, and performance.
 */

const choiceService = require('../services/choiceService');
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

/** POST /choice/intermediary */
const registerIntermediary = async (req, res, next) => {
  try {
    const result = await choiceService.registerIntermediary({
      name: req.body.name,
      mobile: req.body.mobile,
      type: req.body.type,
      districtId: req.body.districtId,
      stateId: req.body.stateId,
      skills: req.body.skills,
    });
    return success(res, { message: 'Intermediary registered successfully', data: result }, 201);
  } catch (err) { next(err); }
};

/** POST /choice/intermediary/:intermediaryId/assign/:farmerId */
const assignFarmer = async (req, res, next) => {
  try {
    const result = await choiceService.assignFarmer(
      parseInt(req.params.intermediaryId, 10),
      parseInt(req.params.farmerId, 10)
    );
    return success(res, { message: 'Farmer assigned successfully', data: result }, 201);
  } catch (err) { next(err); }
};

/** POST /choice/intermediary/:intermediaryId/visit */
const logFieldVisit = async (req, res, next) => {
  try {
    const result = await choiceService.logFieldVisit(
      parseInt(req.params.intermediaryId, 10),
      req.body.farmerId,
      {
        visitType: req.body.visitType,
        notes: req.body.notes,
        gpsLatitude: req.body.gpsLatitude,
        gpsLongitude: req.body.gpsLongitude,
        photoCount: req.body.photoCount,
        visitDuration: req.body.visitDuration,
      }
    );
    return success(res, { message: 'Field visit logged successfully', data: result }, 201);
  } catch (err) { next(err); }
};

/** GET /choice/intermediary/:intermediaryId/dashboard */
const getPerformanceDashboard = async (req, res, next) => {
  try {
    const result = await choiceService.getPerformanceDashboard(
      parseInt(req.params.intermediaryId, 10)
    );
    return success(res, { message: 'Performance dashboard retrieved', data: result });
  } catch (err) { next(err); }
};

/** GET /choice/intermediaries */
const listIntermediaries = async (req, res, next) => {
  try {
    const filters = {
      type: req.query.type,
      districtId: req.query.districtId,
      search: req.query.search,
    };
    const pagination = {
      page: req.query.page,
      limit: req.query.limit,
    };
    const result = await choiceService.listIntermediaries(filters, pagination);
    return success(res, {
      message: 'Intermediaries retrieved',
      data: result.data,
      meta: result.meta,
    });
  } catch (err) { next(err); }
};

// ─── Farmer-Facing Endpoints ───────────────────────────────────────

/** GET /choice/available — List intermediaries near farmer's village */
const getAvailable = async (req, res, next) => {
  try {
    const farmerId = await resolveUserId(req);
    const result = await choiceService.getAvailableForFarmer(farmerId, { type: req.query.type });
    return success(res, { message: 'Available intermediaries retrieved', data: result });
  } catch (err) { next(err); }
};

/** GET /choice/intermediary/:id/profile — Full profile card */
const getProfile = async (req, res, next) => {
  try {
    const result = await choiceService.getProfileCard(parseInt(req.params.intermediaryId, 10));
    return success(res, { message: 'Profile card retrieved', data: result });
  } catch (err) { next(err); }
};

/** POST /choice/select — Farmer selects their intermediary */
const selectIntermediary = async (req, res, next) => {
  try {
    const farmerId = await resolveUserId(req);
    const result = await choiceService.selectIntermediary(farmerId, req.body.intermediaryId);
    return success(res, { message: 'Intermediary selected', data: result, statusCode: 201 });
  } catch (err) { next(err); }
};

/** POST /choice/change-request — Request change of intermediary */
const changeRequest = async (req, res, next) => {
  try {
    const farmerId = await resolveUserId(req);
    const result = await choiceService.requestChange(farmerId, {
      reason: req.body.reason,
      newIntermediaryId: req.body.newIntermediaryId,
    });
    return success(res, { message: 'Change request submitted', data: result });
  } catch (err) { next(err); }
};

/** POST /choice/escalate — Escalate issue with intermediary */
const escalate = async (req, res, next) => {
  try {
    const farmerId = await resolveUserId(req);
    const result = await choiceService.escalate(farmerId, { reason: req.body.reason });
    return success(res, { message: 'Escalation recorded', data: result });
  } catch (err) { next(err); }
};

/** POST /choice/rate — Rate and provide feedback */
const rate = async (req, res, next) => {
  try {
    const farmerId = await resolveUserId(req);
    const result = await choiceService.rateFeedback(farmerId, {
      rating: req.body.rating,
      feedback: req.body.feedback,
    });
    return success(res, { message: 'Feedback recorded', data: result });
  } catch (err) { next(err); }
};

/** GET /choice/my-intermediary — Get current farmer's intermediary */
const getMy = async (req, res, next) => {
  try {
    const farmerId = await resolveUserId(req);
    const result = await choiceService.getMyIntermediary(farmerId);
    return success(res, { message: 'My intermediary retrieved', data: result });
  } catch (err) { next(err); }
};

module.exports = {
  registerIntermediary,
  assignFarmer,
  logFieldVisit,
  getPerformanceDashboard,
  listIntermediaries,
  getAvailable,
  getProfile,
  selectIntermediary,
  changeRequest,
  escalate,
  rate,
  getMy,
};
