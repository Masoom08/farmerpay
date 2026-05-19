/**
 * DICE Integration Tests
 * Full journey: search products → check eligibility → apply → track status
 */

const { initApp, getAgent, truncateTables, closeConnections } = require('../helpers/setup');
const { createTestUser, createTestLoanProduct } = require('../helpers/factories');

let agent, farmerToken, farmerId, loanProduct;

beforeAll(async () => {
  await initApp();
  agent = getAgent();
  const { token, user } = await createTestUser();
  farmerToken = token;
  farmerId = user.id;
  const productData = await createTestLoanProduct();
  loanProduct = productData.product;
});

afterAll(async () => {
  await truncateTables([
    'loan_insurance_bundled', 'loan_integration_logs', 'farmer_loan_bookmarks',
    'loan_repayments', 'loan_repayment_schedules', 'loan_disbursements',
    'loan_application_bank_notes', 'loan_application_documents',
    'loan_application_status_histories', 'loan_application_statuses',
    'loan_applications', 'loan_product_eligibility_rules', 'loan_products',
    'scale_of_finances', 'unit_economics', 'loan_subcategories',
    'loan_categories', 'loan_providers', 'loan_provider_types', 'users',
  ]);
  await closeConnections();
});

describe('DICE Integration', () => {
  let applicationId;

  // ─── Browse Products ──────────────────────────────────────────

  describe('GET /api/v1/dice/products', () => {
    it('should list available loan products', async () => {
      const res = await agent
        .get('/api/v1/dice/products')
        .set('Authorization', `Bearer ${farmerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
    });
  });

  // ─── Product Details ──────────────────────────────────────────

  describe('GET /api/v1/dice/products/:productId', () => {
    it('should return product details', async () => {
      const res = await agent
        .get(`/api/v1/dice/products/${loanProduct.id}`)
        .set('Authorization', `Bearer ${farmerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty('product_name');
    });

    it('should return 404 for non-existent product', async () => {
      const res = await agent
        .get('/api/v1/dice/products/99999')
        .set('Authorization', `Bearer ${farmerToken}`);

      expect(res.status).toBe(404);
    });
  });

  // ─── Apply for Loan ───────────────────────────────────────────

  describe('POST /api/v1/dice/applications', () => {
    it('should create a loan application', async () => {
      const res = await agent
        .post('/api/v1/dice/applications')
        .set('Authorization', `Bearer ${farmerToken}`)
        .send({
          loanProductId: loanProduct.id,
          requestedAmount: 100000,
          purpose: 'Kharif paddy cultivation',
        });

      expect([200, 201]).toContain(res.status);
      expect(res.body.success).toBe(true);
      if (res.body.data) {
        applicationId = res.body.data.applicationId || res.body.data.id;
      }
    });

    it('should reject application without required fields', async () => {
      const res = await agent
        .post('/api/v1/dice/applications')
        .set('Authorization', `Bearer ${farmerToken}`)
        .send({});

      expect(res.status).toBe(400);
    });
  });

  // ─── Track Application ────────────────────────────────────────

  describe('GET /api/v1/dice/applications/:applicationId', () => {
    it('should return application details', async () => {
      if (!applicationId) return;

      const res = await agent
        .get(`/api/v1/dice/applications/${applicationId}`)
        .set('Authorization', `Bearer ${farmerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty('requested_amount');
    });
  });

  // ─── My Applications ──────────────────────────────────────────

  describe('GET /api/v1/dice/applications', () => {
    it('should list farmer loan applications', async () => {
      const res = await agent
        .get('/api/v1/dice/applications')
        .set('Authorization', `Bearer ${farmerToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });
});
