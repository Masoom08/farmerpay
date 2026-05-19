/**
 * Unit Tests — ROOTS × PULSE Integration Service
 */

jest.mock('../../src/shared/models', () => ({
  sequelize: { query: jest.fn() },
  Sequelize: { Op: require('sequelize').Op },
  CultivationCycle: { findByPk: jest.fn() },
  CultivationCycleExpenseSummary: { findOne: jest.fn() },
  HarvestRecord: { findOne: jest.fn() },
  Field: { findByPk: jest.fn() },
  CropMaster: { findOne: jest.fn() },
  PulseCommodity: { findOne: jest.fn() },
  PulsePriceRecord: { findOne: jest.fn() },
  PulsePriceForecast: { findOne: jest.fn() },
  LoanApplication: { findOne: jest.fn() },
  LoanRepaymentSchedule: { findOne: jest.fn() },
  RootsComplianceSnapshot: { findOne: jest.fn() },
  RootsRedFlag: { findAll: jest.fn() },
  TaskExecutionInputLog: {},
  TaskExecutionLaborLog: {},
  TaskExecutionMachineryLog: {},
  WorkbandExecution: {},
  TaskExecution: {},
}));

jest.mock('../../src/shared/utils/logger', () => ({
  info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn(),
}));

const db = require('../../src/shared/models');
const service = require('../../src/modules/pulse/services/rootsPulseIntegrationService');

describe('ROOTS × PULSE Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    db.CultivationCycle.findByPk.mockResolvedValue({
      id: 1, cycle_uuid: 'c-001', farmer_id: 42, self_declared_crop: 'Paddy',
      crop_id: 'rice-001', field_id: 10,
    });
  });

  describe('getBreakEvenPrice', () => {
    it('should compute break-even from expense summary + harvest', async () => {
      db.CultivationCycleExpenseSummary.findOne.mockResolvedValue({
        total_expenses: 15000,
      });
      db.HarvestRecord.findOne.mockResolvedValue({ total_harvest_quantity_kg: 1000 });
      db.Field.findByPk.mockResolvedValue({ field_size_hectares: 0.5 });

      const result = await service.getBreakEvenPrice(42, 1);

      expect(result.breakEvenPrice).toBe(15); // 15000/1000
      expect(result.totalCost).toBe(15000);
      expect(result.totalYieldKg).toBe(1000);
      expect(result.costPerAcre).toBeGreaterThan(0);
    });

    it('should fall back to raw log computation when no summary', async () => {
      db.CultivationCycleExpenseSummary.findOne.mockResolvedValue(null);
      db.sequelize.query.mockResolvedValue([
        [{ input_cost: 8000, labor_cost: 4000, machinery_cost: 3000 }],
      ]);
      db.HarvestRecord.findOne.mockResolvedValue({ total_harvest_quantity_kg: 500 });
      db.Field.findByPk.mockResolvedValue(null);

      const result = await service.getBreakEvenPrice(42, 1);

      expect(result.totalCost).toBe(15000);
      expect(result.breakEvenPrice).toBe(30);
    });

    it('should return null break-even when no harvest', async () => {
      db.CultivationCycleExpenseSummary.findOne.mockResolvedValue({ total_expenses: 10000 });
      db.HarvestRecord.findOne.mockResolvedValue(null);
      db.Field.findByPk.mockResolvedValue(null);

      const result = await service.getBreakEvenPrice(42, 1);

      expect(result.breakEvenPrice).toBeNull();
      expect(result.totalYieldKg).toBe(0);
    });

    it('should throw 404 for wrong farmer', async () => {
      db.CultivationCycle.findByPk.mockResolvedValue({ id: 1, farmer_id: 99 });

      await expect(service.getBreakEvenPrice(42, 1)).rejects.toThrow('Cycle not found');
    });
  });

  describe('getPersonalizedSellRecommendation', () => {
    beforeEach(() => {
      db.CultivationCycleExpenseSummary.findOne.mockResolvedValue({ total_expenses: 15000 });
      db.HarvestRecord.findOne.mockResolvedValue({ total_harvest_quantity_kg: 1000 });
      db.Field.findByPk.mockResolvedValue({ field_size_hectares: 0.5 });
      db.CropMaster.findOne.mockResolvedValue({ crop_name: 'Rice' });
      db.PulseCommodity.findOne.mockResolvedValue({ id: 5 });
    });

    it('should recommend SELL_NOW when margin is good', async () => {
      db.PulsePriceRecord.findOne.mockResolvedValue({ modal_price: 25 }); // 25 vs 15 BE = 67%
      db.PulsePriceForecast.findOne.mockResolvedValue({ predicted_price: 26 }); // only 4% rise
      db.LoanApplication.findOne.mockResolvedValue(null);

      const result = await service.getPersonalizedSellRecommendation(42, 1);

      expect(result.recommendationType).toBe('SELL_NOW');
      expect(result.profitMarginPct).toBeGreaterThan(30);
      expect(result.breakEvenPrice).toBe(15);
      expect(result.currentPrice).toBe(25);
    });

    it('should recommend SPLIT when forecast shows >10% rise', async () => {
      db.PulsePriceRecord.findOne.mockResolvedValue({ modal_price: 22 }); // 47% margin
      db.PulsePriceForecast.findOne.mockResolvedValue({ predicted_price: 28 }); // 27% forecast rise
      db.LoanApplication.findOne.mockResolvedValue(null);

      const result = await service.getPersonalizedSellRecommendation(42, 1);

      expect(result.recommendationType).toBe('SPLIT');
      expect(result.suggestedSellQty).toBeGreaterThan(0);
      expect(result.suggestedStoreQty).toBeGreaterThan(0);
    });

    it('should recommend SELL_FOR_EMI when EMI is urgent', async () => {
      db.PulsePriceRecord.findOne.mockResolvedValue({ modal_price: 18 }); // 20% margin
      db.PulsePriceForecast.findOne.mockResolvedValue({ predicted_price: 20 });
      db.LoanApplication.findOne.mockResolvedValue({
        id: 10, application_status: 'disbursed',
      });
      const tenDaysFromNow = new Date(Date.now() + 10 * 86400000).toISOString().slice(0, 10);
      db.LoanRepaymentSchedule.findOne.mockResolvedValue({
        due_date: tenDaysFromNow, emi_amount: 5000,
      });

      const result = await service.getPersonalizedSellRecommendation(42, 1);

      expect(result.recommendationType).toBe('SELL_FOR_EMI');
      expect(result.emiAmount).toBe(5000);
      expect(result.suggestedSellQty).toBeGreaterThan(0);
    });

    it('should recommend STORE when below break-even but forecast positive', async () => {
      db.PulsePriceRecord.findOne.mockResolvedValue({ modal_price: 12 }); // below 15 BE
      db.PulsePriceForecast.findOne.mockResolvedValue({ predicted_price: 16 }); // 33% rise
      db.LoanApplication.findOne.mockResolvedValue(null);

      const result = await service.getPersonalizedSellRecommendation(42, 1);

      expect(result.recommendationType).toBe('STORE');
      expect(result.profitMarginPct).toBeLessThan(0);
      expect(result.forecastGainPct).toBeGreaterThan(15);
    });

    it('should return INSUFFICIENT_DATA when no harvest', async () => {
      db.HarvestRecord.findOne.mockResolvedValue(null);
      db.PulsePriceRecord.findOne.mockResolvedValue({ modal_price: 20 });
      db.PulsePriceForecast.findOne.mockResolvedValue(null);
      db.LoanApplication.findOne.mockResolvedValue(null);

      const result = await service.getPersonalizedSellRecommendation(42, 1);

      expect(result.recommendationType).toBe('INSUFFICIENT_DATA');
    });
  });

  describe('getYieldAdjustmentFactor', () => {
    it('should return 1.05 for high compliance', async () => {
      db.RootsComplianceSnapshot.findOne.mockResolvedValue({
        overall_compliance_score: 90, timing_compliance_score: 85,
        data_completeness_pct: 95, missed_stages: 0,
      });
      db.RootsRedFlag.findAll.mockResolvedValue([]);

      const result = await service.getYieldAdjustmentFactor(42, 1);

      expect(result.factor).toBe(1.05);
      expect(result.reasons).toEqual(expect.arrayContaining([
        expect.stringContaining('High compliance'),
      ]));
    });

    it('should apply multiple penalties for low compliance', async () => {
      db.RootsComplianceSnapshot.findOne.mockResolvedValue({
        overall_compliance_score: 40, timing_compliance_score: 35,
        data_completeness_pct: 60, missed_stages: 2,
      });
      db.RootsRedFlag.findAll.mockResolvedValue([]);

      const result = await service.getYieldAdjustmentFactor(42, 1);

      // 0.70 (low compliance) × 0.92 (late timing) × 0.88 (missed stages)
      expect(result.factor).toBeLessThan(0.60);
      expect(result.reasons.length).toBeGreaterThanOrEqual(3);
    });

    it('should apply pest penalty from red flags', async () => {
      db.RootsComplianceSnapshot.findOne.mockResolvedValue({
        overall_compliance_score: 80, timing_compliance_score: 85,
        data_completeness_pct: 90, missed_stages: 0,
      });
      db.RootsRedFlag.findAll.mockResolvedValue([
        { flag_type: 'DISTRESS_SIGNAL' },
      ]);

      const result = await service.getYieldAdjustmentFactor(42, 1);

      // 1.0 (good compliance) × 0.90 (pest)
      expect(result.factor).toBeLessThanOrEqual(0.95);
      expect(result.reasons).toEqual(expect.arrayContaining([
        expect.stringContaining('Pest/disease'),
      ]));
    });

    it('should return factor 1.0 with empty reasons when no data', async () => {
      db.RootsComplianceSnapshot.findOne.mockResolvedValue(null);
      db.RootsRedFlag.findAll.mockResolvedValue([]);

      const result = await service.getYieldAdjustmentFactor(42, 1);

      expect(result.factor).toBe(1);
      expect(result.complianceScore).toBeNull();
    });
  });
});
