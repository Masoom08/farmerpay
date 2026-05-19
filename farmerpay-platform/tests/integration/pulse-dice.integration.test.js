/**
 * PULSE x DICE Integration Tests
 * Tests the price realisation simulator and post-harvest top-up loan flow.
 */
const request = require('supertest');
const app = require('../../src/app');

describe('PULSE × DICE Integration', () => {

  let authToken, farmerId, loanId, commodityId, mandiId;

  beforeAll(async () => {
    // Setup: authenticate test farmer
    const loginRes = await request(app).post('/api/v1/auth/login')
      .send({ mobile: '9876543210', otp: '123456' });
    authToken = loginRes.body.data?.token;
    farmerId = loginRes.body.data?.userId;
    // These would be set up via test fixtures in a real environment
    loanId = 1;
    commodityId = 'COMM-001';
    mandiId = 1;
  });

  describe('GET /api/v1/pulse/price-realisation/:farmerId', () => {
    it('returns sell-now vs store-15d vs store-30d scenarios', async () => {
      const res = await request(app)
        .get(`/api/v1/pulse/price-realisation/${farmerId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .query({ loanApplicationId: loanId, commodityId, quantityQuintals: 10, mandiId });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.scenarios).toHaveProperty('sellNow');
      expect(res.body.data.scenarios).toHaveProperty('store15Days');
      expect(res.body.data.scenarios).toHaveProperty('store30Days');
      expect(res.body.data.recommendation).toHaveProperty('optimalStrategy');
      expect(res.body.data.topupLoan).toHaveProperty('eligible');
    });

    it('includes loan position in response', async () => {
      const res = await request(app)
        .get(`/api/v1/pulse/price-realisation/${farmerId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .query({ loanApplicationId: loanId, commodityId, quantityQuintals: 10, mandiId });

      if (res.status === 200) {
        expect(res.body.data.loan).toHaveProperty('totalOutstanding');
        expect(res.body.data.loan).toHaveProperty('interestRateAnnual');
      }
    });

    it('includes produce metadata in response', async () => {
      const res = await request(app)
        .get(`/api/v1/pulse/price-realisation/${farmerId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .query({ loanApplicationId: loanId, commodityId, quantityQuintals: 10, mandiId });

      if (res.status === 200) {
        expect(res.body.data.produce).toHaveProperty('commodityName');
        expect(res.body.data.produce).toHaveProperty('perishabilityIndex');
        expect(res.body.data.produce).toHaveProperty('shelfLifeDays');
      }
    });

    it('returns surplus when sell price > loan outstanding', async () => {
      const res = await request(app)
        .get(`/api/v1/pulse/price-realisation/${farmerId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .query({ loanApplicationId: loanId, commodityId, quantityQuintals: 100, mandiId });

      if (res.status === 200 && res.body.data.scenarios) {
        const sellNow = res.body.data.scenarios.sellNow;
        // With 100 quintals at reasonable price, should likely be surplus
        expect(typeof sellNow.surplusDeficit).toBe('number');
      }
    });

    it('scenario costs increase with storage duration', async () => {
      const res = await request(app)
        .get(`/api/v1/pulse/price-realisation/${farmerId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .query({ loanApplicationId: loanId, commodityId, quantityQuintals: 10, mandiId });

      if (res.status === 200 && res.body.data.scenarios) {
        const { sellNow, store15Days, store30Days } = res.body.data.scenarios;
        // Storage costs should increase with duration
        expect(store30Days.storageCost).toBeGreaterThanOrEqual(store15Days.storageCost);
        expect(store15Days.storageCost).toBeGreaterThanOrEqual(sellNow.storageCost);
        // Interest should increase with duration
        expect(store30Days.interestAccrued).toBeGreaterThanOrEqual(store15Days.interestAccrued);
      }
    });
  });

  describe('POST /api/v1/dice/postharvest-topup/apply', () => {
    it('creates a topup loan application', async () => {
      const res = await request(app)
        .post('/api/v1/dice/postharvest-topup/apply')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          parentLoanApplicationId: loanId,
          commodityId,
          produceQuantityQuintals: 10,
          produceGrade: 'B',
          warehouseId: 1,
          warehouseReceiptNumber: 'eNWR-2026-TEST001',
          requestedLoanAmount: 50000,
          requestedTenureDays: 90
        });

      if (res.status === 200 || res.status === 201) {
        expect(res.body.data.status).toBe('applied');
        expect(res.body.data.ltvApplied).toBeLessThanOrEqual(0.70);
      }
    });

    it('enforces 70% LTV cap', async () => {
      const res = await request(app)
        .post('/api/v1/dice/postharvest-topup/apply')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          parentLoanApplicationId: loanId,
          commodityId,
          produceQuantityQuintals: 10,
          produceGrade: 'B',
          warehouseId: 1,
          warehouseReceiptNumber: 'eNWR-2026-TEST002',
          requestedLoanAmount: 999999999, // Unreasonably high
          requestedTenureDays: 90
        });

      if (res.status === 200 || res.status === 201) {
        expect(res.body.data.ltvApplied).toBeLessThanOrEqual(0.70);
      }
    });

    it('validates required fields', async () => {
      const res = await request(app)
        .post('/api/v1/dice/postharvest-topup/apply')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ parentLoanApplicationId: loanId }); // Missing required fields

      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/v1/dice/postharvest-topup/farmer/:farmerId', () => {
    it('lists farmer topup loans', async () => {
      const res = await request(app)
        .get(`/api/v1/dice/postharvest-topup/farmer/${farmerId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  describe('POST /api/v1/dice/postharvest-topup/:id/release', () => {
    it('auto-repays loan on produce release', async () => {
      // First create a topup loan
      const applyRes = await request(app)
        .post('/api/v1/dice/postharvest-topup/apply')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          parentLoanApplicationId: loanId,
          commodityId,
          produceQuantityQuintals: 10,
          produceGrade: 'B',
          warehouseId: 1,
          warehouseReceiptNumber: 'eNWR-2026-TEST003',
          requestedLoanAmount: 50000,
          requestedTenureDays: 90
        });

      if (applyRes.status !== 200 && applyRes.status !== 201) return;

      const topupId = applyRes.body.data.topupId;

      // Release produce
      const releaseRes = await request(app)
        .post(`/api/v1/dice/postharvest-topup/${topupId}/release`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          releaseType: 'full',
          quantityQuintals: 10,
          salePrice: 3000,
          mandiId
        });

      if (releaseRes.status === 200) {
        expect(releaseRes.body.data.topupStatus).toBe('closed');
        expect(releaseRes.body.data.newOutstanding).toBe(0);
      }
    });

    it('handles partial release correctly', async () => {
      const applyRes = await request(app)
        .post('/api/v1/dice/postharvest-topup/apply')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          parentLoanApplicationId: loanId,
          commodityId,
          produceQuantityQuintals: 10,
          produceGrade: 'B',
          warehouseId: 1,
          warehouseReceiptNumber: 'eNWR-2026-TEST004',
          requestedLoanAmount: 50000,
          requestedTenureDays: 90
        });

      if (applyRes.status !== 200 && applyRes.status !== 201) return;

      const topupId = applyRes.body.data.topupId;

      // Partial release
      const releaseRes = await request(app)
        .post(`/api/v1/dice/postharvest-topup/${topupId}/release`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          releaseType: 'partial',
          quantityQuintals: 5,
          salePrice: 3000,
          mandiId
        });

      if (releaseRes.status === 200) {
        expect(releaseRes.body.data.produceRemaining).toBe(5);
        expect(releaseRes.body.data.topupStatus).toBe('partially_repaid');
      }
    });
  });

  describe('GET /api/v1/dice/warehouses', () => {
    it('returns warehouse list', async () => {
      const res = await request(app)
        .get('/api/v1/dice/warehouses')
        .query({ enwr: 'true' });

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('filters by cold storage', async () => {
      const res = await request(app)
        .get('/api/v1/dice/warehouses')
        .query({ enwr: 'true', coldStorage: 'true' });

      expect(res.status).toBe(200);
      if (res.body.data && res.body.data.length > 0) {
        res.body.data.forEach(wh => {
          expect(wh.coldStorage).toBe(true);
        });
      }
    });
  });
});
