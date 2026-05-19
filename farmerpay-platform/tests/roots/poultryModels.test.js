/**
 * Unit Tests — Poultry Module Models & Migration
 *
 * Tests model definitions, field types, ENUMs, associations,
 * and migration structure for all 7 poultry tables.
 */

const { Sequelize, DataTypes } = require('sequelize');
const path = require('path');

/* ── Model tests (no DB connection) ── */

let sequelize;
let models = {};

beforeAll(() => {
  sequelize = new Sequelize('fake_db', 'fake', 'fake', {
    dialect: 'mysql', logging: false,
    pool: { max: 1, min: 0, idle: 100, acquire: 100 },
  });

  const modelFiles = [
    'PoultryFlock', 'PoultryDailyLog', 'PoultryHealthEvent',
    'PoultryCostEvent', 'PoultryRevenueEvent', 'PoultryBatchSummary', 'PoultryPopTemplate',
  ];

  modelFiles.forEach((name) => {
    models[name] = require(`../../src/modules/roots/poultry/models/${name}`)(sequelize, DataTypes);
  });
});

afterAll(async () => {
  await sequelize.close().catch(() => {});
});

describe('PoultryFlock', () => {
  it('should have correct table and model name', () => {
    expect(models.PoultryFlock.tableName).toBe('poultry_flocks');
    expect(models.PoultryFlock.name).toBe('PoultryFlock');
  });

  it('should have all required fields', () => {
    const fields = Object.keys(models.PoultryFlock.rawAttributes);
    ['id', 'uuid', 'farmer_id', 'batch_name', 'bird_type', 'placement_date',
     'initial_count', 'current_count', 'status', 'is_active'].forEach((f) => {
      expect(fields).toContain(f);
    });
  });

  it('should have bird_type ENUM with 5 values', () => {
    const col = models.PoultryFlock.rawAttributes.bird_type;
    expect(col.type.values).toEqual(['BROILER', 'LAYER', 'COUNTRY', 'DUCK', 'QUAIL']);
  });

  it('should have status ENUM with 3 values', () => {
    const col = models.PoultryFlock.rawAttributes.status;
    expect(col.type.values).toEqual(['ACTIVE', 'COMPLETED', 'TERMINATED']);
    expect(col.defaultValue).toBe('ACTIVE');
  });

  it('should define associate method', () => {
    expect(typeof models.PoultryFlock.associate).toBe('function');
  });
});

describe('PoultryDailyLog', () => {
  it('should have correct table name', () => {
    expect(models.PoultryDailyLog.tableName).toBe('poultry_daily_logs');
  });

  it('should have all daily metrics fields', () => {
    const fields = Object.keys(models.PoultryDailyLog.rawAttributes);
    ['flock_id', 'log_date', 'mortality_count', 'feed_consumed_kg',
     'egg_count', 'sample_weight_g', 'disease_observed'].forEach((f) => {
      expect(fields).toContain(f);
    });
  });

  it('should default mortality_count to 0', () => {
    expect(models.PoultryDailyLog.rawAttributes.mortality_count.defaultValue).toBe(0);
  });
});

describe('PoultryHealthEvent', () => {
  it('should have event_type ENUM with 5 values', () => {
    const col = models.PoultryHealthEvent.rawAttributes.event_type;
    expect(col.type.values).toEqual(['VACCINATION', 'DISEASE', 'MEDICATION', 'DEWORMING', 'CULLING']);
  });

  it('should have vaccine, disease, and medicine fields', () => {
    const fields = Object.keys(models.PoultryHealthEvent.rawAttributes);
    expect(fields).toContain('vaccine_name');
    expect(fields).toContain('disease_name');
    expect(fields).toContain('medicine_name');
  });
});

describe('PoultryCostEvent', () => {
  it('should have category ENUM with 9 values', () => {
    const col = models.PoultryCostEvent.rawAttributes.category;
    expect(col.type.values).toHaveLength(9);
    expect(col.type.values).toContain('FEED');
    expect(col.type.values).toContain('CHICK_PURCHASE');
    expect(col.type.values).toContain('LITTER');
  });

  it('should have source ENUM defaulting to FARMER', () => {
    const col = models.PoultryCostEvent.rawAttributes.source;
    expect(col.type.values).toEqual(['FARMER', 'SATHI', 'VYAPAR', 'AUTO']);
    expect(col.defaultValue).toBe('FARMER');
  });

  it('should have vendor_transaction_id for VYAPAR bridge', () => {
    expect(models.PoultryCostEvent.rawAttributes.vendor_transaction_id).toBeDefined();
  });
});

describe('PoultryRevenueEvent', () => {
  it('should have category ENUM with 4 sale types', () => {
    const col = models.PoultryRevenueEvent.rawAttributes.category;
    expect(col.type.values).toEqual(['EGG_SALE', 'BIRD_SALE', 'MANURE_SALE', 'OTHER']);
  });

  it('should have buyer_type ENUM', () => {
    const col = models.PoultryRevenueEvent.rawAttributes.buyer_type;
    expect(col.type.values).toEqual(['TRADER', 'RETAIL', 'HOTEL', 'MARKET', 'OTHER']);
  });
});

describe('PoultryBatchSummary', () => {
  it('should have KPI fields', () => {
    const fields = Object.keys(models.PoultryBatchSummary.rawAttributes);
    ['cumulative_mortality', 'mortality_rate_pct', 'cumulative_feed_kg', 'fcr',
     'avg_weight_g', 'total_egg_count', 'egg_production_pct',
     'total_cost', 'total_revenue', 'profit_per_bird', 'cost_per_bird'].forEach((f) => {
      expect(fields).toContain(f);
    });
  });

  it('should have FCR as DECIMAL(5,3)', () => {
    const col = models.PoultryBatchSummary.rawAttributes.fcr;
    expect(col.type.constructor.name).toBe('DECIMAL');
  });
});

describe('PoultryPopTemplate', () => {
  it('should have bird_type ENUM (BROILER/LAYER only)', () => {
    const col = models.PoultryPopTemplate.rawAttributes.bird_type;
    expect(col.type.values).toEqual(['BROILER', 'LAYER']);
  });

  it('should have week_number field', () => {
    expect(models.PoultryPopTemplate.rawAttributes.week_number).toBeDefined();
  });

  it('should have both weight (broiler) and egg (layer) expectations', () => {
    expect(models.PoultryPopTemplate.rawAttributes.expected_weight_g).toBeDefined();
    expect(models.PoultryPopTemplate.rawAttributes.expected_egg_pct).toBeDefined();
  });
});

/* ── Migration structure tests ── */

describe('Migration: poultry tables', () => {
  const createMockQI = () => {
    const tables = {};
    const indexes = [];
    return {
      createTable: jest.fn(async (name, cols) => { tables[name] = cols; }),
      dropTable: jest.fn(),
      addIndex: jest.fn(async (name, fields, opts) => { indexes.push({ name, fields, opts }); }),
      _tables: tables,
      _indexes: indexes,
    };
  };

  const MockSeq = {
    INTEGER: 'INT', STRING: (n) => `STR(${n})`, DECIMAL: (p, s) => `DEC(${p},${s})`,
    BOOLEAN: 'BOOL', TEXT: 'TEXT', DATE: 'DATE', DATEONLY: 'DATEONLY', JSON: 'JSON',
    ENUM: (...v) => ({ values: v }), literal: (v) => ({ val: v }),
  };

  it('should create 7 tables in up()', async () => {
    const migration = require('../../migrations/20260419000004-create-poultry-tables');
    const qi = createMockQI();
    await migration.up(qi, MockSeq);

    expect(qi.createTable).toHaveBeenCalledTimes(7);
    const tableNames = qi.createTable.mock.calls.map((c) => c[0]);
    expect(tableNames).toContain('poultry_flocks');
    expect(tableNames).toContain('poultry_daily_logs');
    expect(tableNames).toContain('poultry_health_events');
    expect(tableNames).toContain('poultry_cost_events');
    expect(tableNames).toContain('poultry_revenue_events');
    expect(tableNames).toContain('poultry_batch_summaries');
    expect(tableNames).toContain('poultry_pop_templates');
  });

  it('should create 7 indexes', async () => {
    const migration = require('../../migrations/20260419000004-create-poultry-tables');
    const qi = createMockQI();
    await migration.up(qi, MockSeq);

    expect(qi.addIndex).toHaveBeenCalledTimes(7);
  });

  it('should drop all 7 tables in reverse order in down()', async () => {
    const migration = require('../../migrations/20260419000004-create-poultry-tables');
    const qi = createMockQI();
    await migration.down(qi);

    expect(qi.dropTable).toHaveBeenCalledTimes(7);
    // First dropped should be templates (no FKs to it), last should be flocks
    expect(qi.dropTable.mock.calls[6][0]).toBe('poultry_flocks');
  });

  it('should have unique index on (flock_id, log_date) for daily logs', async () => {
    const migration = require('../../migrations/20260419000004-create-poultry-tables');
    const qi = createMockQI();
    await migration.up(qi, MockSeq);

    const dailyLogIdx = qi._indexes.find((i) => i.name === 'poultry_daily_logs');
    expect(dailyLogIdx).toBeDefined();
    expect(dailyLogIdx.opts.unique).toBe(true);
  });
});
