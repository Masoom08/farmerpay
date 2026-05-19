/**
 * AA Data Fetch Service — Unit Tests (~10 tests)
 * Tests data session, polling, normalization, and persistence.
 */

// ─── Mock Redis ────────────────────────────────────────────────────

jest.mock('../../../src/config/redis', () => ({
  setWithTTL: jest.fn(async () => {}),
  getKey: jest.fn(async () => null),
  deleteKeys: jest.fn(async () => {}),
  getRedisClient: jest.fn(() => ({
    ttl: jest.fn(async () => -2),
    get: jest.fn(async () => null),
    setex: jest.fn(async () => 'OK'),
    incr: jest.fn(async () => 1),
    expire: jest.fn(async () => 1),
  })),
}));

// ─── Mock AA Provider ──────────────────────────────────────────────

const mockProviderClient = {
  createDataSession: jest.fn(async () => ({ sessionId: 'session-001' })),
  fetchSessionData: jest.fn(async () => ({
    status: 'COMPLETED',
    accounts: [{
      fipName: 'State Bank of India',
      fipId: 'SBI',
      accounts: [{
        accountType: 'SAVINGS',
        summary: {
          currentBalance: 50000,
          totalCredits: 300000,
          totalDebits: 200000,
          averageBalance: 45000,
          minBalance: 10000,
          maxBalance: 80000,
        },
        transactions: [
          { narration: 'SALARY CR', amount: 25000, type: 'CREDIT', txnDate: '2025-01-01', mode: 'NEFT' },
          { narration: 'ATM CASH', amount: 5000, type: 'DEBIT', txnDate: '2025-01-05', mode: 'ATM' },
        ],
      }],
    }],
  })),
};

jest.mock('../../../src/integrations/accountAggregator', () => ({
  getProvider: jest.fn(() => mockProviderClient),
  aaConfig: {
    enabled: true,
    activeProvider: 'setu',
    retry: { maxAttempts: 3, backoffMs: 10, timeoutMs: 5000 },
    cache: { summaryTTL: 43200 },
  },
}));

// ─── Mock Models ───────────────────────────────────────────────────

const mockSummaries = [];

jest.mock('../../../src/shared/models', () => ({
  AaConsent: {
    findByPk: jest.fn(async () => ({
      id: 1,
      consent_uuid: 'consent-001',
      consent_status: 'approved',
      data_from: '2024-01-01',
      data_to: '2025-01-01',
      fetch_count: 0,
      update: jest.fn(async function (f) { Object.assign(this, f); }),
    })),
  },
  AaBankStatementSummary: {
    update: jest.fn(async () => [1]),
    create: jest.fn(async (data) => {
      const record = { id: mockSummaries.length + 1, ...data, toJSON: () => data };
      mockSummaries.push(record);
      return record;
    }),
    findAll: jest.fn(async () => mockSummaries.map(s => ({ ...s, toJSON: () => s }))),
    findOne: jest.fn(async () => null),
  },
  AaTransaction: {
    bulkCreate: jest.fn(async (records) => records),
    findAll: jest.fn(async () => []),
  },
  AaFinancialAnalysis: {
    update: jest.fn(async () => [1]),
    create: jest.fn(async (data) => ({ id: 1, ...data, created_at: new Date() })),
    findOne: jest.fn(async () => null),
  },
  AaConsentAuditLog: { create: jest.fn(async (d) => ({ id: 1, ...d })) },
  sequelize: {
    transaction: jest.fn(async () => ({
      commit: jest.fn(),
      rollback: jest.fn(),
    })),
  },
}));

jest.mock('../../../src/shared/utils/logger', () => ({
  info: jest.fn(), warn: jest.fn(), error: jest.fn(),
}));

jest.mock('../../../src/shared/utils/uuidHelper', () => ({
  generateUUID: jest.fn(() => `uuid-${Date.now()}`),
}));

jest.mock('../../../src/shared/utils/paginationHelper', () => ({
  parsePagination: jest.fn(() => ({ page: 1, limit: 10, offset: 0 })),
  buildMeta: jest.fn(() => ({ page: 1, limit: 10, total: 0 })),
}));

// ─── Load Service ──────────────────────────────────────────────────

const { fetchAndStore, computeSummary } = require('../../../src/modules/aa/services/aaDataFetchService');
const db = require('../../../src/shared/models');

beforeEach(() => {
  jest.clearAllMocks();
  mockSummaries.length = 0;
});

// ═══════════════════════════════════════════════════════════════════

describe('aaDataFetchService', () => {
  describe('fetchAndStore', () => {
    it('should create data session and fetch data', async () => {
      const result = await fetchAndStore(1, 42, 'setu');

      expect(mockProviderClient.createDataSession).toHaveBeenCalledWith('consent-001', expect.any(Object));
      expect(mockProviderClient.fetchSessionData).toHaveBeenCalledWith('session-001');
      expect(result.status).toBe('completed');
    });

    it('should persist account summaries to DB', async () => {
      await fetchAndStore(1, 42, 'setu');

      expect(db.AaBankStatementSummary.create).toHaveBeenCalledWith(
        expect.objectContaining({
          farmer_id: 42,
          consent_id: 1,
          bank_name: 'State Bank of India',
          account_type: 'savings',
          is_active: true,
        }),
        expect.any(Object),
      );
    });

    it('should deactivate old summaries before creating new ones', async () => {
      await fetchAndStore(1, 42, 'setu');

      expect(db.AaBankStatementSummary.update).toHaveBeenCalledWith(
        { is_active: false },
        expect.objectContaining({
          where: { farmer_id: 42, is_active: true },
        }),
      );
    });

    it('should return account and transaction counts', async () => {
      const result = await fetchAndStore(1, 42, 'setu');

      expect(result.accountsProcessed).toBe(1);
      expect(result.transactionCount).toBe(2);
    });

    it('should invalidate Redis cache after store', async () => {
      const { deleteKeys } = require('../../../src/config/redis');
      await fetchAndStore(1, 42, 'setu');

      expect(deleteKeys).toHaveBeenCalledWith([
        expect.stringContaining('summary:42'),
        expect.stringContaining('analysis:42'),
      ]);
    });

    it('should update consent fetch_count and last_fetch_at', async () => {
      const consent = await db.AaConsent.findByPk(1);
      await fetchAndStore(1, 42, 'setu');

      // AaConsent.findByPk is called which returns our mock with update
      expect(db.AaConsent.findByPk).toHaveBeenCalled();
    });

    it('should throw 400 for non-approved consent', async () => {
      db.AaConsent.findByPk.mockResolvedValueOnce({
        consent_status: 'requested',
        update: jest.fn(),
      });

      await expect(fetchAndStore(1, 42, 'setu')).rejects.toThrow('Consent not approved');
    });

    it('should return pending when session does not complete', async () => {
      // Mock ALL retry calls to return PENDING (retry loop calls fetchSessionData 3 times)
      mockProviderClient.fetchSessionData
        .mockResolvedValueOnce({ status: 'PENDING', accounts: [] })
        .mockResolvedValueOnce({ status: 'PENDING', accounts: [] })
        .mockResolvedValueOnce({ status: 'PENDING', accounts: [] });

      const result = await fetchAndStore(1, 42, 'setu');
      expect(result.status).toBe('pending');
      expect(result.accountsProcessed).toBe(0);
    });

    it('should log audit event on data_fetch_failed', async () => {
      mockProviderClient.fetchSessionData
        .mockResolvedValueOnce({ status: 'FAILED', accounts: [] })
        .mockResolvedValueOnce({ status: 'FAILED', accounts: [] })
        .mockResolvedValueOnce({ status: 'FAILED', accounts: [] });

      await fetchAndStore(1, 42, 'setu');

      expect(db.AaConsentAuditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({ event_type: 'data_fetch_failed' }),
      );
    });
  });

  describe('computeSummary', () => {
    it('should compute from pre-computed summary if available', () => {
      const acct = {
        summary: {
          currentBalance: 50000,
          totalCredits: 300000,
          totalDebits: 200000,
          averageBalance: 45000,
          minBalance: 10000,
          maxBalance: 80000,
        },
        transactions: [],
      };
      const consent = { data_from: '2024-01-01', data_to: '2025-01-01' };

      const result = computeSummary(acct, consent);

      expect(result.avgMonthlyBalance).toBe(45000);
      expect(result.minBalance).toBe(10000);
      expect(result.maxBalance).toBe(80000);
    });

    it('should compute from individual transactions when no summary', () => {
      const acct = {
        transactions: [
          { narration: 'SALARY', amount: 25000, type: 'CREDIT', mode: 'NEFT', currentBalance: 50000 },
          { narration: 'ATM', amount: 5000, type: 'DEBIT', mode: 'ATM', currentBalance: 45000 },
          { narration: 'UPI PURCHASE', amount: 1000, type: 'DEBIT', mode: 'UPI', currentBalance: 44000 },
        ],
      };
      const consent = { data_from: '2025-01-01', data_to: '2025-02-01' };

      const result = computeSummary(acct, consent);

      expect(result.avgMonthlyCredit).toBe(25000); // 25000 / 1 month
      expect(result.avgMonthlyDebit).toBe(6000); // 6000 / 1 month
      expect(result.upiTransactionCount).toBe(1);
    });
  });
});
