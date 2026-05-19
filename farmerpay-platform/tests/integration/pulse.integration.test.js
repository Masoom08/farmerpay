/**
 * PULSE Integration Tests
 * Full journey: commodities → mandis → prices → forecast → MSP → price alert
 */

const { initApp, getAgent, truncateTables, closeConnections } = require('../helpers/setup');
const { createTestUser, createTestMarketData } = require('../helpers/factories');

let agent, farmerToken, farmerId, commodity, mandi;

beforeAll(async () => {
  await initApp();
  agent = getAgent();
  const data = await createTestUser();
  farmerToken = data.token;
  farmerId = data.user.id;
  const marketData = await createTestMarketData();
  commodity = marketData.commodity;
  mandi = marketData.mandi;
});

afterAll(async () => {
  await truncateTables([
    'pulse_sell_recommendations', 'pulse_farmer_price_alerts', 'pulse_market_alerts',
    'pulse_msps', 'pulse_price_forecasts', 'pulse_price_records',
    'pulse_commodity_translations', 'pulse_commodities', 'pulse_mandis', 'users',
  ]);
  await closeConnections();
});

describe('PULSE Integration', () => {
  // ─── Commodities ──────────────────────────────────────────────

  describe('GET /api/v1/pulse/commodities', () => {
    it('should list commodities', async () => {
      const res = await agent.get('/api/v1/pulse/commodities');

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
    });

    it('should support language header', async () => {
      const res = await agent
        .get('/api/v1/pulse/commodities')
        .set('X-Language', 'hi');

      expect(res.status).toBe(200);
    });
  });

  // ─── Mandis ───────────────────────────────────────────────────

  describe('GET /api/v1/pulse/mandis', () => {
    it('should list mandis', async () => {
      const res = await agent.get('/api/v1/pulse/mandis');

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  // ─── Latest Prices ────────────────────────────────────────────

  describe('GET /api/v1/pulse/prices/latest', () => {
    it('should return latest prices for a commodity', async () => {
      const res = await agent
        .get(`/api/v1/pulse/prices/latest?commodityId=${commodity.commodity_id}&days=7`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('should require commodityId', async () => {
      const res = await agent.get('/api/v1/pulse/prices/latest');

      expect(res.status).toBe(400);
    });
  });

  // ─── Price Forecast ───────────────────────────────────────────

  describe('GET /api/v1/pulse/price-forecast/:commodityId', () => {
    it('should return forecast or null', async () => {
      const res = await agent
        .get(`/api/v1/pulse/price-forecast/${commodity.commodity_id}`);

      expect(res.status).toBe(200);
    });
  });

  // ─── MSP ──────────────────────────────────────────────────────

  describe('GET /api/v1/pulse/msp/:commodityId', () => {
    it('should return MSP or null', async () => {
      const res = await agent
        .get(`/api/v1/pulse/msp/${commodity.commodity_id}`);

      expect(res.status).toBe(200);
    });
  });

  // ─── Farmer Price Alert ───────────────────────────────────────

  describe('POST /api/v1/pulse/farmer-price-alert', () => {
    it('should create a price alert', async () => {
      const res = await agent
        .post('/api/v1/pulse/farmer-price-alert')
        .set('Authorization', `Bearer ${farmerToken}`)
        .send({
          commodityId: commodity.commodity_id,
          targetPrice: 2500.00,
          alertType: 'price_reached',
        });

      expect(res.status).toBe(201);
      expect(res.body.data).toHaveProperty('alertId');
      expect(res.body.data.status).toBe('active');
    });

    it('should reject without auth', async () => {
      const res = await agent
        .post('/api/v1/pulse/farmer-price-alert')
        .send({ commodityId: commodity.commodity_id, targetPrice: 2500, alertType: 'price_reached' });

      expect(res.status).toBe(401);
    });
  });

  // ─── Sell Recommendations ─────────────────────────────────────

  describe('GET /api/v1/pulse/sell-recommendations/:farmerId', () => {
    it('should return sell recommendations', async () => {
      const res = await agent
        .get(`/api/v1/pulse/sell-recommendations/${farmerId}`)
        .set('Authorization', `Bearer ${farmerToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });
});
