/**
 * Unit Tests — Goatery Module (models, migration, services)
 */
const { Sequelize, DataTypes } = require('sequelize');
const path = require('path');

/* ── Model definition tests ── */

let sequelize;
let models = {};

beforeAll(() => {
  sequelize = new Sequelize('fake_db', 'fake', 'fake', {
    dialect: 'mysql', logging: false,
    pool: { max: 1, min: 0, idle: 100, acquire: 100 },
  });

  const modelFiles = [
    'GoatHerd', 'GoatAnimal', 'GoatGrowthLog', 'GoatHealthEvent',
    'GoatBreedingEvent', 'GoatFeedLog', 'GoatCostEvent', 'GoatRevenueEvent', 'GoatPopTemplate',
  ];

  modelFiles.forEach((name) => {
    models[name] = require(`../../src/modules/roots/goatery/models/${name}`)(sequelize, DataTypes);
  });
});

afterAll(async () => { await sequelize.close().catch(() => {}); });

describe('Goatery Models', () => {
  it('GoatHerd should have correct table and required fields', () => {
    expect(models.GoatHerd.tableName).toBe('goat_herds');
    const fields = Object.keys(models.GoatHerd.rawAttributes);
    ['uuid', 'farmer_id', 'herd_name', 'herd_type', 'total_animals', 'status'].forEach((f) => expect(fields).toContain(f));
    expect(models.GoatHerd.rawAttributes.herd_type.type.values).toEqual(['STALL_FED', 'GRAZING', 'MIXED']);
  });

  it('GoatAnimal should have individual tracking fields', () => {
    expect(models.GoatAnimal.tableName).toBe('goat_animals');
    const fields = Object.keys(models.GoatAnimal.rawAttributes);
    ['tag_id', 'breed', 'sex', 'dob', 'weight_kg', 'dam_id', 'sire_id', 'purchase_cost', 'status'].forEach((f) => expect(fields).toContain(f));
    expect(models.GoatAnimal.rawAttributes.sex.type.values).toEqual(['MALE', 'FEMALE']);
    expect(models.GoatAnimal.rawAttributes.status.type.values).toEqual(['ACTIVE', 'SOLD', 'DEAD', 'TRANSFERRED']);
  });

  it('GoatBreedingEvent should have lifecycle fields', () => {
    expect(models.GoatBreedingEvent.tableName).toBe('goat_breeding_events');
    const fields = Object.keys(models.GoatBreedingEvent.rawAttributes);
    ['doe_id', 'buck_id', 'service_date', 'service_type', 'expected_kidding_date', 'kid_count', 'kid_details', 'status'].forEach((f) => expect(fields).toContain(f));
    expect(models.GoatBreedingEvent.rawAttributes.service_type.type.values).toEqual(['NATURAL', 'AI']);
    expect(models.GoatBreedingEvent.rawAttributes.status.type.values).toEqual(['SERVICED', 'CONFIRMED', 'KIDDED', 'FAILED']);
  });

  it('GoatGrowthLog should have weight and body condition', () => {
    expect(models.GoatGrowthLog.tableName).toBe('goat_growth_logs');
    expect(models.GoatGrowthLog.rawAttributes.weight_kg).toBeDefined();
    expect(models.GoatGrowthLog.rawAttributes.body_condition_score).toBeDefined();
  });

  it('GoatFeedLog should have feed types including GRAZING', () => {
    expect(models.GoatFeedLog.rawAttributes.feed_type.type.values).toContain('GRAZING');
    expect(models.GoatFeedLog.rawAttributes.grazing_hours).toBeDefined();
  });

  it('GoatPopTemplate should have breed-specific age ranges', () => {
    const fields = Object.keys(models.GoatPopTemplate.rawAttributes);
    ['breed', 'sex', 'age_months_start', 'age_months_end', 'expected_weight_kg', 'deworming_interval_days', 'expected_kidding_rate'].forEach((f) => expect(fields).toContain(f));
  });

  it('All 9 models should have associate methods', () => {
    Object.values(models).forEach((model) => {
      expect(typeof model.associate).toBe('function');
    });
  });
});

/* ── Migration tests ── */

describe('Migration: goatery tables', () => {
  const createMockQI = () => {
    const tables = {};
    return {
      createTable: jest.fn(async (name, cols) => { tables[name] = cols; }),
      dropTable: jest.fn(),
      addIndex: jest.fn(),
      _tables: tables,
    };
  };

  const MockSeq = {
    INTEGER: 'INT', STRING: (n) => `STR(${n})`, DECIMAL: (p, s) => `DEC(${p},${s})`,
    BOOLEAN: 'BOOL', TEXT: 'TEXT', DATE: 'DATE', DATEONLY: 'DATEONLY', JSON: 'JSON',
    ENUM: (...v) => ({ values: v }), literal: (v) => ({ val: v }),
  };

  it('should create 9 tables', async () => {
    const migration = require('../../migrations/20260419000005-create-goatery-tables');
    const qi = createMockQI();
    await migration.up(qi, MockSeq);
    expect(qi.createTable).toHaveBeenCalledTimes(9);
  });

  it('should create 9 indexes', async () => {
    const migration = require('../../migrations/20260419000005-create-goatery-tables');
    const qi = createMockQI();
    await migration.up(qi, MockSeq);
    expect(qi.addIndex).toHaveBeenCalledTimes(9);
  });

  it('should drop all 9 tables in down()', async () => {
    const migration = require('../../migrations/20260419000005-create-goatery-tables');
    const qi = createMockQI();
    await migration.down(qi);
    expect(qi.dropTable).toHaveBeenCalledTimes(9);
    expect(qi.dropTable.mock.calls[8][0]).toBe('goat_herds');
  });
});

/* ── Service smoke tests ── */

jest.mock('../../src/shared/models', () => ({
  sequelize: { transaction: jest.fn().mockResolvedValue({ commit: jest.fn(), rollback: jest.fn() }) },
  Sequelize: { Op: require('sequelize').Op },
  GoatHerd: { create: jest.fn(), findByPk: jest.fn(), findAll: jest.fn() },
  GoatAnimal: { create: jest.fn(), findByPk: jest.fn(), findAll: jest.fn() },
  GoatGrowthLog: { create: jest.fn(), findAll: jest.fn() },
  GoatBreedingEvent: { create: jest.fn(), findByPk: jest.fn(), findAll: jest.fn() },
  GoatCostEvent: { findAll: jest.fn() },
  GoatRevenueEvent: { findAll: jest.fn() },
  GoatPopTemplate: { findOne: jest.fn(), findAll: jest.fn() },
  GoatHealthEvent: { create: jest.fn(), findAll: jest.fn() },
  GoatFeedLog: { create: jest.fn(), findAll: jest.fn() },
  User: { findOne: jest.fn() },
}));

jest.mock('../../src/shared/utils/logger', () => ({ info: jest.fn(), error: jest.fn(), warn: jest.fn() }));
jest.mock('../../src/shared/utils/uuidHelper', () => ({ generateUUID: jest.fn().mockReturnValue('test-uuid') }));

const db2 = require('../../src/shared/models');

describe('Goatery Services', () => {
  beforeEach(() => jest.clearAllMocks());

  it('herdService.createHerd should create and return DTO', async () => {
    db2.GoatHerd.create.mockResolvedValue({
      id: 1, uuid: 'test-uuid', farmer_id: 42, herd_name: 'My Goats',
      herd_type: 'MIXED', primary_breed: 'Black Bengal', total_animals: 0,
      status: 'ACTIVE', created_at: new Date(),
    });

    const herdService = require('../../src/modules/roots/goatery/services/herdService');
    const result = await herdService.createHerd(42, { herdName: 'My Goats', herdType: 'MIXED', primaryBreed: 'Black Bengal' });

    expect(result.herdId).toBe(1);
    expect(result.herdName).toBe('My Goats');
    expect(result.herdType).toBe('MIXED');
  });

  it('breedingService.recordService should auto-compute expected kidding date', async () => {
    db2.GoatAnimal.findByPk.mockResolvedValue({ id: 10, sex: 'FEMALE', herd_id: 1 });
    db2.GoatBreedingEvent.create.mockResolvedValue({
      id: 1, doe_id: 10, service_date: '2026-04-01',
      expected_kidding_date: '2026-08-29', status: 'SERVICED',
    });

    const breedingService = require('../../src/modules/roots/goatery/services/breedingService');
    const result = await breedingService.recordService(10, { serviceDate: '2026-04-01', serviceType: 'NATURAL' });

    expect(result.expectedKiddingDate).toBeDefined();
    // 150 days from April 1 = August 29
    expect(result.expectedKiddingDate).toBe('2026-08-29');
  });

  it('economicsService.getHerdEconomics should compute per-animal metrics', async () => {
    db2.GoatHerd.findByPk.mockResolvedValue({ id: 1, total_animals: 10 });
    db2.GoatAnimal.findAll.mockResolvedValue(Array(10).fill({ status: 'ACTIVE' }));
    db2.GoatCostEvent.findAll.mockResolvedValue([{ amount: 5000 }, { amount: 3000 }]);
    db2.GoatRevenueEvent.findAll.mockResolvedValue([{ total_amount: 15000 }]);

    const econ = require('../../src/modules/roots/goatery/services/economicsService');
    const result = await econ.getHerdEconomics(1);

    expect(result.totalCost).toBe(8000);
    expect(result.totalRevenue).toBe(15000);
    expect(result.netProfit).toBe(7000);
    expect(result.costPerAnimal).toBe(800); // 8000/10
    expect(result.profitPerAnimal).toBe(700); // 7000/10
  });
});
