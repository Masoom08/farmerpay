/**
 * Loan Document Upload Controller
 *
 * Handles real document uploads for loan applications. Files land on
 * disk under /uploads/loan-docs/{applicationId}/{type}.{ext}, and a
 * corresponding loan_application_documents row is created so the
 * banker dashboard + LOS can see what's been captured.
 *
 * The path is reconstructable from (application_id, document_type)
 * which avoids needing a new column on the existing model.
 *
 * Storage:
 *   - Multer disk storage (already a dependency)
 *   - 5 MB per file cap (mobile JPEG / PDF — well within range)
 *   - Allowed types: image/jpeg, image/png, application/pdf
 *
 * Auth: Tier-1 (the farmer must own the application). The
 * application's farmer_id is checked against the resolved user.
 */

const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { success } = require('../../../shared/utils/responseHelper');
const logger = require('../../../shared/utils/logger');
const { User, LoanApplication, LoanApplicationDocument } = require('../../../shared/models');

// ─── Storage setup ────────────────────────────────────────────────

const UPLOAD_ROOT = path.join(__dirname, '../../../../uploads/loan-docs');

// Make sure the upload root exists at boot time so the first request
// doesn't have to bootstrap the directory.
try {
  fs.mkdirSync(UPLOAD_ROOT, { recursive: true });
} catch (e) {
  logger.warn(`Could not create upload root ${UPLOAD_ROOT}: ${e.message}`);
}

// Multer memory storage — we write to disk manually in the controller so
// the filename can use req.body.documentType which is only available AFTER
// multer has parsed the multipart body. Disk storage's filename function
// runs BEFORE body fields are populated when the file field is uploaded
// before the body field, which would write everything as "other.jpg".
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowed = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
  if (allowed.includes(file.mimetype)) return cb(null, true);
  cb(new Error(`Unsupported file type: ${file.mimetype}`));
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
});

// Single-file middleware bound to field name "file"
const uploadMiddleware = upload.single('file');

// ─── Helpers ──────────────────────────────────────────────────────

const resolveUser = async (req) => {
  const user = await User.findOne({ where: { user_id: req.user.id, is_active: true } });
  if (!user) {
    const err = new Error('User not found');
    err.statusCode = 404;
    throw err;
  }
  return user;
};

// ─── Controllers ──────────────────────────────────────────────────

/**
 * POST /dice/applications/:applicationId/documents
 *
 * Multipart upload — field `file` carries the image/PDF, body field
 * `documentType` carries the enum value (kyc_aadhaar / land_document /
 * bank_statement / income_proof / collateral_proof / other).
 */
const uploadDocument = async (req, res, next) => {
  try {
    const user = await resolveUser(req);
    const applicationId = parseInt(req.params.applicationId, 10);

    const application = await LoanApplication.findOne({
      where: { id: applicationId, farmer_id: user.id, is_active: true },
    });
    if (!application) {
      const err = new Error('Application not found or not yours');
      err.statusCode = 404;
      throw err;
    }

    if (!req.file) {
      const err = new Error('No file uploaded');
      err.statusCode = 400;
      throw err;
    }

    const documentType = req.body?.documentType || 'other';
    const validTypes = [
      'kyc_aadhaar',
      'land_document',
      'bank_statement',
      'income_proof',
      'collateral_proof',
      'other',
    ];
    if (!validTypes.includes(documentType)) {
      const err = new Error(`Invalid documentType: ${documentType}`);
      err.statusCode = 400;
      throw err;
    }

    // Write the buffer to disk now that we know the documentType.
    // Path: /uploads/loan-docs/{applicationId}/{type}.{ext}
    // Re-uploads overwrite the previous file (idempotent capture).
    const dest = path.join(UPLOAD_ROOT, String(applicationId));
    fs.mkdirSync(dest, { recursive: true });
    const ext = (() => {
      const m = req.file.mimetype || '';
      if (m === 'image/png') return '.png';
      if (m === 'image/webp') return '.webp';
      if (m === 'application/pdf') return '.pdf';
      return '.jpg';
    })();
    const filename = `${documentType.replace(/[^a-z_]/gi, '')}${ext}`;
    const filepath = path.join(dest, filename);
    fs.writeFileSync(filepath, req.file.buffer);
    // Stamp filename onto req.file so the response below can return it
    req.file.filename = filename;

    // Upsert: if a row already exists for this (application, type) pair,
    // update it; otherwise insert a new one. Disk file already overwrote
    // any previous upload because we use a deterministic filename.
    const [docRow] = await LoanApplicationDocument.findOrCreate({
      where: {
        application_id: applicationId,
        document_type: documentType,
        is_active: true,
      },
      defaults: {
        application_id: applicationId,
        document_type: documentType,
        is_mandatory: ['kyc_aadhaar', 'land_document', 'bank_statement'].includes(documentType),
        verified: false,
      },
    });

    logger.info(
      `Loan doc uploaded: app ${applicationId}, type ${documentType}, file ${req.file.filename}, size ${req.file.size}`,
    );

    return success(res, {
      message: 'Document uploaded',
      data: {
        documentRowId: docRow.id,
        applicationId,
        documentType,
        fileName: req.file.filename,
        sizeBytes: req.file.size,
      },
      statusCode: 201,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /dice/applications/:applicationId/documents
 * Lists what's been uploaded for an application (read-back for the wizard).
 */
const listDocuments = async (req, res, next) => {
  try {
    const user = await resolveUser(req);
    const applicationId = parseInt(req.params.applicationId, 10);
    const application = await LoanApplication.findOne({
      where: { id: applicationId, farmer_id: user.id, is_active: true },
    });
    if (!application) {
      const err = new Error('Application not found');
      err.statusCode = 404;
      throw err;
    }
    const docs = await LoanApplicationDocument.findAll({
      where: { application_id: applicationId, is_active: true },
      order: [['created_at', 'ASC']],
    });
    return success(res, {
      message: 'Documents retrieved',
      data: docs.map((d) => ({
        documentRowId: d.id,
        documentType: d.document_type,
        isMandatory: d.is_mandatory,
        verified: d.verified,
        uploadedAt: d.created_at,
      })),
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  uploadMiddleware,
  uploadDocument,
  listDocuments,
};
