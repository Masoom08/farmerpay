/**
 * AA V2 Models — Unit Tests
 * Tests model definitions, column configs, associations, indexes, and immutability constraints
 * for AaTransaction, AaFinancialAnalysis, and AaConsentAuditLog.
 */

let db;

beforeAll(async () => {
  process.env.NODE_ENV = 'test';
  process.env.DB_LOGGING = 'false';
  db = require('../../src/shared/models');
});

afterAll(async () => {
  if (db && db.sequelize) {
    await db.sequelize.close();
  }
});

// ─── Helpers ───────────────────────────────────────────────────────

const getAttributes = (model) => model.rawAttributes;
const getOptions = (model) => model.options;
const getAssociations = (model) => model.associations;
const getIndexes = (model) => model.options.indexes || [];

// ─── AaTransaction ─────────────────────────────────────────────────

describe('AaTransaction Model', () => {
  let Model;

  beforeAll(() => {
    Model = db.AaTransaction;
  });

  it('should be registered in db', () => {
    expect(Model).toBeDefined();
    expect(Model.name).toBe('AaTransaction');
  });

  it('should use correct table name and config', () => {
    const opts = getOptions(Model);
    expect(opts.tableName).toBe('aa_transactions');
    expect(opts.timestamps).toBe(true);
    expect(opts.underscored).toBe(true);
  });

  describe('columns', () => {
    it('should have BIGINT primary key', () => {
      const attrs = getAttributes(Model);
      expect(attrs.id.type.constructor.name).toBe('BIGINT');
      expect(attrs.id.primaryKey).toBe(true);
      expect(attrs.id.autoIncrement).toBe(true);
    });

    it('should have transaction_uuid as unique STRING(36)', () => {
      const attrs = getAttributes(Model);
      expect(attrs.transaction_uuid.type.constructor.name).toBe('STRING');
      expect(attrs.transaction_uuid.unique).toBe(true);
      expect(attrs.transaction_uuid.allowNull).toBe(false);
    });

    it('should have required foreign keys', () => {
      const attrs = getAttributes(Model);
      expect(attrs.farmer_id.references.model).toBe('users');
      expect(attrs.consent_id.references.model).toBe('aa_consents');
      expect(attrs.summary_id.references.model).toBe('aa_bank_statement_summaries');
    });

    it('should have txn_type as ENUM(credit, debit)', () => {
      const attrs = getAttributes(Model);
      expect(attrs.txn_type.type.values).toEqual(['credit', 'debit']);
      expect(attrs.txn_type.allowNull).toBe(false);
    });

    it('should have amount as DECIMAL(15,2) not null', () => {
      const attrs = getAttributes(Model);
      expect(attrs.amount.type.constructor.name).toBe('DECIMAL');
      expect(attrs.amount.allowNull).toBe(false);
    });

    it('should have nullable classification columns', () => {
      const attrs = getAttributes(Model);
      expect(attrs.income_category.allowNull).toBe(true);
      expect(attrs.expense_category.allowNull).toBe(true);
      expect(attrs.classification_confidence.allowNull).toBe(true);
    });

    it('should have is_active defaulting to true', () => {
      const attrs = getAttributes(Model);
      expect(attrs.is_active.defaultValue).toBe(true);
    });
  });

  describe('associations', () => {
    it('should belongsTo User as farmer', () => {
      const assocs = getAssociations(Model);
      expect(assocs.farmer).toBeDefined();
      expect(assocs.farmer.associationType).toBe('BelongsTo');
      expect(assocs.farmer.foreignKey).toBe('farmer_id');
    });

    it('should belongsTo AaConsent as consent', () => {
      const assocs = getAssociations(Model);
      expect(assocs.consent).toBeDefined();
      expect(assocs.consent.associationType).toBe('BelongsTo');
    });

    it('should belongsTo AaBankStatementSummary as summary', () => {
      const assocs = getAssociations(Model);
      expect(assocs.summary).toBeDefined();
      expect(assocs.summary.associationType).toBe('BelongsTo');
    });
  });

  describe('indexes', () => {
    it('should have composite index on farmer_id + txn_date', () => {
      const indexes = getIndexes(Model);
      const composite = indexes.find((i) => i.name === 'idx_aa_txn_farmer_date');
      expect(composite).toBeDefined();
      expect(composite.fields).toEqual(['farmer_id', 'txn_date']);
    });

    it('should have unique index on transaction_uuid', () => {
      const indexes = getIndexes(Model);
      const uuidIdx = indexes.find((i) => i.fields.includes('transaction_uuid'));
      expect(uuidIdx).toBeDefined();
      expect(uuidIdx.unique).toBe(true);
    });

    it('should have individual indexes on key columns', () => {
      const indexes = getIndexes(Model);
      const fieldSets = indexes.map((i) => i.fields.join(','));
      expect(fieldSets).toContain('farmer_id');
      expect(fieldSets).toContain('consent_id');
      expect(fieldSets).toContain('txn_date');
      expect(fieldSets).toContain('income_category');
      expect(fieldSets).toContain('expense_category');
    });
  });
});

// ─── AaFinancialAnalysis ───────────────────────────────────────────

describe('AaFinancialAnalysis Model', () => {
  let Model;

  beforeAll(() => {
    Model = db.AaFinancialAnalysis;
  });

  it('should be registered in db', () => {
    expect(Model).toBeDefined();
    expect(Model.name).toBe('AaFinancialAnalysis');
  });

  it('should use correct table name and config', () => {
    const opts = getOptions(Model);
    expect(opts.tableName).toBe('aa_financial_analyses');
    expect(opts.timestamps).toBe(true);
    expect(opts.underscored).toBe(true);
  });

  describe('columns', () => {
    it('should have INTEGER primary key', () => {
      const attrs = getAttributes(Model);
      expect(attrs.id.type.constructor.name).toBe('INTEGER');
      expect(attrs.id.primaryKey).toBe(true);
    });

    it('should have analysis_uuid as unique STRING(36)', () => {
      const attrs = getAttributes(Model);
      expect(attrs.analysis_uuid.unique).toBe(true);
      expect(attrs.analysis_uuid.allowNull).toBe(false);
    });

    it('should have analysis_type ENUM with 3 values', () => {
      const attrs = getAttributes(Model);
      expect(attrs.analysis_type.type.values).toEqual(['full', 'health_score_only', 'summary_only']);
    });

    it('should have analysis_mode ENUM with 2 values', () => {
      const attrs = getAttributes(Model);
      expect(attrs.analysis_mode.type.values).toEqual(['raw_transactions', 'summary_fallback']);
    });

    it('should have health_grade as CHAR(1)', () => {
      const attrs = getAttributes(Model);
      expect(attrs.health_grade.type.constructor.name).toBe('CHAR');
    });

    it('should have all 6 JSON columns', () => {
      const attrs = getAttributes(Model);
      const jsonCols = ['score_components', 'income_summary', 'expense_summary', 'seasonality_data', 'risk_flags', 'bridge_data'];
      jsonCols.forEach((col) => {
        expect(attrs[col]).toBeDefined();
        expect(attrs[col].type.key).toBe('JSON');
        expect(attrs[col].allowNull).toBe(true);
      });
    });

    it('should have is_latest and is_active defaulting to true', () => {
      const attrs = getAttributes(Model);
      expect(attrs.is_latest.defaultValue).toBe(true);
      expect(attrs.is_active.defaultValue).toBe(true);
    });

    it('should have period_from and period_to as DATEONLY', () => {
      const attrs = getAttributes(Model);
      expect(attrs.period_from.type.constructor.name).toBe('DATEONLY');
      expect(attrs.period_to.type.constructor.name).toBe('DATEONLY');
    });
  });

  describe('associations', () => {
    it('should belongsTo User as farmer', () => {
      const assocs = getAssociations(Model);
      expect(assocs.farmer).toBeDefined();
      expect(assocs.farmer.associationType).toBe('BelongsTo');
    });

    it('should belongsTo AaConsent as consent', () => {
      const assocs = getAssociations(Model);
      expect(assocs.consent).toBeDefined();
      expect(assocs.consent.associationType).toBe('BelongsTo');
    });
  });

  describe('indexes', () => {
    it('should have composite index on farmer_id + is_latest', () => {
      const indexes = getIndexes(Model);
      const composite = indexes.find((i) => i.name === 'idx_aa_analysis_farmer_latest');
      expect(composite).toBeDefined();
      expect(composite.fields).toEqual(['farmer_id', 'is_latest']);
    });

    it('should have unique index on analysis_uuid', () => {
      const indexes = getIndexes(Model);
      const uuidIdx = indexes.find((i) => i.fields.includes('analysis_uuid'));
      expect(uuidIdx.unique).toBe(true);
    });
  });
});

// ─── AaConsentAuditLog ─────────────────────────────────────────────

describe('AaConsentAuditLog Model', () => {
  let Model;

  beforeAll(() => {
    Model = db.AaConsentAuditLog;
  });

  it('should be registered in db', () => {
    expect(Model).toBeDefined();
    expect(Model.name).toBe('AaConsentAuditLog');
  });

  it('should use correct table name and config', () => {
    const opts = getOptions(Model);
    expect(opts.tableName).toBe('aa_consent_audit_logs');
    expect(opts.timestamps).toBe(true);
    expect(opts.underscored).toBe(true);
  });

  it('should be immutable — updatedAt disabled', () => {
    const opts = getOptions(Model);
    expect(opts.updatedAt).toBe(false);
  });

  describe('columns', () => {
    it('should have BIGINT primary key', () => {
      const attrs = getAttributes(Model);
      expect(attrs.id.type.constructor.name).toBe('BIGINT');
      expect(attrs.id.primaryKey).toBe(true);
    });

    it('should have event_type ENUM with 9 values', () => {
      const attrs = getAttributes(Model);
      expect(attrs.event_type.type.values).toEqual([
        'consent_requested', 'consent_approved', 'consent_rejected',
        'consent_revoked', 'consent_expired', 'data_fetched',
        'data_fetch_failed', 'analysis_run', 'consent_renewed',
      ]);
      expect(attrs.event_type.allowNull).toBe(false);
    });

    it('should have event_source ENUM with 5 values', () => {
      const attrs = getAttributes(Model);
      expect(attrs.event_source.type.values).toEqual([
        'farmer', 'system', 'webhook', 'admin', 'scheduler',
      ]);
      expect(attrs.event_source.allowNull).toBe(false);
    });

    it('should have metadata as JSON', () => {
      const attrs = getAttributes(Model);
      expect(attrs.metadata.type.key).toBe('JSON');
    });

    it('should have ip_address as STRING(45) for IPv6', () => {
      const attrs = getAttributes(Model);
      expect(attrs.ip_address.type.constructor.name).toBe('STRING');
      expect(attrs.ip_address.allowNull).toBe(true);
    });

    it('should NOT have updated_at attribute', () => {
      const attrs = getAttributes(Model);
      expect(attrs.updated_at).toBeUndefined();
      expect(attrs.updatedAt).toBeUndefined();
    });
  });

  describe('associations', () => {
    it('should belongsTo AaConsent as consent', () => {
      const assocs = getAssociations(Model);
      expect(assocs.consent).toBeDefined();
      expect(assocs.consent.associationType).toBe('BelongsTo');
      expect(assocs.consent.foreignKey).toBe('consent_id');
    });

    it('should belongsTo User as farmer', () => {
      const assocs = getAssociations(Model);
      expect(assocs.farmer).toBeDefined();
      expect(assocs.farmer.associationType).toBe('BelongsTo');
      expect(assocs.farmer.foreignKey).toBe('farmer_id');
    });
  });

  describe('indexes', () => {
    it('should have indexes on consent_id, farmer_id, event_type, created_at', () => {
      const indexes = getIndexes(Model);
      const fieldSets = indexes.map((i) => i.fields.join(','));
      expect(fieldSets).toContain('consent_id');
      expect(fieldSets).toContain('farmer_id');
      expect(fieldSets).toContain('event_type');
      expect(fieldSets).toContain('created_at');
    });
  });
});

// ─── AaConsent V2 Updates ──────────────────────────────────────────

describe('AaConsent V2 Updates', () => {
  let Model;

  beforeAll(() => {
    Model = db.AaConsent;
  });

  it('should include setu in aa_provider ENUM', () => {
    const attrs = getAttributes(Model);
    expect(attrs.aa_provider.type.values).toContain('setu');
    expect(attrs.aa_provider.type.values).toEqual(['finvu', 'onemoney', 'cams', 'nsdl', 'setu']);
  });

  it('should have new V2 columns', () => {
    const attrs = getAttributes(Model);
    expect(attrs.consent_handle).toBeDefined();
    expect(attrs.redirect_url).toBeDefined();
    expect(attrs.provider_consent_id).toBeDefined();
    expect(attrs.approved_at).toBeDefined();
    expect(attrs.expires_at).toBeDefined();
    expect(attrs.last_fetch_at).toBeDefined();
    expect(attrs.fetch_count).toBeDefined();
  });

  it('should have fetch_count defaulting to 0', () => {
    const attrs = getAttributes(Model);
    expect(attrs.fetch_count.defaultValue).toBe(0);
  });

  describe('new associations', () => {
    it('should hasMany AaTransaction as transactions', () => {
      const assocs = getAssociations(Model);
      expect(assocs.transactions).toBeDefined();
      expect(assocs.transactions.associationType).toBe('HasMany');
    });

    it('should hasMany AaFinancialAnalysis as analyses', () => {
      const assocs = getAssociations(Model);
      expect(assocs.analyses).toBeDefined();
      expect(assocs.analyses.associationType).toBe('HasMany');
    });

    it('should hasMany AaConsentAuditLog as auditLogs', () => {
      const assocs = getAssociations(Model);
      expect(assocs.auditLogs).toBeDefined();
      expect(assocs.auditLogs.associationType).toBe('HasMany');
    });
  });
});
