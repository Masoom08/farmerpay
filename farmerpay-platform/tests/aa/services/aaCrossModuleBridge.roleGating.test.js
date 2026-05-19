/**
 * AA Cross-Module Bridge — Role Gating Tests
 * Verifies that FHS / transaction-derived data is structurally blocked for Sathi callers.
 * Source of truth: DESIGN-SYSTEM-SCORE-DISPLAY.md § Pattern 2
 */

// ─── Mock Redis ────────────────────────────────────────────────────

jest.mock('../../../src/config/redis', () => ({
  setWithTTL: jest.fn(async () => {}),
  getKey: jest.fn(async () => null),
  deleteKeys: jest.fn(async () => {}),
  getRedisClient: jest.fn(() => ({})),
}));

// ─── Mock Models ───────────────────────────────────────────────────

jest.mock('../../../src/shared/models', () => ({
  AaBankStatementSummary: {
    findAll: jest.fn(async () => [{
      id: 1, farmer_id: 42, bank_name: 'SBI', account_type: 'savings',
      avg_monthly_credit: 30000, avg_monthly_debit: 20000, avg_monthly_balance: 50000,
      min_balance: 10000, max_balance: 80000, bounce_count: 0, emi_debit_count: 4,
      govt_subsidy_credits: 5, upi_transaction_count: 20, avg_upi_value: 1500,
      salary_dbt_credits: 3, cash_withdrawal_ratio: 15, period_months: 12,
      toJSON() { return { ...this, toJSON: undefined }; },
    }]),
  },
  AaFinancialAnalysis: {
    findOne: jest.fn(async () => null),
    update: jest.fn(async () => [1]),
    create: jest.fn(async (data) => ({ id: 1, ...data, created_at: new Date() })),
  },
  AaTransaction: { bulkCreate: jest.fn(async (r) => r), findAll: jest.fn(async () => []) },
  AaConsent: {
    findByPk: jest.fn(async () => ({ data_from: '2024-01-01', data_to: '2025-01-01' })),
    // AA-C3: assertActiveConsent gate in the bridge calls findOne before
    // returning any analysis. Return an approved, unexpired consent so
    // the role-gating assertion is the thing actually being tested.
    findOne: jest.fn(async () => ({
      id: 1, farmer_id: 42,
      consent_status: 'approved', is_active: true,
      expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    })),
  },
  AaConsentAuditLog: { create: jest.fn(async (d) => d) },
  sequelize: { transaction: jest.fn(async () => ({ commit: jest.fn(), rollback: jest.fn() })) },
}));

// ─── Import SUT ───────────────────────────────────────────────────

const bridge = require('../../../src/modules/aa/services/aaCrossModuleBridge');

const FARMER_ID = 42;

// ─── Tests ────────────────────────────────────────────────────────

describe('Role gating — Sathi blocked from FHS data', () => {
  const sathiRoles = ['sathi', 'sathi_agent'];

  describe('assertRoleAllowed', () => {
    test('throws 403 for sathi role', () => {
      expect(() => bridge.assertRoleAllowed('sathi', 'test')).toThrow();
      try {
        bridge.assertRoleAllowed('sathi', 'test');
      } catch (err) {
        expect(err.statusCode).toBe(403);
        expect(err.errorCode).toBe('READINESS_ROLE_FORBIDDEN');
      }
    });

    test('throws 403 for sathi_agent role', () => {
      expect(() => bridge.assertRoleAllowed('sathi_agent', 'test')).toThrow();
      try {
        bridge.assertRoleAllowed('sathi_agent', 'test');
      } catch (err) {
        expect(err.statusCode).toBe(403);
        expect(err.errorCode).toBe('READINESS_ROLE_FORBIDDEN');
      }
    });

    test('throws 400 when callerRole is missing', () => {
      expect(() => bridge.assertRoleAllowed(undefined, 'test')).toThrow();
      try {
        bridge.assertRoleAllowed(undefined, 'test');
      } catch (err) {
        expect(err.statusCode).toBe(400);
        expect(err.errorCode).toBe('READINESS_ROLE_REQUIRED');
      }
    });

    test('does not throw for farmer role', () => {
      expect(() => bridge.assertRoleAllowed('farmer', 'test')).not.toThrow();
    });

    test('does not throw for banker role', () => {
      expect(() => bridge.assertRoleAllowed('banker', 'test')).not.toThrow();
    });

    test('does not throw for system role', () => {
      expect(() => bridge.assertRoleAllowed('system', 'test')).not.toThrow();
    });
  });

  describe('getAnalysis', () => {
    for (const role of sathiRoles) {
      test(`throws 403 for callerRole=${role}`, async () => {
        await expect(bridge.getAnalysis(FARMER_ID, null, { callerRole: role }))
          .rejects.toMatchObject({ statusCode: 403, errorCode: 'READINESS_ROLE_FORBIDDEN' });
      });
    }

    test('does not throw for callerRole=farmer', async () => {
      await expect(bridge.getAnalysis(FARMER_ID, null, { callerRole: 'farmer' }))
        .resolves.toBeDefined();
    });
  });

  describe('getTrustInputs', () => {
    for (const role of sathiRoles) {
      test(`throws 403 for callerRole=${role}`, async () => {
        await expect(bridge.getTrustInputs(FARMER_ID, { callerRole: role }))
          .rejects.toMatchObject({ statusCode: 403, errorCode: 'READINESS_ROLE_FORBIDDEN' });
      });
    }
  });

  describe('getDrishtiInputs', () => {
    for (const role of sathiRoles) {
      test(`throws 403 for callerRole=${role}`, async () => {
        await expect(bridge.getDrishtiInputs(FARMER_ID, { callerRole: role }))
          .rejects.toMatchObject({ statusCode: 403, errorCode: 'READINESS_ROLE_FORBIDDEN' });
      });
    }
  });

  describe('getSentinelInputs', () => {
    for (const role of sathiRoles) {
      test(`throws 403 for callerRole=${role}`, async () => {
        await expect(bridge.getSentinelInputs(FARMER_ID, { callerRole: role }))
          .rejects.toMatchObject({ statusCode: 403, errorCode: 'READINESS_ROLE_FORBIDDEN' });
      });
    }
  });

  describe('getDiceInputs', () => {
    for (const role of sathiRoles) {
      test(`throws 403 for callerRole=${role}`, async () => {
        await expect(bridge.getDiceInputs(FARMER_ID, { callerRole: role }))
          .rejects.toMatchObject({ statusCode: 403, errorCode: 'READINESS_ROLE_FORBIDDEN' });
      });
    }
  });

  describe('getSathiInputs — NOT gated (pre-fill only)', () => {
    test('does not throw for callerRole=sathi', async () => {
      // getSathiInputs returns pre-fill aggregate data, not FHS components
      await expect(bridge.getSathiInputs(FARMER_ID, { callerRole: 'sathi' }))
        .resolves.toBeDefined();
    });
  });
});

describe('Role gating — allowed roles pass through', () => {
  const allowedRoles = ['farmer', 'banker', 'admin', 'system'];

  for (const role of allowedRoles) {
    test(`getAnalysis succeeds for callerRole=${role}`, async () => {
      await expect(bridge.getAnalysis(FARMER_ID, null, { callerRole: role }))
        .resolves.toBeDefined();
    });
  }
});
