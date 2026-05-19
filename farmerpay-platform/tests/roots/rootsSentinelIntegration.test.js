/**
 * Unit Tests — ROOTS → SENTINEL Integration
 *
 * Tests ROOTS red flag signals in health scoring and EWS alert generation.
 */

jest.mock('../../src/shared/models', () => ({
  sequelize: {},
  Sequelize: { Op: require('sequelize').Op },
  LoanApplication: { findAll: jest.fn() },
  LoanHealthSnapshot: { findOne: jest.fn() },
  WorkbandExecution: { findOne: jest.fn() },
  CultivationCycle: { findOne: jest.fn() },
  RootsComplianceSnapshot: { findOne: jest.fn(), findAll: jest.fn() },
  RootsRedFlag: { findAll: jest.fn() },
  RootsLoanUtilizationTracking: { findOne: jest.fn() },
  RedFlagEvent: { create: jest.fn().mockResolvedValue({ id: 1 }) },
  EwsSignal: { create: jest.fn().mockResolvedValue({ id: 1 }) },
  EwsAlert: { create: jest.fn().mockResolvedValue({ id: 1, alert_uuid: 'alert-001', alert_priority: 1 }), findAll: jest.fn() },
  RssScoreHistory: { findOne: jest.fn() },
}));

jest.mock('../../src/shared/utils/logger', () => ({
  info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn(),
}));

jest.mock('../../src/shared/utils/uuidHelper', () => ({
  generateUUID: jest.fn().mockReturnValue('test-uuid'),
}));

const db = require('../../src/shared/models');

// We test detectRedFlags from healthScoringService
const healthService = require('../../src/modules/sentinel/services/healthScoringService');

describe('ROOTS → SENTINEL Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default: one active disbursed loan
    db.LoanApplication.findAll.mockResolvedValue([
      { id: 10, farmer_id: 42, application_status: 'disbursed', end_use_purpose: 'crop', psl_classification: 'agriculture', diversion_flag: false },
    ]);
    db.LoanHealthSnapshot.findOne.mockResolvedValue({
      days_overdue: 0, consecutive_missed_emis: 0,
    });
    // Default ROOTS: healthy farmer
    db.WorkbandExecution.findOne.mockResolvedValue({ id: 1 }); // recent activity
    db.CultivationCycle.findOne.mockResolvedValue({ cycle_uuid: 'c-001' });
    db.RootsComplianceSnapshot.findOne.mockResolvedValue(null);
    db.RootsRedFlag.findAll.mockResolvedValue([]);
    db.RootsLoanUtilizationTracking.findOne.mockResolvedValue(null);
  });

  describe('detectRedFlags — ROOTS compliance signals', () => {
    it('should detect roots_compliance_low when score < 50', async () => {
      db.RootsComplianceSnapshot.findOne.mockResolvedValue({
        overall_compliance_score: 35, data_completeness_pct: 75,
      });

      const flags = await healthService.detectRedFlags(42);

      const compFlag = flags.find((f) => f.flagType === 'roots_compliance_low');
      expect(compFlag).toBeDefined();
      expect(compFlag.severity).toBe('medium'); // 30-50 = medium, <30 = high
    });

    it('should detect roots_critical_stage_missed from ROOTS red flags', async () => {
      db.RootsRedFlag.findAll.mockResolvedValue([
        { flag_type: 'CRITICAL_STAGE_MISSED', severity: 'HIGH' },
      ]);

      const flags = await healthService.detectRedFlags(42);

      const missedFlag = flags.find((f) => f.flagType === 'roots_critical_stage_missed');
      expect(missedFlag).toBeDefined();
      expect(missedFlag.severity).toBe('high');
    });

    it('should detect roots_cost_anomaly from ROOTS red flags', async () => {
      db.RootsRedFlag.findAll.mockResolvedValue([
        { flag_type: 'COST_ANOMALY', severity: 'MEDIUM' },
      ]);

      const flags = await healthService.detectRedFlags(42);

      const costFlag = flags.find((f) => f.flagType === 'roots_cost_anomaly');
      expect(costFlag).toBeDefined();
      expect(costFlag.severity).toBe('medium');
    });

    it('should detect roots_loan_utilization_poor when quality is SUSPICIOUS', async () => {
      db.RootsLoanUtilizationTracking.findOne.mockResolvedValue({
        utilization_quality: 'SUSPICIOUS', utilization_ratio: 0.1,
      });

      const flags = await healthService.detectRedFlags(42);

      const utilFlag = flags.find((f) => f.flagType === 'roots_loan_utilization_poor');
      expect(utilFlag).toBeDefined();
      expect(utilFlag.severity).toBe('high');
    });

    it('should detect roots_sathi_discrepancy from ROOTS red flags', async () => {
      db.RootsRedFlag.findAll.mockResolvedValue([
        { flag_type: 'SATHI_DISCREPANCY', severity: 'HIGH' },
      ]);

      const flags = await healthService.detectRedFlags(42);

      const discFlag = flags.find((f) => f.flagType === 'roots_sathi_discrepancy');
      expect(discFlag).toBeDefined();
      expect(discFlag.severity).toBe('high');
    });

    it('should detect roots_backfill_suspected as low severity', async () => {
      db.RootsRedFlag.findAll.mockResolvedValue([
        { flag_type: 'BACKFILL_SUSPECTED', severity: 'MEDIUM' },
      ]);

      const flags = await healthService.detectRedFlags(42);

      const backfillFlag = flags.find((f) => f.flagType === 'roots_backfill_suspected');
      expect(backfillFlag).toBeDefined();
      expect(backfillFlag.severity).toBe('low');
    });

    it('should NOT flag compliance when data completeness < 40%', async () => {
      db.RootsComplianceSnapshot.findOne.mockResolvedValue({
        overall_compliance_score: 25, data_completeness_pct: 30,
      });

      const flags = await healthService.detectRedFlags(42);

      const compFlag = flags.find((f) => f.flagType === 'roots_compliance_low');
      expect(compFlag).toBeUndefined(); // skipped due to low completeness
    });

    it('should detect zero_agri_activity when no recent workband execution', async () => {
      db.WorkbandExecution.findOne.mockResolvedValue(null); // no recent activity

      const flags = await healthService.detectRedFlags(42);

      const zeroFlag = flags.find((f) => f.flagType === 'zero_agri_activity');
      expect(zeroFlag).toBeDefined();
    });

    it('should not duplicate ROOTS flags', async () => {
      db.RootsRedFlag.findAll.mockResolvedValue([
        { flag_type: 'LOAN_UTILIZATION_MISMATCH', severity: 'HIGH' },
      ]);
      db.RootsLoanUtilizationTracking.findOne.mockResolvedValue({
        utilization_quality: 'POOR', utilization_ratio: 0.15,
      });

      const flags = await healthService.detectRedFlags(42);

      const utilFlags = flags.filter((f) => f.flagType === 'roots_loan_utilization_poor');
      expect(utilFlags.length).toBe(1); // deduped
    });

    it('should gracefully handle ROOTS fetch errors', async () => {
      db.RootsComplianceSnapshot.findOne.mockRejectedValue(new Error('DB down'));

      // Should not throw, just skip ROOTS signals
      const flags = await healthService.detectRedFlags(42);
      expect(Array.isArray(flags)).toBe(true);
    });
  });
});
