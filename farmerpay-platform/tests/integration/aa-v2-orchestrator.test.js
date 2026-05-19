/**
 * AA Analysis Orchestrator — Unit Tests
 * Tests runAnalysis, getLatestAnalysis, getAnalysisHistory with mocked dependencies.
 */

// ─── Mock Redis ────────────────────────────────────────────────────

const mockRedisStore = {};

jest.mock('../../src/config/redis', () => ({
  getRedisClient: jest.fn(() => ({})),
  setWithTTL: jest.fn(async (key, value) => {
    mockRedisStore[key] = typeof value === 'object' ? JSON.stringify(value) : value;
  }),
  getKey: jest.fn(async (key) => {
    const val = mockRedisStore[key];
    if (!val) return null;
    try { return JSON.parse(val); } catch { return val; }
  }),
  deleteKeys: jest.fn(async () => {}),
}));

// ─── Mock Models ───────────────────────────────────────────────────

const mockAnalysisRecords = [];
const mockTransactionBulk = [];

const mockAaFinancialAnalysis = {
  update: jest.fn(async () => [1]),
  create: jest.fn(async (data) => {
    const record = { id: mockAnalysisRecords.length + 1, ...data, created_at: new Date() };
    mockAnalysisRecords.push(record);
    return record;
  }),
  findOne: jest.fn(async () => null),
  findAndCountAll: jest.fn(async () => ({ count: 0, rows: [] })),
};

const mockAaTransaction = {
  bulkCreate: jest.fn(async (records) => {
    mockTransactionBulk.push(...records);
    return records;
  }),
};

const mockAaBankStatementSummary = {
  findAll: jest.fn(async () => []),
  findOne: jest.fn(async () => null),
};

const mockAaConsentAuditLog = {
  create: jest.fn(async (data) => ({ id: 1, ...data })),
};

jest.mock('../../src/shared/models', () => ({
  AaFinancialAnalysis: mockAaFinancialAnalysis,
  AaTransaction: mockAaTransaction,
  AaBankStatementSummary: mockAaBankStatementSummary,
  AaConsentAuditLog: mockAaConsentAuditLog,
  AaConsent: {
    findByPk: jest.fn(async () => ({ data_from: '2025-01-01', data_to: '2026-01-01' })),
    // AA-C1: getLatestAnalysis now enforces an active, unexpired consent
    // before serving cached/DB analysis. Fixture returns an approved
    // consent with expires_at far in the future for the happy path.
    findOne: jest.fn(async () => ({
      id: 1,
      farmer_id: 42,
      consent_status: 'approved',
      is_active: true,
      expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    })),
  },
  sequelize: {
    transaction: jest.fn(async () => ({
      commit: jest.fn(),
      rollback: jest.fn(),
    })),
    authenticate: jest.fn(),
    close: jest.fn(),
  },
}));

// ─── Mock Analyzers ────────────────────────────────────────────────

jest.mock('../../src/modules/aa/services/analyzers/incomeClassifier', () => ({
  classifyAllCredits: jest.fn(() => ({
    categories: { farm_sale: { total: 50000, count: 3, transactions: [] } },
    summary: {
      totalCredits: 5, totalIncome: 80000, farmIncome: 50000,
      nonFarmIncome: 20000, govtTransfers: 10000, loanDisbursements: 0, classificationRate: 0.8,
    },
    classified: [
      { category: 'farm_sale', confidence: 0.9, narration: 'MANDI PAYMENT', amount: 25000 },
      { category: 'govt_transfer', confidence: 0.95, narration: 'PM-KISAN', amount: 6000 },
    ],
  })),
}));

jest.mock('../../src/modules/aa/services/analyzers/expenseDetector', () => ({
  classifyAllDebits: jest.fn(() => ({
    categories: {
      farm_input: { total: 15000, count: 2, transactions: [
        { category: 'farm_input', confidence: 0.85, narration: 'SEED PURCHASE', amount: 8000 },
      ] },
      household: { total: 10000, count: 3, transactions: [] },
    },
    summary: {
      totalDebits: 5, totalExpense: 30000, farmInputExpense: 15000,
      householdExpense: 10000, emiRepayments: 5000, cashWithdrawals: 3000, farmToHouseholdRatio: 1.5,
    },
  })),
}));

jest.mock('../../src/modules/aa/services/analyzers/seasonalityMapper', () => ({
  buildSeasonalityMap: jest.fn(() => ({
    monthlyMap: {},
    insights: {
      peakIncomeMonths: [{ month: 11, monthName: 'Nov' }],
      cashThinMonths: [{ month: 6, monthName: 'Jun' }],
      deficitMonthCount: 2,
      totalDeficit: 5000,
      emiSafeMonths: [10, 11, 12, 1, 2],
      incomeRegularity: 0.7,
      avgMonthlyNet: 5000,
      seasonPattern: { type: 'kharif_dominant', confidence: 0.8, peakMonths: [10, 11] },
      recommendedEmiSchedule: { type: 'seasonal_skip', skipMonths: [6, 7] },
    },
  })),
}));

jest.mock('../../src/modules/aa/services/analyzers/financialHealthScorer', () => ({
  computeFinancialHealthScore: jest.fn(() => ({
    score: 72,
    grade: 'B',
    components: {
      cashFlowStability: { score: 70, details: {} },
      balanceAdequacy: { score: 65, details: {} },
      incomeDiversity: { score: 60, details: { activeSources: 3, hhi: 0.4 } },
      debtDiscipline: { score: 85, details: { bounceCount: 1, bounceRate: 0.05 } },
      govtTransferAccess: { score: 75, details: { schemesDetected: ['PM-KISAN'] } },
      digitalAdoption: { score: 70, details: {} },
    },
    seasonality: {},
    drishtiInputs: { incomeCategories: {}, expenseCategories: {} },
    trustInputs: { financialHealthScore: 72, bounceRate: 1 },
    sentinelInputs: { cashFlowScore: 72, bounceCount: 1, avgMonthlyNet: 5000, deficitMonths: 2 },
  })),
}));

jest.mock('../../src/integrations/accountAggregator', () => ({
  aaConfig: { enabled: false, activeProvider: 'setu' },
  getProvider: jest.fn(),
  listProviders: jest.fn(() => []),
}));

jest.mock('../../src/shared/utils/logger', () => ({
  info: jest.fn(), warn: jest.fn(), error: jest.fn(),
}));

jest.mock('../../src/shared/utils/uuidHelper', () => ({
  generateUUID: jest.fn(() => `uuid-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`),
}));

jest.mock('../../src/shared/utils/paginationHelper', () => ({
  parsePagination: jest.fn((q) => ({ page: q.page || 1, limit: q.limit || 10, offset: ((q.page || 1) - 1) * (q.limit || 10) })),
  buildMeta: jest.fn((page, limit, count) => ({ page, limit, total: count })),
}));

// ─── Load Service Under Test ───────────────────────────────────────

const { runAnalysis, getLatestAnalysis, getAnalysisHistory } = require('../../src/modules/aa/services/aaAnalysisOrchestrator');

// ─── Reset state between tests ────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  Object.keys(mockRedisStore).forEach(k => delete mockRedisStore[k]);
  mockAnalysisRecords.length = 0;
  mockTransactionBulk.length = 0;
});

// ═══════════════════════════════════════════════════════════════════
// runAnalysis
// ═══════════════════════════════════════════════════════════════════

describe('runAnalysis', () => {
  const MOCK_TRANSACTIONS = [
    { narration: 'MANDI PAYMENT', amount: 25000, type: 'CREDIT', txnDate: '2025-10-15', currentBalance: 50000, mode: 'NEFT' },
    { narration: 'PM-KISAN', amount: 6000, type: 'CREDIT', txnDate: '2025-11-01', currentBalance: 56000, mode: 'DBT' },
    { narration: 'SEED PURCHASE', amount: 8000, type: 'DEBIT', txnDate: '2025-10-20', currentBalance: 42000, mode: 'UPI' },
    { narration: 'EMI NACH', amount: 5000, type: 'DEBIT', txnDate: '2025-11-05', currentBalance: 51000, mode: 'NACH' },
    { narration: 'GROCERY', amount: 3000, type: 'DEBIT', txnDate: '2025-11-10', currentBalance: 48000, mode: 'UPI' },
  ];

  describe('with raw transactions (full mode)', () => {
    it('should run classifiers and persist analysis', async () => {
      const result = await runAnalysis(42, MOCK_TRANSACTIONS, { consentId: 1, provider: 'setu' });

      expect(result).toBeDefined();
      expect(result.score).toBe(72);
      expect(result.grade).toBe('B');
      expect(result.analysisMode).toBe('raw_transactions');
      expect(result.transactionCount).toBe(5);
    });

    it('should persist to aa_financial_analyses', async () => {
      await runAnalysis(42, MOCK_TRANSACTIONS, { consentId: 1 });

      expect(mockAaFinancialAnalysis.create).toHaveBeenCalledTimes(1);
      const createCall = mockAaFinancialAnalysis.create.mock.calls[0][0];
      expect(createCall.farmer_id).toBe(42);
      expect(createCall.analysis_type).toBe('full');
      expect(createCall.analysis_mode).toBe('raw_transactions');
      expect(createCall.health_score).toBe(72);
      expect(createCall.health_grade).toBe('B');
      expect(createCall.is_latest).toBe(true);
      expect(createCall.score_components).toBeDefined();
      expect(createCall.bridge_data).toBeDefined();
    });

    it('should mark previous analyses as not latest', async () => {
      await runAnalysis(42, MOCK_TRANSACTIONS, { consentId: 1 });

      expect(mockAaFinancialAnalysis.update).toHaveBeenCalledWith(
        { is_latest: false },
        expect.objectContaining({
          where: { farmer_id: 42, is_latest: true },
        }),
      );
    });

    it('should bulk-persist raw transactions', async () => {
      await runAnalysis(42, MOCK_TRANSACTIONS, { consentId: 1 });

      expect(mockAaTransaction.bulkCreate).toHaveBeenCalled();
      expect(mockTransactionBulk.length).toBe(5);
      expect(mockTransactionBulk[0].farmer_id).toBe(42);
      expect(mockTransactionBulk[0].consent_id).toBe(1);
      expect(mockTransactionBulk[0].transaction_uuid).toBeDefined();
    });

    it('should cache result in Redis', async () => {
      const { setWithTTL } = require('../../src/config/redis');
      await runAnalysis(42, MOCK_TRANSACTIONS, { consentId: 1 });

      expect(setWithTTL).toHaveBeenCalledWith(
        'aa:analysis:42',
        expect.any(String),
        43200,
      );
    });

    it('should log audit event with analysis_run', async () => {
      await runAnalysis(42, MOCK_TRANSACTIONS, { consentId: 1, provider: 'setu' });

      expect(mockAaConsentAuditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          event_type: 'analysis_run',
          event_source: 'system',
          farmer_id: 42,
        }),
      );
    });

    it('should include bridge_data for all 5 modules', async () => {
      await runAnalysis(42, MOCK_TRANSACTIONS, { consentId: 1 });

      const createCall = mockAaFinancialAnalysis.create.mock.calls[0][0];
      const bridge = createCall.bridge_data;
      expect(bridge.trust).toBeDefined();
      expect(bridge.drishti).toBeDefined();
      expect(bridge.sentinel).toBeDefined();
      expect(bridge.dice).toBeDefined();
      expect(bridge.sathi).toBeDefined();
    });

    it('should extract risk flags', async () => {
      await runAnalysis(42, MOCK_TRANSACTIONS, { consentId: 1 });

      const createCall = mockAaFinancialAnalysis.create.mock.calls[0][0];
      expect(Array.isArray(createCall.risk_flags)).toBe(true);
    });
  });

  describe('summary fallback mode (no transactions)', () => {
    it('should return null when no summaries exist', async () => {
      mockAaBankStatementSummary.findAll.mockResolvedValueOnce([]);

      const result = await runAnalysis(42);
      expect(result).toBeNull();
    });

    it('should compute from summaries when no transactions', async () => {
      mockAaBankStatementSummary.findAll.mockResolvedValueOnce([{
        toJSON: () => ({
          avg_monthly_credit: 30000, avg_monthly_debit: 20000, avg_monthly_balance: 50000,
          bounce_count: 0, govt_subsidy_credits: 4, upi_transaction_count: 10,
        }),
      }]);

      const result = await runAnalysis(42, null, { consentId: 1 });

      expect(result).toBeDefined();
      expect(result.analysisMode).toBe('summary_fallback');
      expect(mockAaFinancialAnalysis.create).toHaveBeenCalledTimes(1);
      expect(mockAaTransaction.bulkCreate).not.toHaveBeenCalled();
    });
  });
});

// ═══════════════════════════════════════════════════════════════════
// getLatestAnalysis
// ═══════════════════════════════════════════════════════════════════

describe('getLatestAnalysis', () => {
  it('should return from Redis cache if available', async () => {
    const cached = { score: 72, grade: 'B', analysisMode: 'raw_transactions' };
    mockRedisStore['aa:analysis:42'] = JSON.stringify(cached);

    const result = await getLatestAnalysis(42);
    expect(result.score).toBe(72);
    expect(result.grade).toBe('B');
  });

  it('should fall back to DB when Redis empty', async () => {
    const now = new Date();
    mockAaFinancialAnalysis.findOne.mockResolvedValueOnce({
      analysis_uuid: 'uuid-test',
      health_score: '68.5',
      health_grade: 'B',
      score_components: { cashFlowStability: { score: 65 } },
      seasonality_data: null,
      bridge_data: { trust: {}, drishti: {}, sentinel: {} },
      analysis_mode: 'raw_transactions',
      transaction_count: 100,
      created_at: now,
    });

    const result = await getLatestAnalysis(42);
    expect(result).toBeDefined();
    expect(result.analysisUuid).toBe('uuid-test');
    expect(result.score).toBe(68.5);
    expect(result.stale).toBe(false);
  });

  it('should return null when no analysis exists', async () => {
    mockAaFinancialAnalysis.findOne.mockResolvedValueOnce(null);
    const result = await getLatestAnalysis(42);
    expect(result).toBeNull();
  });

  it('should mark stale analyses older than 12 hours', async () => {
    const staleDate = new Date(Date.now() - 13 * 60 * 60 * 1000); // 13h ago
    mockAaFinancialAnalysis.findOne.mockResolvedValueOnce({
      analysis_uuid: 'uuid-stale',
      health_score: '55',
      health_grade: 'C',
      score_components: {},
      seasonality_data: null,
      bridge_data: {},
      analysis_mode: 'summary_fallback',
      transaction_count: 0,
      created_at: staleDate,
    });

    const result = await getLatestAnalysis(42);
    expect(result.stale).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════
// getAnalysisHistory
// ═══════════════════════════════════════════════════════════════════

describe('getAnalysisHistory', () => {
  it('should return paginated results', async () => {
    mockAaFinancialAnalysis.findAndCountAll.mockResolvedValueOnce({
      count: 2,
      rows: [
        {
          analysis_uuid: 'uuid-1', health_score: '72', health_grade: 'B',
          analysis_type: 'full', analysis_mode: 'raw_transactions',
          transaction_count: 150, period_from: '2025-01-01', period_to: '2025-12-31',
          is_latest: true, created_at: new Date(),
        },
        {
          analysis_uuid: 'uuid-2', health_score: '55', health_grade: 'C',
          analysis_type: 'summary_only', analysis_mode: 'summary_fallback',
          transaction_count: 0, period_from: null, period_to: null,
          is_latest: false, created_at: new Date(Date.now() - 86400000),
        },
      ],
    });

    const result = await getAnalysisHistory(42, { page: 1, limit: 10 });

    expect(result.items).toHaveLength(2);
    expect(result.items[0].analysisUuid).toBe('uuid-1');
    expect(result.items[0].isLatest).toBe(true);
    expect(result.items[1].analysisMode).toBe('summary_fallback');
    expect(result.meta).toBeDefined();
    expect(result.meta.total).toBe(2);
  });

  it('should return empty items when no history', async () => {
    mockAaFinancialAnalysis.findAndCountAll.mockResolvedValueOnce({ count: 0, rows: [] });

    const result = await getAnalysisHistory(42);
    expect(result.items).toHaveLength(0);
    expect(result.meta.total).toBe(0);
  });
});
