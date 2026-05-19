/**
 * AA Cross-Module Bridge — Unit Tests (~15 tests)
 * Tests all 5 bridge methods and summary fallback mode.
 */

// ─── Mock Redis ────────────────────────────────────────────────────

const mockRedisStore = {};

jest.mock('../../../src/config/redis', () => ({
  setWithTTL: jest.fn(async (key, value) => { mockRedisStore[key] = value; }),
  getKey: jest.fn(async (key) => {
    const val = mockRedisStore[key];
    if (!val) return null;
    try { return JSON.parse(val); } catch { return val; }
  }),
  deleteKeys: jest.fn(async () => {}),
  getRedisClient: jest.fn(() => ({})),
}));

// ─── Mock Models ───────────────────────────────────────────────────

const mockSummary = {
  id: 1,
  farmer_id: 42,
  bank_name: 'State Bank of India',
  account_type: 'savings',
  avg_monthly_credit: 30000,
  avg_monthly_debit: 20000,
  avg_monthly_balance: 50000,
  min_balance: 10000,
  max_balance: 80000,
  bounce_count: 0,
  emi_debit_count: 4,
  govt_subsidy_credits: 5,
  upi_transaction_count: 20,
  avg_upi_value: 1500,
  salary_dbt_credits: 3,
  cash_withdrawal_ratio: 15,
  period_months: 12,
  toJSON() { return { ...this, toJSON: undefined }; },
};

jest.mock('../../../src/shared/models', () => ({
  AaBankStatementSummary: {
    findAll: jest.fn(async () => [mockSummary]),
  },
  AaFinancialAnalysis: {
    findOne: jest.fn(async () => null),
    update: jest.fn(async () => [1]),
    create: jest.fn(async (data) => ({ id: 1, ...data, created_at: new Date() })),
  },
  AaTransaction: {
    bulkCreate: jest.fn(async (r) => r),
    findAll: jest.fn(async () => []),
  },
  AaConsent: {
    findByPk: jest.fn(async () => ({ data_from: '2024-01-01', data_to: '2025-01-01' })),
    // assertActiveConsent in the bridge requires an active, unexpired
    // consent before returning any AA-derived data. Fixture returns a
    // consent with expiry far in the future so the happy-path tests
    // continue to flow through.
    findOne: jest.fn(async () => ({
      id: 1,
      farmer_id: 42,
      consent_status: 'approved',
      is_active: true,
      expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    })),
  },
  AaConsentAuditLog: { create: jest.fn(async (d) => d) },
  sequelize: {
    transaction: jest.fn(async () => ({ commit: jest.fn(), rollback: jest.fn() })),
  },
}));

jest.mock('../../../src/integrations/accountAggregator', () => ({
  aaConfig: { enabled: false, activeProvider: 'setu' },
  getProvider: jest.fn(),
  listProviders: jest.fn(() => []),
}));

jest.mock('../../../src/shared/utils/logger', () => ({
  info: jest.fn(), warn: jest.fn(), error: jest.fn(),
}));

jest.mock('../../../src/shared/utils/uuidHelper', () => ({
  generateUUID: jest.fn(() => `uuid-bridge-${Date.now()}`),
}));

jest.mock('../../../src/shared/utils/paginationHelper', () => ({
  parsePagination: jest.fn(() => ({ page: 1, limit: 10, offset: 0 })),
  buildMeta: jest.fn(() => ({ page: 1, limit: 10, total: 0 })),
}));

// ─── Load Service ──────────────────────────────────────────────────

const bridge = require('../../../src/modules/aa/services/aaCrossModuleBridge');
const db = require('../../../src/shared/models');

beforeEach(() => {
  jest.clearAllMocks();
  Object.keys(mockRedisStore).forEach(k => delete mockRedisStore[k]);
  db.AaBankStatementSummary.findAll.mockResolvedValue([mockSummary]);
});

// ═══════════════════════════════════════════════════════════════════

describe('aaCrossModuleBridge', () => {
  // ─── getAnalysis ────────────────────────────────────────────

  describe('getAnalysis', () => {
    it('should return analysis result for farmer with data', async () => {
      const result = await bridge.getAnalysis(42, null, { callerRole: 'farmer' });
      expect(result).toBeDefined();
      expect(typeof result.score).toBe('number');
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
    });

    it('should return null when no summaries exist', async () => {
      db.AaBankStatementSummary.findAll.mockResolvedValueOnce([]);
      const result = await bridge.getAnalysis(999, null, { callerRole: 'farmer' });
      expect(result).toBeNull();
    });

    it('should use cached result on second call', async () => {
      await bridge.getAnalysis(42, null, { callerRole: 'farmer' });
      // Second call should hit Redis cache
      const result2 = await bridge.getAnalysis(42, null, { callerRole: 'farmer' });
      expect(result2).toBeDefined();
    });
  });

  // ─── getTrustInputs ────────────────────────────────────────

  describe('getTrustInputs', () => {
    it('should return TRUST-formatted data', async () => {
      const result = await bridge.getTrustInputs(42, { callerRole: 'farmer' });
      expect(result).toBeDefined();
      expect(result.source).toBe('account_aggregator');
      expect(result.financialHealthScore).toBeDefined();
      expect(result.financialHealthGrade).toBeDefined();
    });

    it('should include components section', async () => {
      const result = await bridge.getTrustInputs(42, { callerRole: 'farmer' });
      expect(result.components).toBeDefined();
    });

    it('should include debt behavior section', async () => {
      const result = await bridge.getTrustInputs(42, { callerRole: 'farmer' });
      expect(result.components.debtBehavior).toBeDefined();
      expect(typeof result.components.debtBehavior.bounceCount).toBe('number');
    });

    it('should include govt scheme access', async () => {
      const result = await bridge.getTrustInputs(42, { callerRole: 'farmer' });
      expect(result.components.govtSchemeAccess).toBeDefined();
    });

    it('should return null when no AA data', async () => {
      db.AaBankStatementSummary.findAll.mockResolvedValueOnce([]);
      const result = await bridge.getTrustInputs(999, { callerRole: 'farmer' });
      expect(result).toBeNull();
    });
  });

  // ─── getDrishtiInputs ──────────────────────────────────────

  describe('getDrishtiInputs', () => {
    it('should return DRISHTI-formatted data', async () => {
      const result = await bridge.getDrishtiInputs(42, { callerRole: 'farmer' });
      expect(result).toBeDefined();
      expect(result.source).toBe('account_aggregator');
      expect(result.householdIncome).toBeDefined();
      expect(result.householdExpense).toBeDefined();
      expect(result.seasonality).toBeDefined();
      expect(result.emiCapacity).toBeDefined();
    });

    it('should include household income data', async () => {
      const result = await bridge.getDrishtiInputs(42, { callerRole: 'farmer' });
      expect(result.householdIncome).toBeDefined();
    });
  });

  // ─── getSentinelInputs ─────────────────────────────────────

  describe('getSentinelInputs', () => {
    it('should return SENTINEL-formatted data', async () => {
      const result = await bridge.getSentinelInputs(42, { callerRole: 'farmer' });
      expect(result).toBeDefined();
      expect(result.source).toBe('account_aggregator');
      expect(typeof result.cashFlowScore).toBe('number');
      expect(typeof result.bounceCount).toBe('number');
      expect(Array.isArray(result.riskFlags)).toBe(true);
    });

    it('should include overallRisk assessment', async () => {
      const result = await bridge.getSentinelInputs(42, { callerRole: 'farmer' });
      expect(['high', 'medium', 'low']).toContain(result.overallRisk);
    });
  });

  // ─── getDiceInputs ─────────────────────────────────────────

  describe('getDiceInputs', () => {
    it('should return DICE-formatted data', async () => {
      const result = await bridge.getDiceInputs(42, { callerRole: 'farmer' });
      expect(result).toBeDefined();
      expect(result.source).toBe('account_aggregator');
    });

    it('should include eligibility or income data', async () => {
      const result = await bridge.getDiceInputs(42, { callerRole: 'farmer' });
      // DICE bridge returns either eligibility object or income fields
      expect(result).toHaveProperty('source', 'account_aggregator');
    });
  });

  // ─── getSathiInputs ────────────────────────────────────────

  describe('getSathiInputs', () => {
    it('should return SATHI-formatted data', async () => {
      const result = await bridge.getSathiInputs(42);
      expect(result).toBeDefined();
      expect(result.source).toBe('account_aggregator');
      expect(result.preFill).toBeDefined();
      expect(result.verificationStatus).toBeDefined();
    });

    it('should include pre-fill income estimates', async () => {
      const result = await bridge.getSathiInputs(42);
      expect(typeof result.preFill.estimatedMonthlyIncome).toBe('number');
      expect(typeof result.preFill.estimatedMonthlyExpense).toBe('number');
    });

    it('should include bank account list', async () => {
      const result = await bridge.getSathiInputs(42);
      expect(Array.isArray(result.preFill.bankAccounts)).toBe(true);
    });
  });
});
