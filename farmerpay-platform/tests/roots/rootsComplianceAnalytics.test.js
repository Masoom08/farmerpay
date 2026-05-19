/**
 * Unit Tests — ROOTS Compliance Analytics (Banker Portfolio)
 */

jest.mock('../../src/shared/models', () => ({
  sequelize: { query: jest.fn(), literal: jest.fn((s) => s) },
  Sequelize: { Op: require('sequelize').Op },
  RootsComplianceSnapshot: { count: jest.fn() },
  RootsRedFlag: { findAndCountAll: jest.fn(), findOne: jest.fn() },
  SoilHealthRecord: { count: jest.fn() },
  User: {},
  LoanApplication: {},
}));

jest.mock('../../src/shared/utils/logger', () => ({
  info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn(),
}));

jest.mock('../../src/shared/utils/paginationHelper', () => ({
  parsePagination: jest.fn((q) => ({ page: q.page || 1, pageSize: q.limit || 25 })),
  buildMeta: jest.fn((total, page, pageSize) => ({ total, page, pageSize })),
}));

const db = require('../../src/shared/models');
const analytics = require('../../src/modules/banker/services/rootsComplianceAnalytics');

describe('rootsComplianceAnalytics', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getRootsPortfolioCompliance', () => {
    it('should classify farmers into compliance bands', async () => {
      db.sequelize.query.mockResolvedValue([[
        { farmer_id: 1, overall_compliance_score: 90, data_completeness_pct: 80, field_id: 10, crop_name: 'Paddy' },
        { farmer_id: 2, overall_compliance_score: 70, data_completeness_pct: 75, field_id: 11, crop_name: 'Wheat' },
        { farmer_id: 3, overall_compliance_score: 45, data_completeness_pct: 60, field_id: 12, crop_name: 'Paddy' },
        { farmer_id: 4, overall_compliance_score: null, data_completeness_pct: 20, field_id: null, crop_name: null },
      ]]);
      db.SoilHealthRecord.count.mockResolvedValue(2);

      const result = await analytics.getRootsPortfolioCompliance({});

      expect(result.summary.totalFarmers).toBe(4);
      expect(result.summary.highCompliance).toBe(1);     // score >= 80
      expect(result.summary.moderateCompliance).toBe(1);  // 60-80
      expect(result.summary.lowCompliance).toBe(1);       // < 60
      expect(result.summary.insufficientData).toBe(1);    // < 40% completeness
      expect(result.summary.avgScore).toBeGreaterThan(0);
      expect(result.summary.soilHealthCardPct).toBe(50);  // 2/4
    });

    it('should group by crop in breakdown', async () => {
      db.sequelize.query.mockResolvedValue([[
        { farmer_id: 1, overall_compliance_score: 85, data_completeness_pct: 90, field_id: 10, crop_name: 'Paddy' },
        { farmer_id: 2, overall_compliance_score: 75, data_completeness_pct: 85, field_id: 11, crop_name: 'Paddy' },
        { farmer_id: 3, overall_compliance_score: 60, data_completeness_pct: 70, field_id: 12, crop_name: 'Wheat' },
      ]]);
      db.SoilHealthRecord.count.mockResolvedValue(0);

      const result = await analytics.getRootsPortfolioCompliance({});

      expect(result.cropBreakdown.length).toBe(2);
      const paddy = result.cropBreakdown.find((c) => c.crop === 'Paddy');
      expect(paddy.farmerCount).toBe(2);
      expect(paddy.avgScore).toBe(80); // (85+75)/2
    });

    it('should handle empty portfolio', async () => {
      db.sequelize.query.mockResolvedValue([[]]);
      db.SoilHealthRecord.count.mockResolvedValue(0);

      const result = await analytics.getRootsPortfolioCompliance({});

      expect(result.summary.totalFarmers).toBe(0);
      expect(result.summary.avgScore).toBeNull();
    });

    it('should filter by season', async () => {
      db.sequelize.query.mockResolvedValue([[]]);
      db.SoilHealthRecord.count.mockResolvedValue(0);

      await analytics.getRootsPortfolioCompliance({ season: 'kharif_2026' });

      const queryCall = db.sequelize.query.mock.calls[0];
      expect(queryCall[0]).toContain(':season');
      expect(queryCall[1].replacements.season).toBe('kharif_2026');
    });
  });

  describe('getRootsRedFlags', () => {
    it('should return paginated flags with severity summary', async () => {
      db.RootsRedFlag.findAndCountAll.mockResolvedValue({
        count: 3,
        rows: [
          { uuid: 'f-1', id: 1, farmer_id: 42, farmer: { first_name: 'Raju', last_name: 'Kumar', mobile: '9876543210' }, activity_type: 'CROP', flag_type: 'COST_ANOMALY', severity: 'HIGH', status: 'OPEN', description: 'High cost', loan_application_id: null, created_at: new Date() },
          { uuid: 'f-2', id: 2, farmer_id: 43, farmer: { first_name: 'Sita', last_name: 'Devi', mobile: '9876543211' }, activity_type: 'CROP', flag_type: 'NO_DATA_ENTRY', severity: 'CRITICAL', status: 'OPEN', description: 'No data', loan_application_id: 10, created_at: new Date() },
        ],
      });
      db.sequelize.query.mockResolvedValue([[
        { severity: 'CRITICAL', cnt: 1 },
        { severity: 'HIGH', cnt: 2 },
      ]]);

      const result = await analytics.getRootsRedFlags({}, { page: 1, pageSize: 25 });

      expect(result.flags).toHaveLength(2);
      expect(result.flags[0].farmerName).toBe('Raju Kumar');
      expect(result.summary.critical).toBe(1);
      expect(result.summary.high).toBe(2);
      expect(result.meta.total).toBe(3);
    });

    it('should filter by severity', async () => {
      db.RootsRedFlag.findAndCountAll.mockResolvedValue({ count: 0, rows: [] });
      db.sequelize.query.mockResolvedValue([[]]);

      await analytics.getRootsRedFlags({ severity: 'CRITICAL' }, { page: 1, pageSize: 25 });

      const whereArg = db.RootsRedFlag.findAndCountAll.mock.calls[0][0].where;
      expect(whereArg.severity).toBe('CRITICAL');
    });
  });

  describe('getRootsVsRepayment', () => {
    it('should return correlation data', async () => {
      db.sequelize.query.mockResolvedValue([[
        { compliance_band: 'high', total_loans: 50, on_time_count: 45 },
        { compliance_band: 'low', total_loans: 30, on_time_count: 12 },
      ]]);

      const result = await analytics.getRootsVsRepayment();

      expect(result.correlation.high_repayment_rate).toBe(90);
      expect(result.correlation.low_repayment_rate).toBe(40);
    });
  });

  describe('getBranchCompliance', () => {
    it('should return branch aggregates', async () => {
      db.sequelize.query.mockResolvedValue([[
        { branch: 'Raipur', farmer_count: 25, avg_score: 78.5, red_flag_count: 3 },
        { branch: 'Bilaspur', farmer_count: 18, avg_score: 65.2, red_flag_count: 7 },
      ]]);

      const result = await analytics.getBranchCompliance();

      expect(result.branches).toHaveLength(2);
      expect(result.branches[0].branch).toBe('Raipur');
      expect(result.branches[0].avgScore).toBe(78.5);
      expect(result.branches[1].redFlagCount).toBe(7);
    });
  });

  describe('acknowledgeRedFlag', () => {
    it('should update flag status to ACKNOWLEDGED', async () => {
      const mockFlag = { uuid: 'f-1', update: jest.fn().mockResolvedValue(true) };
      db.RootsRedFlag.findOne.mockResolvedValue(mockFlag);

      const result = await analytics.acknowledgeRedFlag('f-1', 99);

      expect(mockFlag.update).toHaveBeenCalledWith(expect.objectContaining({
        status: 'ACKNOWLEDGED',
        acknowledged_by: 99,
      }));
      expect(result.status).toBe('ACKNOWLEDGED');
    });

    it('should throw 404 for missing flag', async () => {
      db.RootsRedFlag.findOne.mockResolvedValue(null);

      await expect(analytics.acknowledgeRedFlag('nonexistent', 99))
        .rejects.toThrow('Red flag not found');
    });
  });
});
