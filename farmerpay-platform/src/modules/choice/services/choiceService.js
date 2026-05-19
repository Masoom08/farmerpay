/**
 * Choice Service
 * Intermediary management, farmer assignment, field visits, and performance dashboards.
 */

const { Op, fn, col, literal } = require('sequelize');
const { generateUUID } = require('../../../shared/utils/uuidHelper');
const logger = require('../../../shared/utils/logger');
const { parsePagination, buildMeta } = require('../../../shared/utils/paginationHelper');

let db;
const getDb = () => {
  if (!db) db = require('../../../shared/models');
  return db;
};

/**
 * Registers a new intermediary.
 */
const registerIntermediary = async ({ name, mobile, type, districtId, stateId, skills }) => {
  const { Intermediary } = getDb();

  // Check for duplicate mobile
  const existing = await Intermediary.findOne({ where: { mobile, is_active: true } });
  if (existing) {
    const err = new Error('Intermediary with this mobile already exists');
    err.statusCode = 409;
    err.errorCode = 'CHOICE_001';
    throw err;
  }

  const intermediary = await Intermediary.create({
    intermediary_uuid: generateUUID(),
    name,
    mobile,
    type,
    district_id: districtId || null,
    state_id: stateId || null,
    skills: skills || null,
    is_active: true,
  });

  logger.info(`Intermediary registered: id=${intermediary.intermediary_uuid}, type=${type}`);

  return {
    intermediaryId: intermediary.intermediary_uuid,
    name: intermediary.name,
    mobile: intermediary.mobile,
    type: intermediary.type,
    createdAt: intermediary.created_at,
  };
};

/**
 * Assigns a farmer to an intermediary.
 */
const assignFarmer = async (intermediaryId, farmerId) => {
  const { Intermediary, IntermediaryAssignment } = getDb();

  // Verify intermediary exists
  const intermediary = await Intermediary.findByPk(intermediaryId);
  if (!intermediary || !intermediary.is_active) {
    const err = new Error('Intermediary not found');
    err.statusCode = 404;
    err.errorCode = 'CHOICE_002';
    throw err;
  }

  // Check if already assigned
  const existing = await IntermediaryAssignment.findOne({
    where: {
      intermediary_id: intermediaryId,
      farmer_id: farmerId,
      assignment_status: 'active',
      is_active: true,
    },
  });

  if (existing) {
    const err = new Error('Farmer is already assigned to this intermediary');
    err.statusCode = 409;
    err.errorCode = 'CHOICE_003';
    throw err;
  }

  const assignment = await IntermediaryAssignment.create({
    assignment_uuid: generateUUID(),
    intermediary_id: intermediaryId,
    farmer_id: farmerId,
    assigned_at: new Date(),
    assignment_status: 'active',
    is_active: true,
  });

  logger.info(`Farmer ${farmerId} assigned to intermediary ${intermediaryId}`);

  return {
    assignmentId: assignment.assignment_uuid,
    intermediaryId,
    farmerId,
    assignedAt: assignment.assigned_at,
    status: assignment.assignment_status,
  };
};

/**
 * Logs a field visit by an intermediary to a farmer.
 */
const logFieldVisit = async (intermediaryId, farmerId, {
  visitType, notes, gpsLatitude, gpsLongitude, photoCount, visitDuration,
}) => {
  const { FieldVisitLog } = getDb();

  const visit = await FieldVisitLog.create({
    visit_uuid: generateUUID(),
    intermediary_id: intermediaryId,
    farmer_id: farmerId,
    visit_date: new Date().toISOString().split('T')[0],
    visit_type: visitType,
    notes: notes || null,
    gps_latitude: gpsLatitude || null,
    gps_longitude: gpsLongitude || null,
    photo_count: photoCount || 0,
    visit_duration_minutes: visitDuration || null,
    farmer_signed_off: false,
    is_active: true,
  });

  logger.info(`Field visit logged: intermediary=${intermediaryId}, farmer=${farmerId}, type=${visitType}`);

  return {
    visitId: visit.visit_uuid,
    visitDate: visit.visit_date,
    visitType: visit.visit_type,
    createdAt: visit.created_at,
  };
};

/**
 * Gets performance dashboard KPIs for an intermediary.
 */
const getPerformanceDashboard = async (intermediaryId) => {
  const { Intermediary, IntermediaryAssignment, FieldVisitLog } = getDb();

  const intermediary = await Intermediary.findByPk(intermediaryId);
  if (!intermediary || !intermediary.is_active) {
    const err = new Error('Intermediary not found');
    err.statusCode = 404;
    err.errorCode = 'CHOICE_002';
    throw err;
  }

  // Count farmers assigned
  const farmersAssigned = await IntermediaryAssignment.count({
    where: { intermediary_id: intermediaryId, assignment_status: 'active', is_active: true },
  });

  // Total visits
  const totalVisits = await FieldVisitLog.count({
    where: { intermediary_id: intermediaryId, is_active: true },
  });

  // Visits this month
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const visitsThisMonth = await FieldVisitLog.count({
    where: {
      intermediary_id: intermediaryId,
      is_active: true,
      visit_date: { [Op.gte]: startOfMonth.toISOString().split('T')[0] },
    },
  });

  // Unique farmers visited
  const uniqueFarmersVisited = await FieldVisitLog.count({
    where: { intermediary_id: intermediaryId, is_active: true },
    distinct: true,
    col: 'farmer_id',
  });

  return {
    intermediaryId: intermediary.intermediary_uuid,
    name: intermediary.name,
    type: intermediary.type,
    kpis: {
      farmersAssigned,
      totalVisits,
      visitsThisMonth,
      uniqueFarmersVisited,
    },
  };
};

/**
 * Lists intermediaries with pagination and filters.
 */
const listIntermediaries = async (filters = {}, pagination = {}) => {
  const { Intermediary, IntermediaryAssignment, FieldVisitLog, sequelize } = getDb();

  const { limit, offset } = parsePagination(pagination);
  const where = { is_active: true };

  if (filters.type) {
    where.type = filters.type;
  }
  if (filters.districtId) {
    where.district_id = filters.districtId;
  }
  if (filters.search) {
    where.name = { [Op.like]: `%${filters.search}%` };
  }

  const { count, rows } = await Intermediary.findAndCountAll({
    where,
    limit,
    offset,
    order: [['created_at', 'DESC']],
    attributes: {
      include: [
        [
          literal(`(SELECT COUNT(*) FROM intermediary_assignments WHERE intermediary_assignments.intermediary_id = \`Intermediary\`.\`id\` AND intermediary_assignments.is_active = true AND intermediary_assignments.assignment_status = 'active')`),
          'farmer_count',
        ],
        [
          literal(`(SELECT COUNT(*) FROM field_visit_logs WHERE field_visit_logs.intermediary_id = \`Intermediary\`.\`id\` AND field_visit_logs.is_active = true)`),
          'visit_count',
        ],
      ],
    },
  });

  const data = rows.map((r) => ({
    intermediaryId: r.intermediary_uuid,
    name: r.name,
    mobile: r.mobile,
    type: r.type,
    districtId: r.district_id,
    stateId: r.state_id,
    commissionRatePercent: r.commission_rate_percent,
    farmerCount: parseInt(r.getDataValue('farmer_count'), 10) || 0,
    visitCount: parseInt(r.getDataValue('visit_count'), 10) || 0,
    createdAt: r.created_at,
  }));

  return {
    data,
    meta: buildMeta(count, limit, offset),
  };
};

// ═══════════════════════════════════════════════════════════════════
// FARMER-FACING CHOICE ENDPOINTS
// Listing, profile card, selection, change request, escalation
// ═══════════════════════════════════════════════════════════════════

/**
 * Gets available intermediaries for a farmer based on their village/block/district.
 * Service availability logic: filters by is_available, village match first, then block, then district.
 */
const getAvailableForFarmer = async (farmerId, filters = {}) => {
  const { Intermediary, sequelize: seq } = getDb();

  // Get farmer's LGD codes from farmer_addresses (primary address)
  let farmerVillageId = null;
  let farmerBlockId = null;
  let farmerDistrictId = null;
  let farmerStateId = null;

  try {
    const [rows] = await seq.query(
      `SELECT lgd_village_id, lgd_block_id, lgd_district_id, lgd_state_id FROM farmer_addresses WHERE farmer_id = ${farmerId} AND is_primary_address = 1 AND is_active = 1 LIMIT 1`
    );
    if (rows && rows.length > 0) {
      farmerVillageId = rows[0].lgd_village_id || null;
      farmerBlockId = rows[0].lgd_block_id || null;
      farmerDistrictId = rows[0].lgd_district_id || null;
      farmerStateId = rows[0].lgd_state_id || null;
    }
  } catch (e) { /* no address data */ }

  // Build WHERE: match village first (priority 1), then block (priority 2), then district (priority 3)
  const where = {
    is_active: true,
    is_available: true,
  };
  if (filters.type) where.type = filters.type;

  // Fetch all candidates in farmer's geography (cascading fallback)
  const all = await Intermediary.findAll({
    where,
    raw: true,
    limit: 100,
  });

  // Score each candidate by proximity
  const scored = all.map(i => {
    let proximityScore = 0;
    let matchLevel = 'unmatched';
    if (farmerVillageId && i.village_id === farmerVillageId) { proximityScore = 100; matchLevel = 'village'; }
    else if (farmerBlockId && i.block_id === farmerBlockId) { proximityScore = 75; matchLevel = 'block'; }
    else if (farmerDistrictId && i.district_id === farmerDistrictId) { proximityScore = 50; matchLevel = 'district'; }
    else if (farmerStateId && i.state_id === farmerStateId) { proximityScore = 25; matchLevel = 'state'; }
    return { ...i, proximityScore, matchLevel };
  });

  // Keep only those in farmer's district or above, sort by proximity then rating
  const filtered = scored.filter(s => s.proximityScore > 0 || !farmerDistrictId);
  filtered.sort((a, b) => {
    if (b.proximityScore !== a.proximityScore) return b.proximityScore - a.proximityScore;
    return parseFloat(b.rating || 0) - parseFloat(a.rating || 0);
  });

  return {
    farmerLocation: { villageId: farmerVillageId, blockId: farmerBlockId, districtId: farmerDistrictId, stateId: farmerStateId },
    totalAvailable: filtered.length,
    intermediaries: filtered.slice(0, 20).map(i => ({
      intermediaryId: i.intermediary_uuid,
      internalId: i.id,
      name: i.name,
      mobile: i.mobile,
      type: i.type,
      typeLabel: getTypeLabel(i.type),
      matchLevel: i.matchLevel,
      proximityScore: i.proximityScore,
      rating: parseFloat(i.rating || 0),
      totalFarmersServed: i.total_farmers_served || 0,
      yearsOfExperience: i.years_of_experience || null,
      languagesSpoken: i.languages_spoken || [],
      bio: i.bio || null,
      profilePhotoUrl: i.profile_photo_url || null,
      serviceRadiusKm: i.service_radius_km || 10,
      isAvailable: Boolean(i.is_available),
    })),
  };
};

function getTypeLabel(type) {
  const labels = {
    bank_sakhi: 'Bank Sakhi (Female Bank Rep)',
    fpo_secretary: 'FPO Secretary',
    bc: 'Business Correspondent',
    input_seller: 'Input Seller',
    adathiya: 'Adathiya (Commission Agent)',
    fpo_agent: 'FPO Agent',
    bank_mitra: 'Bank Mitra',
    agri_entrepreneur: 'Agri Entrepreneur',
  };
  return labels[type] || type;
}

/**
 * Gets a full profile card for a specific intermediary.
 */
const getProfileCard = async (intermediaryInternalId) => {
  const { Intermediary, IntermediaryAssignment, FieldVisitLog } = getDb();

  const i = await Intermediary.findByPk(intermediaryInternalId);
  if (!i || !i.is_active) {
    const err = new Error('Intermediary not found'); err.statusCode = 404; err.errorCode = 'CHOICE_002'; throw err;
  }

  const activeAssignments = await IntermediaryAssignment.count({
    where: { intermediary_id: intermediaryInternalId, assignment_status: 'active', is_active: true },
  });
  const totalVisits = await FieldVisitLog.count({
    where: { intermediary_id: intermediaryInternalId, is_active: true },
  });

  // Aggregate farmer ratings
  const ratings = await IntermediaryAssignment.findAll({
    where: { intermediary_id: intermediaryInternalId, farmer_rating: { [Op.ne]: null } },
    attributes: ['farmer_rating', 'farmer_feedback'],
    raw: true,
  });
  const avgRating = ratings.length > 0
    ? ratings.reduce((s, r) => s + r.farmer_rating, 0) / ratings.length
    : parseFloat(i.rating || 0);

  return {
    intermediaryId: i.intermediary_uuid,
    internalId: i.id,
    name: i.name,
    mobile: i.mobile,
    type: i.type,
    typeLabel: getTypeLabel(i.type),
    profile: {
      photoUrl: i.profile_photo_url,
      bio: i.bio,
      yearsOfExperience: i.years_of_experience,
      languagesSpoken: i.languages_spoken || [],
      skills: i.skills || [],
    },
    location: {
      villageId: i.village_id,
      blockId: i.block_id,
      districtId: i.district_id,
      stateId: i.state_id,
      serviceRadiusKm: i.service_radius_km,
    },
    performance: {
      rating: Math.round(avgRating * 100) / 100,
      totalRatings: ratings.length,
      activeFarmers: activeAssignments,
      totalFarmersServed: i.total_farmers_served || 0,
      totalVisits,
    },
    availability: {
      isAvailable: Boolean(i.is_available),
      commissionRatePercent: i.commission_rate_percent,
    },
    recentFeedback: ratings.slice(0, 3).map(r => ({
      rating: r.farmer_rating,
      feedback: r.farmer_feedback,
    })),
  };
};

/**
 * Farmer selects an intermediary (self-selection).
 * If farmer already has an active assignment, mark it as reassigned and create new one.
 */
const selectIntermediary = async (farmerId, intermediaryInternalId) => {
  const { Intermediary, IntermediaryAssignment, sequelize: seq } = getDb();

  const intermediary = await Intermediary.findByPk(intermediaryInternalId);
  if (!intermediary || !intermediary.is_active || !intermediary.is_available) {
    const err = new Error('Intermediary not available'); err.statusCode = 404; err.errorCode = 'CHOICE_002'; throw err;
  }

  const trx = await seq.transaction();
  try {
    // Close any existing active assignments
    await IntermediaryAssignment.update(
      { assignment_status: 'reassigned', is_active: false },
      { where: { farmer_id: farmerId, assignment_status: 'active', is_active: true }, transaction: trx }
    );

    // Create new assignment
    const newAssignment = await IntermediaryAssignment.create({
      assignment_uuid: generateUUID(),
      intermediary_id: intermediaryInternalId,
      farmer_id: farmerId,
      assigned_at: new Date(),
      assignment_status: 'active',
      selected_by_farmer: true,
      is_active: true,
    }, { transaction: trx });

    // Increment the intermediary's total_farmers_served counter
    await intermediary.increment('total_farmers_served', { by: 1, transaction: trx });

    await trx.commit();

    logger.info(`Farmer ${farmerId} selected intermediary ${intermediary.intermediary_uuid}`);

    return {
      assignmentId: newAssignment.assignment_uuid,
      intermediaryId: intermediary.intermediary_uuid,
      intermediaryName: intermediary.name,
      intermediaryType: intermediary.type,
      assignedAt: newAssignment.assigned_at,
      status: 'active',
      message: `You have selected ${intermediary.name} as your community resource person.`,
    };
  } catch (err) {
    await trx.rollback();
    throw err;
  }
};

/**
 * Farmer requests a change of intermediary.
 */
const requestChange = async (farmerId, { reason, newIntermediaryId }) => {
  const { IntermediaryAssignment, Intermediary } = getDb();

  const currentAssignment = await IntermediaryAssignment.findOne({
    where: { farmer_id: farmerId, assignment_status: 'active', is_active: true },
  });
  if (!currentAssignment) {
    const err = new Error('No active intermediary found for this farmer'); err.statusCode = 404; err.errorCode = 'CHOICE_004'; throw err;
  }
  if (!reason || reason.length < 10) {
    const err = new Error('Change reason must be at least 10 characters'); err.statusCode = 400; err.errorCode = 'CHOICE_005'; throw err;
  }

  await currentAssignment.update({
    assignment_status: 'pending_change',
    change_requested_at: new Date(),
    change_reason: reason,
  });

  logger.info(`Farmer ${farmerId} requested change of intermediary: ${reason}`);

  // If new intermediary specified, auto-approve the change
  if (newIntermediaryId) {
    return await selectIntermediary(farmerId, newIntermediaryId);
  }

  return {
    assignmentId: currentAssignment.assignment_uuid,
    status: 'pending_change',
    changeRequestedAt: currentAssignment.change_requested_at,
    reason,
    message: 'Change request recorded. You can now select a new intermediary.',
  };
};

/**
 * Farmer escalates an issue with their intermediary.
 */
const escalate = async (farmerId, { reason }) => {
  const { IntermediaryAssignment } = getDb();

  const current = await IntermediaryAssignment.findOne({
    where: { farmer_id: farmerId, assignment_status: ['active', 'pending_change'], is_active: true },
  });
  if (!current) {
    const err = new Error('No active intermediary assignment found'); err.statusCode = 404; err.errorCode = 'CHOICE_004'; throw err;
  }
  if (!reason || reason.length < 10) {
    const err = new Error('Escalation reason must be at least 10 characters'); err.statusCode = 400; err.errorCode = 'CHOICE_005'; throw err;
  }

  await current.update({
    assignment_status: 'escalated',
    escalation_reason: reason,
  });

  logger.warn(`Escalation by farmer ${farmerId}: ${reason}`);

  return {
    assignmentId: current.assignment_uuid,
    status: 'escalated',
    escalationReason: reason,
    message: 'Your escalation has been recorded. Support team will contact you within 24-48 hours.',
    supportContact: '1800-XXX-XXXX',
  };
};

/**
 * Farmer rates and provides feedback on their current intermediary.
 */
const rateFeedback = async (farmerId, { rating, feedback }) => {
  const { IntermediaryAssignment, Intermediary } = getDb();

  if (!rating || rating < 1 || rating > 5) {
    const err = new Error('Rating must be between 1 and 5'); err.statusCode = 400; err.errorCode = 'CHOICE_006'; throw err;
  }

  const current = await IntermediaryAssignment.findOne({
    where: { farmer_id: farmerId, assignment_status: 'active', is_active: true },
  });
  if (!current) {
    const err = new Error('No active intermediary assignment found'); err.statusCode = 404; err.errorCode = 'CHOICE_004'; throw err;
  }

  await current.update({
    farmer_rating: rating,
    farmer_feedback: feedback || null,
  });

  // Recompute intermediary's aggregate rating
  const allRatings = await IntermediaryAssignment.findAll({
    where: { intermediary_id: current.intermediary_id, farmer_rating: { [Op.ne]: null } },
    attributes: ['farmer_rating'],
    raw: true,
  });
  const avgRating = allRatings.reduce((s, r) => s + r.farmer_rating, 0) / allRatings.length;
  await Intermediary.update(
    { rating: Math.round(avgRating * 100) / 100 },
    { where: { id: current.intermediary_id } }
  );

  return {
    assignmentId: current.assignment_uuid,
    rating,
    feedback,
    intermediaryNewRating: Math.round(avgRating * 100) / 100,
    message: 'Thank you for your feedback!',
  };
};

/**
 * Get current farmer's intermediary.
 */
const getMyIntermediary = async (farmerId) => {
  const { IntermediaryAssignment, Intermediary } = getDb();

  const assignment = await IntermediaryAssignment.findOne({
    where: { farmer_id: farmerId, assignment_status: ['active', 'pending_change', 'escalated'], is_active: true },
    include: [{ model: Intermediary, as: 'intermediary' }],
    order: [['assigned_at', 'DESC']],
  });

  if (!assignment) {
    return { hasIntermediary: false, message: 'You have not yet selected a community resource person.' };
  }

  const i = assignment.intermediary;
  return {
    hasIntermediary: true,
    assignmentId: assignment.assignment_uuid,
    status: assignment.assignment_status,
    assignedAt: assignment.assigned_at,
    selectedByFarmer: assignment.selected_by_farmer,
    myRating: assignment.farmer_rating,
    myFeedback: assignment.farmer_feedback,
    intermediary: {
      intermediaryId: i.intermediary_uuid,
      internalId: i.id,
      name: i.name,
      mobile: i.mobile,
      type: i.type,
      typeLabel: getTypeLabel(i.type),
      rating: parseFloat(i.rating || 0),
      yearsOfExperience: i.years_of_experience,
      languagesSpoken: i.languages_spoken || [],
      bio: i.bio,
      profilePhotoUrl: i.profile_photo_url,
    },
  };
};

module.exports = {
  registerIntermediary,
  assignFarmer,
  logFieldVisit,
  getPerformanceDashboard,
  listIntermediaries,
  // Farmer-facing
  getAvailableForFarmer,
  getProfileCard,
  selectIntermediary,
  requestChange,
  escalate,
  rateFeedback,
  getMyIntermediary,
};
