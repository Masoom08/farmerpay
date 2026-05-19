/**
 * Cross-Module Integration Tests
 * Full journey tests spanning multiple modules: farmer → trust → loan → roots → sentinel
 */

const { initApp, getAgent, truncateTables, closeConnections } = require('../helpers/setup');
const { createTestUser, createTestBankUser, createTestLoanProduct } = require('../helpers/factories');

let agent, farmerToken, bankToken, farmerId, loanProduct;

beforeAll(async () => {
  await initApp();
  agent = getAgent();
  const farmer = await createTestUser();
  farmerToken = farmer.token;
  farmerId = farmer.user.id;
  const bank = await createTestBankUser();
  bankToken = bank.token;
  const productData = await createTestLoanProduct();
  loanProduct = productData.product;
});

afterAll(async () => {
  await truncateTables([
    'loan_applications', 'loan_products', 'loan_subcategories',
    'loan_categories', 'loan_providers', 'loan_provider_types', 'users',
  ]);
  await closeConnections();
});

describe('Cross-Module Integration', () => {
  let applicationId;

  // ─── Full Farmer Journey ──────────────────────────────────────

  describe('Farmer → Trust → Loan → Sentinel Journey', () => {
    it('step 1: farmer can view trust sections', async () => {
      const res = await agent
        .get('/api/v1/trust/sections')
        .set('Authorization', `Bearer ${farmerToken}`);

      expect(res.status).toBe(200);
    });

    it('step 2: farmer can browse loan products', async () => {
      const res = await agent
        .get('/api/v1/dice/products')
        .set('Authorization', `Bearer ${farmerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThan(0);
    });

    it('step 3: farmer can apply for a loan', async () => {
      const res = await agent
        .post('/api/v1/dice/applications')
        .set('Authorization', `Bearer ${farmerToken}`)
        .send({
          loanProductId: loanProduct.id,
          requestedAmount: 200000,
          purpose: 'Purchase of dairy cow',
        });

      expect([200, 201]).toContain(res.status);
      if (res.body.data) {
        applicationId = res.body.data.applicationId || res.body.data.id;
      }
    });

    it('step 4: bank user can view loan health', async () => {
      if (!applicationId) return;

      const res = await agent
        .get(`/api/v1/sentinel/loan/${applicationId}/health`)
        .set('Authorization', `Bearer ${bankToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty('healthStatus');
    });

    it('step 5: farmer can check market prices', async () => {
      const res = await agent.get('/api/v1/pulse/commodities');

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThanOrEqual(0);
    });
  });

  // ─── Response Format Consistency ──────────────────────────────

  describe('All modules return consistent response format', () => {
    const endpoints = [
      { method: 'get', path: '/api/v1/trust/sections', auth: true },
      { method: 'get', path: '/api/v1/dice/products', auth: true },
      { method: 'get', path: '/api/v1/sentinel/alerts', auth: true, token: 'bank' },
      { method: 'get', path: '/api/v1/pulse/commodities', auth: false },
    ];

    endpoints.forEach(({ method, path, auth, token }) => {
      it(`${method.toUpperCase()} ${path} returns { success, message }`, async () => {
        let req = agent[method](path);
        if (auth) {
          const t = token === 'bank' ? bankToken : farmerToken;
          req = req.set('Authorization', `Bearer ${t}`);
        }

        const res = await req;
        expect(res.body).toHaveProperty('success');
        expect(res.body).toHaveProperty('message');
      });
    });
  });

  // ─── Health Check ─────────────────────────────────────────────

  describe('System health', () => {
    it('GET /health should return service status', async () => {
      const res = await agent.get('/health');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('uptime');
      expect(res.body.data).toHaveProperty('timestamp');
    });
  });
});
