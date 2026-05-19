/**
 * Sentinel Integration Tests
 * Full journey: loan health → SMA classification → EWS alerts → recovery
 */

const { initApp, getAgent, truncateTables, closeConnections } = require('../helpers/setup');
const { createTestUser, createTestBankUser, createTestLoanProduct, createTestLoanApplication } = require('../helpers/factories');

let agent, bankToken, loanApp;

beforeAll(async () => {
  await initApp();
  agent = getAgent();
  const bankData = await createTestBankUser();
  bankToken = bankData.token;
  const farmerData = await createTestUser();
  const productData = await createTestLoanProduct();
  loanApp = await createTestLoanApplication(farmerData.user.id, productData.product.id);
});

afterAll(async () => {
  await truncateTables([
    'recovery_action_logs', 'recovery_cases', 'ews_alerts', 'ews_signals',
    'red_flag_events', 'sma_classification_logs', 'loan_health_snapshots',
    'loan_applications', 'loan_products', 'loan_subcategories',
    'loan_categories', 'loan_providers', 'loan_provider_types', 'users',
  ]);
  await closeConnections();
});

describe('Sentinel Integration', () => {
  // ─── Loan Health ──────────────────────────────────────────────

  describe('GET /api/v1/sentinel/loan/:applicationId/health', () => {
    it('should return loan health data', async () => {
      const res = await agent
        .get(`/api/v1/sentinel/loan/${loanApp.id}/health`)
        .set('Authorization', `Bearer ${bankToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('healthStatus');
      expect(res.body.data).toHaveProperty('smaClassification');
    });

    it('should return 404 for non-existent application', async () => {
      const res = await agent
        .get('/api/v1/sentinel/loan/99999/health')
        .set('Authorization', `Bearer ${bankToken}`);

      expect(res.status).toBe(404);
    });
  });

  // ─── Loan Risk ────────────────────────────────────────────────

  describe('GET /api/v1/sentinel/loan/:applicationId/risk', () => {
    it('should return risk analysis', async () => {
      const res = await agent
        .get(`/api/v1/sentinel/loan/${loanApp.id}/risk`)
        .set('Authorization', `Bearer ${bankToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty('ewsSignals');
      expect(res.body.data).toHaveProperty('suggestedActions');
    });
  });

  // ─── Cash Flow ────────────────────────────────────────────────

  describe('GET /api/v1/sentinel/loan/:applicationId/cashflow', () => {
    it('should return cash flow projections', async () => {
      const res = await agent
        .get(`/api/v1/sentinel/loan/${loanApp.id}/cashflow`)
        .set('Authorization', `Bearer ${bankToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty('projections');
    });
  });

  // ─── Alerts ───────────────────────────────────────────────────

  describe('GET /api/v1/sentinel/alerts', () => {
    it('should return EWS alerts', async () => {
      const res = await agent
        .get('/api/v1/sentinel/alerts')
        .set('Authorization', `Bearer ${bankToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('meta');
    });
  });

  // ─── Portfolio ────────────────────────────────────────────────

  describe('GET /api/v1/sentinel/portfolio', () => {
    it('should return portfolio overview', async () => {
      const res = await agent
        .get('/api/v1/sentinel/portfolio')
        .set('Authorization', `Bearer ${bankToken}`);

      expect(res.status).toBe(200);
      expect(res.body.meta).toHaveProperty('portfolioHealth');
    });
  });

  // ─── Recovery Cases ───────────────────────────────────────────

  describe('GET /api/v1/sentinel/recovery/cases', () => {
    it('should return recovery cases list', async () => {
      const res = await agent
        .get('/api/v1/sentinel/recovery/cases')
        .set('Authorization', `Bearer ${bankToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });
});
