/**
 * Evidence Service
 * Business logic for evidence bundle retrieval and verification status.
 */

const logger = require('../../../shared/utils/logger');

let db;
const getDb = () => {
  if (!db) db = require('../../../shared/models');
  return db;
};

/**
 * Retrieves an evidence bundle with all its items.
 */
const getEvidenceBundle = async (bundleId) => {
  const { SathiEvidenceBundle, SathiEvidenceItem, DocumentV2, MediaAsset } = getDb();

  const bundle = await SathiEvidenceBundle.findOne({
    where: { id: bundleId, is_active: true },
    include: [
      {
        model: SathiEvidenceItem,
        as: 'items',
        where: { is_active: true },
        required: false,
        include: [
          { model: DocumentV2, as: 'document', required: false },
          { model: MediaAsset, as: 'mediaAsset', required: false },
        ],
      },
    ],
  });

  if (!bundle) {
    const err = new Error('Evidence bundle not found');
    err.statusCode = 404;
    err.errorCode = 'RES_001';
    throw err;
  }

  return {
    bundle: {
      id: bundle.id,
      bundleUuid: bundle.bundle_uuid,
      bundleType: bundle.bundle_type,
      submissionDate: bundle.bundle_submission_date,
      verificationStatus: bundle.bundle_verification_status,
      verificationNotes: bundle.verification_notes,
      verifiedAt: bundle.verified_at,
    },
    items: bundle.items.map((item) => ({
      id: item.id,
      evidenceType: item.evidence_type,
      documentId: item.document_id,
      mediaAssetId: item.media_asset_id,
      gpsLatitude: item.gps_latitude,
      gpsLongitude: item.gps_longitude,
      signatureUrl: item.signature_url,
    })),
    verificationStatus: bundle.bundle_verification_status,
  };
};

module.exports = {
  getEvidenceBundle,
};
