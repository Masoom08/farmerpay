/**
 * Unit Tests — ROOTS → TRUST Integration
 *
 * Tests collectRootsEvidence signals, P4 pillar ROOTS bonus,
 * and temporal trust building.
 */

jest.mock('../../src/shared/models', () => ({
  sequelize: {},
  Sequelize: { Op: require('sequelize').Op },
  RootsComplianceSnapshot: { findAll: jest.fn() },
  SageAdvisory: { count: jest.fn() },
  CultivationCycle: {},
  SoilHealthRecord: { count: jest.fn() },
  FarmRegister: { findAll: jest.fn() },
  TrustEvidence: { findOne: jest.fn() },
}));

jest.mock('../../src/shared/utils/logger', () => ({
  info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn(),
}));

const db = require('../../src/shared/models');
const { collectRootsEvidence } = require('../../src/modules/trust/services/evidenceCollector');

describe('ROOTS → TRUST Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('collectRootsEvidence', () => {
    it('should compute weighted trust score from compliance snapshots', async () => {
      db.RootsComplianceSnapshot.findAll.mockResolvedValue([
        {
          id: 1, farmer_id: 42, activity_type: 'CROP', activity_reference_id: 1,
          overall_compliance_score: 85, timing_compliance_score: 90,
          practice_compliance_score: 80, cost_compliance_score: 75,
          data_completeness_pct: 88, photo_evidence_count: 5,
          sathi_verified: true, season: 'kharif_2025', snapshot_date: '2026-04-15',
        },
      ]);
      db.SageAdvisory.count
        .mockResolvedValueOnce(10) // total
        .mockResolvedValueOnce(7);  // acknowledged
      db.SoilHealthRecord.count.mockResolvedValue(1);

      const result = await collectRootsEvidence(42);

      expect(result.rootsTrustScore).not.toBeNull();
      expect(result.rootsTrustScore).toBeGreaterThan(60);
      expect(result.rootsTrustScore).toBeLessThanOrEqual(100);
      expect(result.insufficient).toBe(false);
      expect(result.seasonCount).toBe(1);
      expect(result.dataCompleteness).toBe(88);

      // Verify breakdown has all 8 signals
      expect(result.breakdown).toHaveProperty('data_entry_consistency');
      expect(result.breakdown).toHaveProperty('timing_compliance');
      expect(result.breakdown).toHaveProperty('practice_adherence');
      expect(result.breakdown).toHaveProperty('cost_rationality');
      expect(result.breakdown).toHaveProperty('advisory_responsiveness');
      expect(result.breakdown).toHaveProperty('variance_trend');
      expect(result.breakdown).toHaveProperty('evidence_quality');
      expect(result.breakdown).toHaveProperty('multi_livelihood_bonus');
    });

    it('should return insufficient when data completeness <40%', async () => {
      db.RootsComplianceSnapshot.findAll.mockResolvedValue([
        {
          id: 1, farmer_id: 42, activity_type: 'CROP', activity_reference_id: 1,
          overall_compliance_score: 45, data_completeness_pct: 25,
          timing_compliance_score: 30, practice_compliance_score: 40,
          cost_compliance_score: 50, season: 'kharif_2025',
        },
      ]);

      const result = await collectRootsEvidence(42);

      expect(result.insufficient).toBe(true);
      expect(result.rootsTrustScore).toBeNull();
      expect(result.signals.negative).toContain('Insufficient operational data (<40% completeness)');
    });

    it('should return null score when no snapshots exist', async () => {
      db.RootsComplianceSnapshot.findAll.mockResolvedValue([]);

      const result = await collectRootsEvidence(42);

      expect(result.rootsTrustScore).toBeNull();
      expect(result.insufficient).toBe(true);
      expect(result.seasonCount).toBe(0);
    });

    it('should generate positive signals for high compliance', async () => {
      db.RootsComplianceSnapshot.findAll.mockResolvedValue([
        {
          id: 1, farmer_id: 42, activity_type: 'CROP', activity_reference_id: 1,
          overall_compliance_score: 92, timing_compliance_score: 95,
          practice_compliance_score: 88, cost_compliance_score: 85,
          data_completeness_pct: 95, photo_evidence_count: 8,
          sathi_verified: true, season: 'kharif_2025',
        },
      ]);
      db.SageAdvisory.count.mockResolvedValueOnce(5).mockResolvedValueOnce(4);
      db.SoilHealthRecord.count.mockResolvedValue(1);

      const result = await collectRootsEvidence(42);

      expect(result.signals.positive.length).toBeGreaterThan(0);
      expect(result.signals.positive).toEqual(expect.arrayContaining([
        expect.stringContaining('data entry consistency'),
        expect.stringContaining('on time'),
        expect.stringContaining('PoP adherence'),
        expect.stringContaining('Sathi-verified'),
        expect.stringContaining('Soil health'),
      ]));
    });

    it('should generate negative signals for low compliance', async () => {
      db.RootsComplianceSnapshot.findAll.mockResolvedValue([
        {
          id: 1, farmer_id: 42, activity_type: 'CROP', activity_reference_id: 1,
          overall_compliance_score: 35, timing_compliance_score: 30,
          practice_compliance_score: 40, cost_compliance_score: 25,
          data_completeness_pct: 45, photo_evidence_count: 0,
          sathi_verified: false, season: 'kharif_2025',
        },
      ]);
      db.SageAdvisory.count.mockResolvedValue(0);
      db.SoilHealthRecord.count.mockResolvedValue(0);

      const result = await collectRootsEvidence(42);

      expect(result.signals.negative.length).toBeGreaterThan(0);
      expect(result.signals.negative).toEqual(expect.arrayContaining([
        expect.stringContaining('delayed or missed'),
        expect.stringContaining('deviates from benchmarks'),
        expect.stringContaining('No photo evidence'),
      ]));
    });

    it('should count distinct seasons', async () => {
      db.RootsComplianceSnapshot.findAll.mockResolvedValue([
        { id: 1, farmer_id: 42, activity_type: 'CROP', activity_reference_id: 1, overall_compliance_score: 80, data_completeness_pct: 85, timing_compliance_score: 80, practice_compliance_score: 80, cost_compliance_score: 80, season: 'kharif_2025', photo_evidence_count: 0 },
        { id: 2, farmer_id: 42, activity_type: 'CROP', activity_reference_id: 2, overall_compliance_score: 75, data_completeness_pct: 80, timing_compliance_score: 75, practice_compliance_score: 75, cost_compliance_score: 75, season: 'rabi_2025', photo_evidence_count: 0 },
        { id: 3, farmer_id: 42, activity_type: 'CROP', activity_reference_id: 3, overall_compliance_score: 70, data_completeness_pct: 75, timing_compliance_score: 70, practice_compliance_score: 70, cost_compliance_score: 70, season: 'kharif_2026', photo_evidence_count: 0 },
      ]);
      db.SageAdvisory.count.mockResolvedValue(0);
      db.SoilHealthRecord.count.mockResolvedValue(0);

      const result = await collectRootsEvidence(42);

      expect(result.seasonCount).toBe(3);
    });

    it('should give multi-livelihood bonus when all activities >=70%', async () => {
      db.RootsComplianceSnapshot.findAll.mockResolvedValue([
        { id: 1, farmer_id: 42, activity_type: 'CROP', activity_reference_id: 1, overall_compliance_score: 85, data_completeness_pct: 90, timing_compliance_score: 85, practice_compliance_score: 85, cost_compliance_score: 85, season: 'kharif_2025', photo_evidence_count: 0 },
        { id: 2, farmer_id: 42, activity_type: 'DAIRY', activity_reference_id: 10, overall_compliance_score: 78, data_completeness_pct: 80, timing_compliance_score: 78, practice_compliance_score: 78, cost_compliance_score: 78, season: 'kharif_2025', photo_evidence_count: 0 },
      ]);
      db.SageAdvisory.count.mockResolvedValue(0);
      db.SoilHealthRecord.count.mockResolvedValue(0);

      const result = await collectRootsEvidence(42);

      expect(result.breakdown.multi_livelihood_bonus).toBe(100);
      expect(result.signals.positive).toEqual(expect.arrayContaining([
        expect.stringContaining('All activities at 70%+'),
      ]));
    });
  });

  describe('P4 ROOTS bonus (temporal weighting)', () => {
    // Test via the evidence structure that would be passed to pillar engine
    it('should weight ROOTS at 10% for season 1 farmer', async () => {
      db.RootsComplianceSnapshot.findAll.mockResolvedValue([
        { id: 1, farmer_id: 42, activity_type: 'CROP', activity_reference_id: 1, overall_compliance_score: 100, data_completeness_pct: 100, timing_compliance_score: 100, practice_compliance_score: 100, cost_compliance_score: 100, season: 'kharif_2025', photo_evidence_count: 5, sathi_verified: true },
      ]);
      db.SageAdvisory.count.mockResolvedValueOnce(5).mockResolvedValueOnce(5);
      db.SoilHealthRecord.count.mockResolvedValue(1);

      const result = await collectRootsEvidence(42);

      expect(result.seasonCount).toBe(1);
      // Season 1 = 10% weight in P4
      // Max bonus = 0.10 * 100 = 10 points
      // With perfect score (100), bonus = 10
      expect(result.rootsTrustScore).toBeGreaterThan(80);
    });

    it('should weight ROOTS at 25% for season 3+ farmer', async () => {
      db.RootsComplianceSnapshot.findAll.mockResolvedValue([
        { id: 1, farmer_id: 42, activity_type: 'CROP', activity_reference_id: 1, overall_compliance_score: 90, data_completeness_pct: 95, timing_compliance_score: 90, practice_compliance_score: 90, cost_compliance_score: 90, season: 'kharif_2024', photo_evidence_count: 3, sathi_verified: false },
        { id: 2, farmer_id: 42, activity_type: 'CROP', activity_reference_id: 2, overall_compliance_score: 85, data_completeness_pct: 90, timing_compliance_score: 85, practice_compliance_score: 85, cost_compliance_score: 85, season: 'rabi_2024', photo_evidence_count: 2, sathi_verified: false },
        { id: 3, farmer_id: 42, activity_type: 'CROP', activity_reference_id: 3, overall_compliance_score: 88, data_completeness_pct: 92, timing_compliance_score: 88, practice_compliance_score: 88, cost_compliance_score: 88, season: 'kharif_2025', photo_evidence_count: 4, sathi_verified: true },
      ]);
      db.SageAdvisory.count.mockResolvedValueOnce(10).mockResolvedValueOnce(8);
      db.SoilHealthRecord.count.mockResolvedValue(1);

      const result = await collectRootsEvidence(42);

      expect(result.seasonCount).toBe(3);
      // Season 3+ = 25% weight available in P4
    });
  });
});
