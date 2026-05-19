/**
 * Unit Tests — ROOTS Variance Engine Migrations
 *
 * Validates migration file structure, column definitions, indexes,
 * and rollback support without running against a real database.
 */

const path = require('path');
const migrationsDir = path.join(__dirname, '../../migrations');

// Load migration modules
const complianceMigration = require(path.join(migrationsDir, '20260418000007-create-roots-compliance-snapshots'));
const redFlagMigration = require(path.join(migrationsDir, '20260418000008-create-roots-red-flags'));
const utilizationMigration = require(path.join(migrationsDir, '20260418000009-create-roots-loan-utilization-tracking'));

/* ── Mock queryInterface to capture calls ── */

const createMockQueryInterface = () => {
  const tables = {};
  const indexes = [];
  const droppedTables = [];

  return {
    createTable: jest.fn(async (tableName, columns) => {
      tables[tableName] = columns;
    }),
    dropTable: jest.fn(async (tableName) => {
      droppedTables.push(tableName);
    }),
    addIndex: jest.fn(async (tableName, fields, options) => {
      indexes.push({ tableName, fields, options });
    }),
    // Accessors for assertions
    _tables: tables,
    _indexes: indexes,
    _droppedTables: droppedTables,
  };
};

const MockSequelize = {
  INTEGER: 'INTEGER',
  STRING: (len) => `STRING(${len})`,
  DECIMAL: (p, s) => `DECIMAL(${p},${s})`,
  BOOLEAN: 'BOOLEAN',
  TEXT: 'TEXT',
  DATE: 'DATE',
  DATEONLY: 'DATEONLY',
  JSON: 'JSON',
  ENUM: (...vals) => ({ values: vals }),
  literal: (val) => ({ val }),
};

/* ════════════════════════════════════════════════════════════════
 * roots_compliance_snapshots
 * ════════════════════════════════════════════════════════════════ */

describe('Migration: roots_compliance_snapshots', () => {
  let qi;

  beforeEach(async () => {
    qi = createMockQueryInterface();
    await complianceMigration.up(qi, MockSequelize);
  });

  it('should export up and down functions', () => {
    expect(typeof complianceMigration.up).toBe('function');
    expect(typeof complianceMigration.down).toBe('function');
  });

  it('should create the roots_compliance_snapshots table', () => {
    expect(qi.createTable).toHaveBeenCalledTimes(1);
    expect(qi.createTable.mock.calls[0][0]).toBe('roots_compliance_snapshots');
  });

  it('should have all required columns', () => {
    const columns = qi._tables['roots_compliance_snapshots'];
    const colNames = Object.keys(columns);

    const required = [
      'id', 'uuid', 'farmer_id', 'activity_type', 'activity_reference_id',
      'overall_compliance_score', 'timing_compliance_score', 'quantity_compliance_score',
      'cost_compliance_score', 'practice_compliance_score',
      'total_stages', 'completed_stages', 'missed_stages', 'delayed_stages',
      'total_expected_cost', 'total_actual_cost', 'cost_variance_pct',
      'data_completeness_pct', 'photo_evidence_count',
      'sathi_verified', 'soil_health_card_available',
      'snapshot_date', 'season', 'is_active', 'created_at', 'updated_at',
    ];

    required.forEach((col) => {
      expect(colNames).toContain(col);
    });
  });

  it('should have id as autoIncrement primary key', () => {
    const id = qi._tables['roots_compliance_snapshots'].id;
    expect(id.primaryKey).toBe(true);
    expect(id.autoIncrement).toBe(true);
  });

  it('should have uuid as unique non-null', () => {
    const uuid = qi._tables['roots_compliance_snapshots'].uuid;
    expect(uuid.unique).toBe(true);
    expect(uuid.allowNull).toBe(false);
  });

  it('should have farmer_id FK referencing users table', () => {
    const fk = qi._tables['roots_compliance_snapshots'].farmer_id;
    expect(fk.references.model).toBe('users');
    expect(fk.references.key).toBe('id');
    expect(fk.allowNull).toBe(false);
  });

  it('should have activity_type as ENUM with 6 values', () => {
    const col = qi._tables['roots_compliance_snapshots'].activity_type;
    expect(col.type.values).toEqual(['CROP', 'DAIRY', 'FISHERY', 'HORTI', 'POULTRY', 'GOATERY']);
    expect(col.allowNull).toBe(false);
  });

  it('should create 3 indexes', () => {
    const tableIndexes = qi._indexes.filter((i) => i.tableName === 'roots_compliance_snapshots');
    expect(tableIndexes).toHaveLength(3);

    // Composite index: farmer_id + activity_type + snapshot_date
    const compositeIdx = tableIndexes.find((i) => i.fields.length === 3);
    expect(compositeIdx.fields).toEqual(['farmer_id', 'activity_type', 'snapshot_date']);

    // Score index
    const scoreIdx = tableIndexes.find((i) => i.fields.includes('overall_compliance_score'));
    expect(scoreIdx).toBeDefined();

    // Date index
    const dateIdx = tableIndexes.find((i) => i.fields.length === 1 && i.fields[0] === 'snapshot_date');
    expect(dateIdx).toBeDefined();
  });

  it('down() should drop the table', async () => {
    await complianceMigration.down(qi);
    expect(qi.dropTable).toHaveBeenCalledWith('roots_compliance_snapshots');
  });
});

/* ════════════════════════════════════════════════════════════════
 * roots_red_flags
 * ════════════════════════════════════════════════════════════════ */

describe('Migration: roots_red_flags', () => {
  let qi;

  beforeEach(async () => {
    qi = createMockQueryInterface();
    await redFlagMigration.up(qi, MockSequelize);
  });

  it('should create the roots_red_flags table', () => {
    expect(qi.createTable).toHaveBeenCalledTimes(1);
    expect(qi.createTable.mock.calls[0][0]).toBe('roots_red_flags');
  });

  it('should have all required columns', () => {
    const colNames = Object.keys(qi._tables['roots_red_flags']);

    const required = [
      'id', 'uuid', 'farmer_id', 'loan_application_id',
      'activity_type', 'activity_reference_id',
      'flag_type', 'severity', 'description', 'evidence_json',
      'status', 'acknowledged_by', 'acknowledged_at', 'resolution_notes',
      'is_active', 'created_at', 'updated_at',
    ];

    required.forEach((col) => {
      expect(colNames).toContain(col);
    });
  });

  it('should have loan_application_id as nullable FK', () => {
    const fk = qi._tables['roots_red_flags'].loan_application_id;
    expect(fk.allowNull).toBe(true);
    expect(fk.references.model).toBe('loan_applications');
    expect(fk.references.key).toBe('id');
  });

  it('should have flag_type ENUM with 12 values', () => {
    const col = qi._tables['roots_red_flags'].flag_type;
    expect(col.type.values).toHaveLength(12);
    expect(col.type.values).toContain('NO_DATA_ENTRY');
    expect(col.type.values).toContain('MORTALITY_SPIKE');
    expect(col.type.values).toContain('FEED_COST_SPIRAL');
    expect(col.type.values).toContain('BACKFILL_SUSPECTED');
  });

  it('should have severity ENUM with 4 levels', () => {
    const col = qi._tables['roots_red_flags'].severity;
    expect(col.type.values).toEqual(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']);
    expect(col.allowNull).toBe(false);
  });

  it('should have status ENUM defaulting to OPEN', () => {
    const col = qi._tables['roots_red_flags'].status;
    expect(col.type.values).toEqual(['OPEN', 'ACKNOWLEDGED', 'INVESTIGATING', 'RESOLVED', 'FALSE_POSITIVE']);
    expect(col.defaultValue).toBe('OPEN');
  });

  it('should have evidence_json as JSON type', () => {
    const col = qi._tables['roots_red_flags'].evidence_json;
    expect(col.type).toBe('JSON');
  });

  it('should create 3 indexes', () => {
    const tableIndexes = qi._indexes.filter((i) => i.tableName === 'roots_red_flags');
    expect(tableIndexes).toHaveLength(3);

    // farmer_id + status
    expect(tableIndexes.find((i) => i.fields.includes('farmer_id') && i.fields.includes('status'))).toBeDefined();
    // severity + status
    expect(tableIndexes.find((i) => i.fields.includes('severity') && i.fields.includes('status'))).toBeDefined();
    // loan_application_id
    expect(tableIndexes.find((i) => i.fields.includes('loan_application_id'))).toBeDefined();
  });

  it('down() should drop the table', async () => {
    await redFlagMigration.down(qi);
    expect(qi.dropTable).toHaveBeenCalledWith('roots_red_flags');
  });
});

/* ════════════════════════════════════════════════════════════════
 * roots_loan_utilization_tracking
 * ════════════════════════════════════════════════════════════════ */

describe('Migration: roots_loan_utilization_tracking', () => {
  let qi;

  beforeEach(async () => {
    qi = createMockQueryInterface();
    await utilizationMigration.up(qi, MockSequelize);
  });

  it('should create the roots_loan_utilization_tracking table', () => {
    expect(qi.createTable).toHaveBeenCalledTimes(1);
    expect(qi.createTable.mock.calls[0][0]).toBe('roots_loan_utilization_tracking');
  });

  it('should have all required columns', () => {
    const colNames = Object.keys(qi._tables['roots_loan_utilization_tracking']);

    const required = [
      'id', 'uuid', 'farmer_id', 'loan_application_id',
      'cultivation_cycle_id', 'loan_purpose',
      'sanctioned_amount', 'disbursed_amount',
      'roots_total_input_cost', 'vyapar_total_purchase',
      'total_verified_expenditure', 'utilization_ratio',
      'utilization_quality', 'assessment_date',
      'is_active', 'created_at', 'updated_at',
    ];

    required.forEach((col) => {
      expect(colNames).toContain(col);
    });
  });

  it('should have loan_application_id as required FK', () => {
    const fk = qi._tables['roots_loan_utilization_tracking'].loan_application_id;
    expect(fk.allowNull).toBe(false);
    expect(fk.references.model).toBe('loan_applications');
    expect(fk.references.key).toBe('id');
  });

  it('should have cultivation_cycle_id as nullable (no FK constraint)', () => {
    const col = qi._tables['roots_loan_utilization_tracking'].cultivation_cycle_id;
    expect(col.allowNull).toBe(true);
  });

  it('should have utilization_quality ENUM with 4 values', () => {
    const col = qi._tables['roots_loan_utilization_tracking'].utilization_quality;
    expect(col.type.values).toEqual(['GOOD', 'PARTIAL', 'POOR', 'SUSPICIOUS']);
    expect(col.allowNull).toBe(false);
  });

  it('should create 2 indexes', () => {
    const tableIndexes = qi._indexes.filter((i) => i.tableName === 'roots_loan_utilization_tracking');
    expect(tableIndexes).toHaveLength(2);

    // farmer_id + loan_application_id
    expect(tableIndexes.find((i) => i.fields.includes('farmer_id') && i.fields.includes('loan_application_id'))).toBeDefined();
    // utilization_quality
    expect(tableIndexes.find((i) => i.fields.includes('utilization_quality'))).toBeDefined();
  });

  it('down() should drop the table', async () => {
    await utilizationMigration.down(qi);
    expect(qi.dropTable).toHaveBeenCalledWith('roots_loan_utilization_tracking');
  });
});
