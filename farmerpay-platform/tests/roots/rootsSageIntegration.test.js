/**
 * Unit Tests — ROOTS → SAGE Advisory Integration
 *
 * Tests variance-based advisory generation with soil context,
 * personalization depth, and deduplication.
 */

const mockChannel = { publish: jest.fn() };

jest.mock('../../src/shared/models', () => ({
  sequelize: {},
  Sequelize: { Op: require('sequelize').Op },
  CultivationCycle: { findAll: jest.fn() },
  RootsComplianceSnapshot: { findAll: jest.fn(), findOne: jest.fn() },
  SoilHealthRecord: { findOne: jest.fn() },
  SageAdvisory: { findOne: jest.fn(), create: jest.fn() },
  SageAdvisoryType: { findOne: jest.fn() },
  // Stubs for the rest of cropAdvisoryEngine (not used in variance path)
  PopWorkbandTrigger: {},
  PopWorkbandPestSusceptibility: {},
  WeatherObservation: {},
  RegionalPestAlert: {},
  GoogleFieldObservation: {},
  CropMaster: {},
  Field: {},
  FarmRegister: {},
  PopWorkband: {},
}));

jest.mock('../../src/shared/utils/logger', () => ({
  info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn(),
}));

jest.mock('../../src/shared/utils/uuidHelper', () => ({
  generateUUID: jest.fn().mockReturnValue('test-uuid'),
}));

jest.mock('uuid', () => ({
  v4: jest.fn().mockReturnValue('test-uuid-v4'),
}));

jest.mock('../../src/config/rabbitmq', () => ({
  getChannel: jest.fn().mockResolvedValue(mockChannel),
}));

jest.mock('../../src/config', () => ({
  rabbitmq: { exchange: 'farmerpay_exchange' },
}));

const db = require('../../src/shared/models');
const { generateVarianceBasedAdvisories } = require('../../src/modules/sage/services/cropAdvisoryEngine');

describe('ROOTS → SAGE Advisory Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockChannel.publish.mockClear();

    db.SageAdvisoryType.findOne.mockResolvedValue({ id: 1 });
    db.SageAdvisory.findOne.mockResolvedValue(null); // no dedup hit
    db.SageAdvisory.create.mockImplementation(async (data) => ({ id: Date.now(), ...data }));
    db.SoilHealthRecord.findOne.mockResolvedValue(null);
  });

  const mkCycle = (id, crop) => ({
    id, cycle_uuid: `c-${id}`, farmer_id: 42, self_declared_crop: crop,
    crop_id: crop, field_id: 10, cycle_status: 'growing',
  });

  const mkSnapshot = (overrides = {}) => ({
    overall_compliance_score: 70,
    timing_compliance_score: 75,
    quantity_compliance_score: 70,
    cost_compliance_score: 80,
    practice_compliance_score: 65,
    data_completeness_pct: 85,
    missed_stages: 0,
    delayed_stages: 0,
    cost_variance_pct: 5,
    season: 'kharif_2025',
    ...overrides,
  });

  it('should generate timing variance advisory when stages are delayed', async () => {
    db.CultivationCycle.findAll.mockResolvedValue([mkCycle(1, 'Paddy')]);
    db.RootsComplianceSnapshot.findAll.mockResolvedValue([mkSnapshot({ season: 'kharif_2025' })]);
    db.RootsComplianceSnapshot.findOne.mockResolvedValue(mkSnapshot({
      timing_compliance_score: 40, delayed_stages: 3,
    }));

    const result = await generateVarianceBasedAdvisories(42);

    expect(result.emitted).toBeGreaterThan(0);
    const timingAdv = result.advisories.find((a) => a.type === 'timing_variance');
    expect(timingAdv).toBeDefined();
    expect(timingAdv.priority).toBe('high');
  });

  it('should generate practice advisory when adherence is low', async () => {
    db.CultivationCycle.findAll.mockResolvedValue([mkCycle(1, 'Paddy')]);
    db.RootsComplianceSnapshot.findAll.mockResolvedValue([mkSnapshot()]);
    db.RootsComplianceSnapshot.findOne.mockResolvedValue(mkSnapshot({
      practice_compliance_score: 35,
    }));

    const result = await generateVarianceBasedAdvisories(42);

    const practiceAdv = result.advisories.find((a) => a.type === 'practice_variance');
    expect(practiceAdv).toBeDefined();
    expect(practiceAdv.priority).toBe('medium');
  });

  it('should generate CRITICAL advisory for low soil N + under-application', async () => {
    db.CultivationCycle.findAll.mockResolvedValue([mkCycle(1, 'Paddy')]);
    db.RootsComplianceSnapshot.findAll.mockResolvedValue([mkSnapshot()]);
    db.RootsComplianceSnapshot.findOne.mockResolvedValue(mkSnapshot({
      quantity_compliance_score: 40,
    }));
    db.SoilHealthRecord.findOne.mockResolvedValue({
      nitrogen_kg_per_hectare: 180, phosphorus_kg_per_hectare: 20,
      potassium_kg_per_hectare: 200,
    });

    const result = await generateVarianceBasedAdvisories(42);

    const soilAdv = result.advisories.find((a) => a.type === 'soil_qty_critical');
    expect(soilAdv).toBeDefined();
    expect(soilAdv.priority).toBe('critical');
    expect(soilAdv.channel).toBe('push');
  });

  it('should generate advisory for missed stages', async () => {
    db.CultivationCycle.findAll.mockResolvedValue([mkCycle(1, 'Wheat')]);
    db.RootsComplianceSnapshot.findAll.mockResolvedValue([mkSnapshot()]);
    db.RootsComplianceSnapshot.findOne.mockResolvedValue(mkSnapshot({
      missed_stages: 2,
    }));

    const result = await generateVarianceBasedAdvisories(42);

    const missedAdv = result.advisories.find((a) => a.type === 'missed_stages');
    expect(missedAdv).toBeDefined();
    expect(missedAdv.priority).toBe('high');
  });

  it('should generate over-application advisory for high soil K', async () => {
    db.CultivationCycle.findAll.mockResolvedValue([mkCycle(1, 'Paddy')]);
    db.RootsComplianceSnapshot.findAll.mockResolvedValue([mkSnapshot()]);
    db.RootsComplianceSnapshot.findOne.mockResolvedValue(mkSnapshot({
      quantity_compliance_score: 95,
    }));
    db.SoilHealthRecord.findOne.mockResolvedValue({
      nitrogen_kg_per_hectare: 300, phosphorus_kg_per_hectare: 20,
      potassium_kg_per_hectare: 350,
    });

    const result = await generateVarianceBasedAdvisories(42);

    const overAdv = result.advisories.find((a) => a.type === 'over_application');
    expect(overAdv).toBeDefined();
    expect(overAdv.priority).toBe('low');
  });

  it('should generate season improvement advisory for season 2+ farmers', async () => {
    db.CultivationCycle.findAll.mockResolvedValue([mkCycle(1, 'Paddy')]);
    db.RootsComplianceSnapshot.findAll.mockResolvedValue([
      mkSnapshot({ season: 'kharif_2025', activity_reference_id: 1 }),
      mkSnapshot({ season: 'rabi_2025', activity_reference_id: 2 }),
    ]);
    db.RootsComplianceSnapshot.findOne.mockResolvedValue(mkSnapshot({
      overall_compliance_score: 85,
    }));

    const result = await generateVarianceBasedAdvisories(42);

    const seasonAdv = result.advisories.find((a) => a.type === 'season_improvement');
    expect(seasonAdv).toBeDefined();
  });

  it('should generate pattern advisory for season 3+ with strong timing', async () => {
    db.CultivationCycle.findAll.mockResolvedValue([mkCycle(1, 'Paddy')]);
    db.RootsComplianceSnapshot.findAll.mockResolvedValue([
      mkSnapshot({ season: 'kharif_2024', activity_reference_id: 1 }),
      mkSnapshot({ season: 'rabi_2024', activity_reference_id: 2 }),
      mkSnapshot({ season: 'kharif_2025', activity_reference_id: 3 }),
    ]);
    db.RootsComplianceSnapshot.findOne.mockResolvedValue(mkSnapshot({
      timing_compliance_score: 90,
    }));

    const result = await generateVarianceBasedAdvisories(42);

    const patternAdv = result.advisories.find((a) => a.type === 'pattern_advisory');
    expect(patternAdv).toBeDefined();
  });

  it('should send push notification for critical/high advisories', async () => {
    db.CultivationCycle.findAll.mockResolvedValue([mkCycle(1, 'Paddy')]);
    db.RootsComplianceSnapshot.findAll.mockResolvedValue([mkSnapshot()]);
    db.RootsComplianceSnapshot.findOne.mockResolvedValue(mkSnapshot({
      timing_compliance_score: 40, delayed_stages: 2,
    }));

    await generateVarianceBasedAdvisories(42);

    const pushCall = mockChannel.publish.mock.calls.find(
      (c) => c[1] === 'notification.push.farmer'
    );
    expect(pushCall).toBeDefined();
    const payload = JSON.parse(pushCall[2].toString());
    expect(payload.type).toBe('sage_variance_advisory');
    expect(payload.farmerId).toBe(42);
  });

  it('should return empty when no active cycles', async () => {
    db.CultivationCycle.findAll.mockResolvedValue([]);

    const result = await generateVarianceBasedAdvisories(42);

    expect(result.emitted).toBe(0);
    expect(result.advisories).toEqual([]);
  });

  it('should skip cycles with <30% data completeness', async () => {
    db.CultivationCycle.findAll.mockResolvedValue([mkCycle(1, 'Paddy')]);
    db.RootsComplianceSnapshot.findAll.mockResolvedValue([mkSnapshot()]);
    db.RootsComplianceSnapshot.findOne.mockResolvedValue(mkSnapshot({
      data_completeness_pct: 20, timing_compliance_score: 10, missed_stages: 5,
    }));

    const result = await generateVarianceBasedAdvisories(42);

    expect(result.emitted).toBe(0);
  });

  it('should generate cost variance advisory when deviation >50%', async () => {
    db.CultivationCycle.findAll.mockResolvedValue([mkCycle(1, 'Paddy')]);
    db.RootsComplianceSnapshot.findAll.mockResolvedValue([mkSnapshot()]);
    db.RootsComplianceSnapshot.findOne.mockResolvedValue(mkSnapshot({
      cost_compliance_score: 30, cost_variance_pct: 75,
    }));

    const result = await generateVarianceBasedAdvisories(42);

    const costAdv = result.advisories.find((a) => a.type === 'cost_variance');
    expect(costAdv).toBeDefined();
    expect(costAdv.priority).toBe('medium');
  });
});
