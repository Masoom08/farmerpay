/**
 * Sathi Service
 * Business logic for farmer consents and field verifications.
 */

const { v4: uuidv4 } = require('uuid');
const logger = require('../../../shared/utils/logger');

let db;
const getDb = () => {
  if (!db) db = require('../../../shared/models');
  return db;
};

// ─── Farmer Consents ────────────────────────────────────────────────

/**
 * Retrieves all consents for a farmer.
 */
const getFarmerConsents = async (farmerId) => {
  const { SathiFarmerConsent } = getDb();

  const consents = await SathiFarmerConsent.findAll({
    where: { farmer_id: farmerId, is_active: true },
    order: [['consent_given_at', 'DESC']],
  });

  return consents.map((c) => ({
    consentType: c.consent_type,
    givenAt: c.consent_given_at,
    revokedAt: c.consent_revoked_at,
  }));
};

/**
 * Records a new farmer consent.
 */
const createFarmerConsent = async (farmerId, agentUserId, data) => {
  const { SathiFarmerConsent, User } = getDb();

  // Verify farmer exists
  const farmer = await User.findOne({ where: { id: farmerId, is_active: true } });
  if (!farmer) {
    const err = new Error('Farmer not found');
    err.statusCode = 404;
    err.errorCode = 'RES_001';
    throw err;
  }

  const consent = await SathiFarmerConsent.create({
    consent_uuid: uuidv4(),
    farmer_id: farmerId,
    consent_type: data.consentType,
    consent_given_at: new Date(),
    consent_given_by_farmer: farmerId,
    consent_verified_by_agent: agentUserId,
    consent_verified_at: new Date(),
  });

  logger.info(`Consent ${data.consentType} recorded for farmer ${farmerId}`);
  return { consentId: consent.id, consentGivenAt: consent.consent_given_at };
};

// ─── Field Verifications ────────────────────────────────────────────

/**
 * Retrieves all field verifications for a farmer.
 */
const getFieldVerifications = async (farmerId) => {
  const { SathiFieldVerification, SathiFieldVisitChecklist } = getDb();

  const verifications = await SathiFieldVerification.findAll({
    where: { farmer_id: farmerId, is_active: true },
    include: [
      { model: SathiFieldVisitChecklist, as: 'checklist', where: { is_active: true }, required: false },
    ],
    order: [['verification_date', 'DESC']],
  });

  return verifications.map((v) => ({
    verificationId: v.id,
    verificationType: v.verification_type,
    verificationDate: v.verification_date,
    verified: v.verification_status === 'verified',
    status: v.verification_status,
    comment: v.verification_comment,
    latitude: v.verified_latitude,
    longitude: v.verified_longitude,
    photoCount: v.photo_count,
    checklist: (v.checklist || []).map((c) => ({
      text: c.checklist_item_text,
      isChecked: c.is_checked,
      isRequired: c.is_required,
    })),
  }));
};

/**
 * Creates a new field verification with checklist items.
 */
const createFieldVerification = async (agentUserId, data) => {
  const { SathiFieldVerification, SathiFieldVisitChecklist, FieldAgentProfile, User } = getDb();

  // Verify agent
  const agentProfile = await FieldAgentProfile.findOne({
    where: { agent_user_id: agentUserId, is_active: true },
  });
  if (!agentProfile) {
    const err = new Error('Agent profile not found');
    err.statusCode = 403;
    err.errorCode = 'AUTH_005';
    throw err;
  }

  // Verify farmer
  const farmer = await User.findOne({ where: { id: data.farmerId, is_active: true } });
  if (!farmer) {
    const err = new Error('Farmer not found');
    err.statusCode = 404;
    err.errorCode = 'RES_001';
    throw err;
  }

  const verificationUuid = uuidv4();
  const verification = await SathiFieldVerification.create({
    verification_uuid: verificationUuid,
    farmer_id: data.farmerId,
    agent_id: agentProfile.id,
    verification_type: data.type,
    verification_date: new Date(),
    verified_latitude: data.latitude,
    verified_longitude: data.longitude,
    verification_status: 'verified',
    photo_count: data.photos ? data.photos.length : 0,
  });

  // Create checklist items if provided
  if (data.checklist && data.checklist.length > 0) {
    const checklistPromises = data.checklist.map((item) =>
      SathiFieldVisitChecklist.create({
        verification_uuid: verificationUuid,
        checklist_item_text: item.text,
        is_checked: item.isChecked || false,
        checked_at: item.isChecked ? new Date() : null,
        is_required: item.isRequired || false,
      })
    );
    await Promise.all(checklistPromises);
  }

  logger.info(`Field verification ${verificationUuid} created for farmer ${data.farmerId}`);
  return { verificationId: verification.id };
};

module.exports = {
  getFarmerConsents,
  createFarmerConsent,
  getFieldVerifications,
  createFieldVerification,
};
