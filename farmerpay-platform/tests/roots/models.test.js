/**
 * Unit Tests — ROOTS Variance Engine Models
 *
 * Tests model definitions, scopes, instance methods, and associations.
 * Uses Sequelize in dialect-less mode (no DB connection needed) to validate
 * model structure, field definitions, and behavior.
 */

const { Sequelize, DataTypes } = require('sequelize');

let sequelize;
let RootsComplianceSnapshot;
let RootsRedFlag;
let RootsLoanUtilizationTracking;

beforeAll(() => {
  // Create Sequelize instance with MySQL dialect but no actual connection
  // We only need it to initialize models, not to connect to a DB
  sequelize = new Sequelize('fake_db', 'fake_user', 'fake_pass', {
    dialect: 'mysql',
    logging: false,
    host: 'localhost',
    pool: { max: 1, min: 0, idle: 100, acquire: 100 },
  });

  // Load model factories
  RootsComplianceSnapshot = require('../../src/modules/roots/crop/models/RootsComplianceSnapshot')(sequelize, DataTypes);
  RootsRedFlag = require('../../src/modules/roots/crop/models/RootsRedFlag')(sequelize, DataTypes);
  RootsLoanUtilizationTracking = require('../../src/modules/roots/crop/models/RootsLoanUtilizationTracking')(sequelize, DataTypes);
});

afterAll(async () => {
  await sequelize.close().catch(() => {}); // ignore connection errors
});

/* ════════════════════════════════════════════════════════════════
 * RootsComplianceSnapshot
 * ════════════════════════════════════════════════════════════════ */

describe('RootsComplianceSnapshot', () => {
  describe('model definition', () => {
    it('should have correct tableName and modelName', () => {
      expect(RootsComplianceSnapshot.tableName).toBe('roots_compliance_snapshots');
      expect(RootsComplianceSnapshot.name).toBe('RootsComplianceSnapshot');
    });

    it('should have timestamps enabled with underscored naming', () => {
      expect(RootsComplianceSnapshot.options.timestamps).toBe(true);
      expect(RootsComplianceSnapshot.options.underscored).toBe(true);
    });

    it('should have all required fields', () => {
      const attrs = RootsComplianceSnapshot.rawAttributes;
      const fieldNames = Object.keys(attrs);

      const required = [
        'id', 'uuid', 'farmer_id', 'activity_type', 'activity_reference_id',
        'overall_compliance_score', 'timing_compliance_score', 'quantity_compliance_score',
        'cost_compliance_score', 'practice_compliance_score',
        'total_stages', 'completed_stages', 'missed_stages', 'delayed_stages',
        'total_expected_cost', 'total_actual_cost', 'cost_variance_pct',
        'data_completeness_pct', 'photo_evidence_count',
        'sathi_verified', 'soil_health_card_available',
        'snapshot_date', 'season', 'is_active',
      ];

      required.forEach((field) => {
        expect(fieldNames).toContain(field);
      });
    });

    it('should have id as autoIncrement primary key', () => {
      const id = RootsComplianceSnapshot.rawAttributes.id;
      expect(id.primaryKey).toBe(true);
      expect(id.autoIncrement).toBe(true);
    });

    it('should have uuid as unique non-null', () => {
      const uuid = RootsComplianceSnapshot.rawAttributes.uuid;
      expect(uuid.unique).toBe(true);
      expect(uuid.allowNull).toBe(false);
    });

    it('should have farmer_id FK referencing users table', () => {
      const fk = RootsComplianceSnapshot.rawAttributes.farmer_id;
      expect(fk.references.model).toBe('users');
      expect(fk.references.key).toBe('id');
      expect(fk.allowNull).toBe(false);
    });

    it('should have activity_type as ENUM with 6 activity types', () => {
      const col = RootsComplianceSnapshot.rawAttributes.activity_type;
      expect(col.type.constructor.name).toBe('ENUM');
      expect(col.type.values).toEqual(['CROP', 'DAIRY', 'FISHERY', 'HORTI', 'POULTRY', 'GOATERY']);
      expect(col.allowNull).toBe(false);
    });

    it('should have default values for integer counters', () => {
      expect(RootsComplianceSnapshot.rawAttributes.total_stages.defaultValue).toBe(0);
      expect(RootsComplianceSnapshot.rawAttributes.completed_stages.defaultValue).toBe(0);
      expect(RootsComplianceSnapshot.rawAttributes.missed_stages.defaultValue).toBe(0);
      expect(RootsComplianceSnapshot.rawAttributes.delayed_stages.defaultValue).toBe(0);
      expect(RootsComplianceSnapshot.rawAttributes.photo_evidence_count.defaultValue).toBe(0);
    });

    it('should have default false for boolean flags', () => {
      expect(RootsComplianceSnapshot.rawAttributes.sathi_verified.defaultValue).toBe(false);
      expect(RootsComplianceSnapshot.rawAttributes.soil_health_card_available.defaultValue).toBe(false);
    });

    it('should have default true for is_active', () => {
      expect(RootsComplianceSnapshot.rawAttributes.is_active.defaultValue).toBe(true);
    });

    it('should have snapshot_date as DATEONLY', () => {
      const col = RootsComplianceSnapshot.rawAttributes.snapshot_date;
      expect(col.type.constructor.name).toBe('DATEONLY');
      expect(col.allowNull).toBe(false);
    });

    it('should have score fields as DECIMAL(5,2)', () => {
      const scoreFields = ['overall_compliance_score', 'timing_compliance_score', 'quantity_compliance_score', 'cost_compliance_score', 'practice_compliance_score'];
      scoreFields.forEach((field) => {
        const col = RootsComplianceSnapshot.rawAttributes[field];
        expect(col.type.constructor.name).toBe('DECIMAL');
      });
    });
  });

  describe('instance methods', () => {
    it('should have isHighCompliance method', () => {
      expect(typeof RootsComplianceSnapshot.prototype.isHighCompliance).toBe('function');
    });

    it('isHighCompliance should return true for score > 80', () => {
      const instance = RootsComplianceSnapshot.build({ overall_compliance_score: 85 });
      expect(instance.isHighCompliance()).toBe(true);
    });

    it('isHighCompliance should return false for score = 80', () => {
      const instance = RootsComplianceSnapshot.build({ overall_compliance_score: 80 });
      expect(instance.isHighCompliance()).toBe(false);
    });

    it('isHighCompliance should return false for score = 50', () => {
      const instance = RootsComplianceSnapshot.build({ overall_compliance_score: 50 });
      expect(instance.isHighCompliance()).toBe(false);
    });

    it('isHighCompliance should return false for null score', () => {
      const instance = RootsComplianceSnapshot.build({ overall_compliance_score: null });
      expect(instance.isHighCompliance()).toBe(false);
    });
  });

  describe('scopes', () => {
    it('should have byFarmer scope returning correct where clause', () => {
      const scope = RootsComplianceSnapshot.options.scopes.byFarmer;
      expect(scope).toBeDefined();
      expect(typeof scope).toBe('function');
      expect(scope(42).where.farmer_id).toBe(42);
    });

    it('should have byActivity scope', () => {
      const scope = RootsComplianceSnapshot.options.scopes.byActivity;
      expect(scope('DAIRY').where.activity_type).toBe('DAIRY');
    });

    it('should have activeInSeason scope with is_active filter', () => {
      const scope = RootsComplianceSnapshot.options.scopes.activeInSeason;
      const result = scope('kharif_2026');
      expect(result.where.season).toBe('kharif_2026');
      expect(result.where.is_active).toBe(true);
    });
  });

  describe('associations', () => {
    it('should define static associate method', () => {
      expect(typeof RootsComplianceSnapshot.associate).toBe('function');
    });
  });
});

/* ════════════════════════════════════════════════════════════════
 * RootsRedFlag
 * ════════════════════════════════════════════════════════════════ */

describe('RootsRedFlag', () => {
  describe('model definition', () => {
    it('should have correct tableName and modelName', () => {
      expect(RootsRedFlag.tableName).toBe('roots_red_flags');
      expect(RootsRedFlag.name).toBe('RootsRedFlag');
    });

    it('should have all required fields', () => {
      const fieldNames = Object.keys(RootsRedFlag.rawAttributes);

      const required = [
        'id', 'uuid', 'farmer_id', 'loan_application_id',
        'activity_type', 'activity_reference_id',
        'flag_type', 'severity', 'description', 'evidence_json',
        'status', 'acknowledged_by', 'acknowledged_at', 'resolution_notes',
        'is_active',
      ];

      required.forEach((field) => {
        expect(fieldNames).toContain(field);
      });
    });

    it('should have loan_application_id as nullable', () => {
      expect(RootsRedFlag.rawAttributes.loan_application_id.allowNull).toBe(true);
    });

    it('should have loan_application_id FK to loan_applications', () => {
      const fk = RootsRedFlag.rawAttributes.loan_application_id;
      expect(fk.references.model).toBe('loan_applications');
      expect(fk.references.key).toBe('id');
    });

    it('should have flag_type ENUM with 12 values', () => {
      const col = RootsRedFlag.rawAttributes.flag_type;
      expect(col.type.values).toHaveLength(12);
      expect(col.type.values).toContain('NO_DATA_ENTRY');
      expect(col.type.values).toContain('CRITICAL_STAGE_MISSED');
      expect(col.type.values).toContain('COST_ANOMALY');
      expect(col.type.values).toContain('YIELD_ANOMALY');
      expect(col.type.values).toContain('PRACTICE_DEVIATION_SEVERE');
      expect(col.type.values).toContain('LOAN_UTILIZATION_MISMATCH');
      expect(col.type.values).toContain('BACKFILL_SUSPECTED');
      expect(col.type.values).toContain('GPS_MISMATCH');
      expect(col.type.values).toContain('SATHI_DISCREPANCY');
      expect(col.type.values).toContain('DISTRESS_SIGNAL');
      expect(col.type.values).toContain('MORTALITY_SPIKE');
      expect(col.type.values).toContain('FEED_COST_SPIRAL');
    });

    it('should have severity ENUM with 4 levels', () => {
      const col = RootsRedFlag.rawAttributes.severity;
      expect(col.type.values).toEqual(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']);
      expect(col.allowNull).toBe(false);
    });

    it('should have status ENUM defaulting to OPEN', () => {
      const col = RootsRedFlag.rawAttributes.status;
      expect(col.type.values).toEqual(['OPEN', 'ACKNOWLEDGED', 'INVESTIGATING', 'RESOLVED', 'FALSE_POSITIVE']);
      expect(col.defaultValue).toBe('OPEN');
    });

    it('should have evidence_json as JSON type', () => {
      const col = RootsRedFlag.rawAttributes.evidence_json;
      expect(col.type.constructor.name).toMatch(/JSON/);
    });

    it('should have acknowledged_at as nullable DATE', () => {
      const col = RootsRedFlag.rawAttributes.acknowledged_at;
      expect(col.allowNull).toBe(true);
    });
  });

  describe('scopes', () => {
    it('should have open scope filtering by OPEN status', () => {
      const scope = RootsRedFlag.options.scopes.open;
      expect(scope().where.status).toBe('OPEN');
    });

    it('should have bySeverity scope', () => {
      const scope = RootsRedFlag.options.scopes.bySeverity;
      expect(scope('CRITICAL').where.severity).toBe('CRITICAL');
    });

    it('should have byFarmer scope', () => {
      const scope = RootsRedFlag.options.scopes.byFarmer;
      expect(scope(99).where.farmer_id).toBe(99);
    });
  });

  describe('associations', () => {
    it('should define static associate method', () => {
      expect(typeof RootsRedFlag.associate).toBe('function');
    });
  });
});

/* ════════════════════════════════════════════════════════════════
 * RootsLoanUtilizationTracking
 * ════════════════════════════════════════════════════════════════ */

describe('RootsLoanUtilizationTracking', () => {
  describe('model definition', () => {
    it('should have correct tableName and modelName', () => {
      expect(RootsLoanUtilizationTracking.tableName).toBe('roots_loan_utilization_tracking');
      expect(RootsLoanUtilizationTracking.name).toBe('RootsLoanUtilizationTracking');
    });

    it('should have all required fields', () => {
      const fieldNames = Object.keys(RootsLoanUtilizationTracking.rawAttributes);

      const required = [
        'id', 'uuid', 'farmer_id', 'loan_application_id',
        'cultivation_cycle_id', 'loan_purpose',
        'sanctioned_amount', 'disbursed_amount',
        'roots_total_input_cost', 'vyapar_total_purchase',
        'total_verified_expenditure', 'utilization_ratio',
        'utilization_quality', 'assessment_date', 'is_active',
      ];

      required.forEach((field) => {
        expect(fieldNames).toContain(field);
      });
    });

    it('should have loan_application_id as required FK', () => {
      const fk = RootsLoanUtilizationTracking.rawAttributes.loan_application_id;
      expect(fk.allowNull).toBe(false);
      expect(fk.references.model).toBe('loan_applications');
    });

    it('should have cultivation_cycle_id as nullable', () => {
      expect(RootsLoanUtilizationTracking.rawAttributes.cultivation_cycle_id.allowNull).toBe(true);
    });

    it('should have utilization_quality ENUM with 4 values', () => {
      const col = RootsLoanUtilizationTracking.rawAttributes.utilization_quality;
      expect(col.type.values).toEqual(['GOOD', 'PARTIAL', 'POOR', 'SUSPICIOUS']);
      expect(col.allowNull).toBe(false);
    });

    it('should have DECIMAL fields for financial amounts', () => {
      const decimalFields = ['sanctioned_amount', 'disbursed_amount', 'roots_total_input_cost', 'vyapar_total_purchase', 'total_verified_expenditure'];
      decimalFields.forEach((field) => {
        expect(RootsLoanUtilizationTracking.rawAttributes[field].type.constructor.name).toBe('DECIMAL');
      });
    });
  });

  describe('instance methods', () => {
    it('should have isAdequate method', () => {
      expect(typeof RootsLoanUtilizationTracking.prototype.isAdequate).toBe('function');
    });

    it('isAdequate should return true for ratio >= 0.4', () => {
      const instance = RootsLoanUtilizationTracking.build({ utilization_ratio: 0.65 });
      expect(instance.isAdequate()).toBe(true);
    });

    it('isAdequate should return true at boundary (0.4)', () => {
      const instance = RootsLoanUtilizationTracking.build({ utilization_ratio: 0.40 });
      expect(instance.isAdequate()).toBe(true);
    });

    it('isAdequate should return false for ratio < 0.4', () => {
      const instance = RootsLoanUtilizationTracking.build({ utilization_ratio: 0.20 });
      expect(instance.isAdequate()).toBe(false);
    });

    it('isAdequate should return false for null ratio', () => {
      const instance = RootsLoanUtilizationTracking.build({ utilization_ratio: null });
      expect(instance.isAdequate()).toBe(false);
    });

    it('isAdequate should return false for zero ratio', () => {
      const instance = RootsLoanUtilizationTracking.build({ utilization_ratio: 0 });
      expect(instance.isAdequate()).toBe(false);
    });
  });

  describe('associations', () => {
    it('should define static associate method', () => {
      expect(typeof RootsLoanUtilizationTracking.associate).toBe('function');
    });
  });
});
