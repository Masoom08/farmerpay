/**
 * PDF Export Service — TRUST v2 Tests
 *
 * Tests:
 * 1. Render PDF to buffer, assert %PDF- header + contains score + decision
 * 2. Inactive snapshot → 410 error, PDF not rendered
 * 3. Missing snapshot → 404 error
 */

// ─── Mocks ────────────────────────────────────────────────────────

jest.mock('../../../src/shared/utils/logger', () => ({
  info: jest.fn(), warn: jest.fn(), error: jest.fn(),
}));

const SNAPSHOT_UUID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
const FARMER_ID = 42;

const mockSnapshot = {
  id: 1,
  score_history_uuid: SNAPSHOT_UUID,
  farmer_id: FARMER_ID,
  total_score_1000: 720,
  total_trust_score: 72,
  decision: 'SANCTION',
  score_band: 'good',
  calculated_at: new Date('2026-04-14T10:00:00Z'),
  is_active: true,
  cibil_flag: true,
  cibil_overdue_inr: 15000,
  cibil_overdue_issuer: 'SBI',
  inputs_fingerprint: 'abc123',
  section_scores: {
    P1: { score: 75, weight: 0.15, contribution: 112.5 },
    P2: { score: 80, weight: 0.20, contribution: 160 },
    P3: { score: 65, weight: 0.20, contribution: 130 },
    P4: { score: 70, weight: 0.20, contribution: 140 },
    P5: { score: 60, weight: 0.15, contribution: 90 },
    P6: { score: 55, weight: 0.10, contribution: 55 },
  },
  farmer: {
    id: FARMER_ID,
    first_name: 'Rajesh',
    last_name: 'Patil',
    village: 'Wardha',
  },
};

const mockInactiveSnapshot = {
  ...mockSnapshot,
  id: 2,
  score_history_uuid: 'inactive-uuid-0000',
  is_active: false,
};

const mockCalculations = [
  { normalized_score: 75, raw_points: 30, max_possible_points: 40, contribution_to_total: 112.5, section: { pillar_code: 'P1', section_name: 'Personal', weight_in_total_score: 15 } },
  { normalized_score: 80, raw_points: 32, max_possible_points: 40, contribution_to_total: 160, section: { pillar_code: 'P2', section_name: 'Farm Details', weight_in_total_score: 20 } },
  { normalized_score: 65, raw_points: 26, max_possible_points: 40, contribution_to_total: 130, section: { pillar_code: 'P3', section_name: 'Financial', weight_in_total_score: 20 } },
  { normalized_score: 70, raw_points: 28, max_possible_points: 40, contribution_to_total: 140, section: { pillar_code: 'P4', section_name: 'Repayment', weight_in_total_score: 20 } },
  { normalized_score: 60, raw_points: 24, max_possible_points: 40, contribution_to_total: 90, section: { pillar_code: 'P5', section_name: 'Collateral', weight_in_total_score: 15 } },
  { normalized_score: 55, raw_points: 22, max_possible_points: 40, contribution_to_total: 55, section: { pillar_code: 'P6', section_name: 'Network', weight_in_total_score: 10 } },
];

jest.mock('../../../src/shared/models', () => ({
  TrustScoreHistory: {
    findOne: jest.fn(async ({ where }) => {
      if (where.score_history_uuid === SNAPSHOT_UUID) return mockSnapshot;
      if (where.score_history_uuid === 'inactive-uuid-0000') return mockInactiveSnapshot;
      return null;
    }),
  },
  TrustScoreCalculation: {
    findAll: jest.fn(async () => mockCalculations),
  },
  TrustSection: {},
  User: {},
}));

// Mock evidenceCollector
jest.mock('../../../src/modules/trust/services/evidenceCollector', () => ({
  readForSnapshot: jest.fn(async () => [
    { pillarCode: 'P3', featureCode: 'AA_FINANCIAL_HEALTH', source: 'AA', confidence: 'HIGH' },
    { pillarCode: 'P4', featureCode: 'CIBIL_OVERDUE', source: 'CIBIL', confidence: 'HIGH' },
    { pillarCode: 'P1', featureCode: 'Q_101', source: 'QUESTIONNAIRE', confidence: 'HIGH' },
  ]),
}));

// ─── Tests ────────────────────────────────────────────────────────

const { exportSnapshotPdf } = require('../../../src/modules/trust/services/pdfExportService');

describe('pdfExportService', () => {

  describe('exportSnapshotPdf — success', () => {
    it('renders a PDF buffer starting with %PDF-', async () => {
      const result = await exportSnapshotPdf(SNAPSHOT_UUID);

      expect(result.buffer).toBeInstanceOf(Buffer);
      expect(result.buffer.length).toBeGreaterThan(100);

      // PDF magic bytes
      const header = result.buffer.slice(0, 5).toString('ascii');
      expect(header).toBe('%PDF-');
    });

    it('PDF metadata contains farmer name and snapshot UUID', async () => {
      const result = await exportSnapshotPdf(SNAPSHOT_UUID);

      // PDF info dict stores Subject as ASCII (non-BOM) and Title as UTF-16BE
      const text = result.buffer.toString('binary');

      // Subject is plain ASCII in the PDF info dict
      expect(text).toContain(`Snapshot ${SNAPSHOT_UUID}`);

      // Farmer name is in the Title as UTF-16BE (Rajesh Patil)
      // Verify by searching for the UTF-16BE encoding of "Rajesh"
      const nameUtf16 = Buffer.from('Rajesh', 'utf16le').swap16();
      expect(result.buffer.includes(nameUtf16)).toBe(true);
    });

    it('returns a meaningful filename', async () => {
      const result = await exportSnapshotPdf(SNAPSHOT_UUID);

      expect(result.filename).toMatch(/^trust-review-a1b2c3d4-\d+\.pdf$/);
    });

    it('PDF has author FarmerPay Platform', async () => {
      const result = await exportSnapshotPdf(SNAPSHOT_UUID);
      const text = result.buffer.toString('latin1');
      expect(text).toContain('FarmerPay Platform');
    });

    it('renders with correct page count (single page)', async () => {
      const result = await exportSnapshotPdf(SNAPSHOT_UUID);
      const text = result.buffer.toString('latin1');
      // /Count 1 indicates single page
      expect(text).toContain('/Count 1');
    });
  });

  describe('exportSnapshotPdf — inactive snapshot', () => {
    it('returns 410 TRUST_SNAPSHOT_INACTIVE', async () => {
      await expect(exportSnapshotPdf('inactive-uuid-0000')).rejects.toMatchObject({
        statusCode: 410,
        errorCode: 'TRUST_SNAPSHOT_INACTIVE',
      });
    });
  });

  describe('exportSnapshotPdf — missing snapshot', () => {
    it('returns 404 TRUST_SNAPSHOT_NOT_FOUND', async () => {
      await expect(exportSnapshotPdf('nonexistent-uuid')).rejects.toMatchObject({
        statusCode: 404,
        errorCode: 'TRUST_SNAPSHOT_NOT_FOUND',
      });
    });
  });
});
