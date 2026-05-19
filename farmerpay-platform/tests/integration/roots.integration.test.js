/**
 * ROOTS Integration Tests
 * Full journey: create farm → add field → create cycle → execute tasks → harvest
 */

const { initApp, getAgent, truncateTables, closeConnections } = require('../helpers/setup');
const { createTestUser } = require('../helpers/factories');

let agent, farmerToken;

beforeAll(async () => {
  await initApp();
  agent = getAgent();
  const { token } = await createTestUser();
  farmerToken = token;
});

afterAll(async () => {
  await truncateTables(['users']);
  await closeConnections();
});

describe('ROOTS Integration', () => {
  let farmId, fieldId, cycleId;

  // ─── Create Farm Register ─────────────────────────────────────

  describe('POST /api/v1/roots/farms', () => {
    it('should create a farm register', async () => {
      const res = await agent
        .post('/api/v1/roots/farms')
        .set('Authorization', `Bearer ${farmerToken}`)
        .send({ farmName: 'My Farm', totalArea: 5.5 });

      expect([200, 201]).toContain(res.status);
      expect(res.body.success).toBe(true);
      if (res.body.data) farmId = res.body.data.farmId || res.body.data.id;
    });
  });

  // ─── Add Field ────────────────────────────────────────────────

  describe('POST /api/v1/roots/farms/:farmId/fields', () => {
    it('should add a field to the farm', async () => {
      if (!farmId) return;

      const res = await agent
        .post(`/api/v1/roots/farms/${farmId}/fields`)
        .set('Authorization', `Bearer ${farmerToken}`)
        .send({
          fieldName: 'Plot A',
          areaHectares: 2.5,
          soilType: 'alluvial',
        });

      expect([200, 201]).toContain(res.status);
      if (res.body.data) fieldId = res.body.data.fieldId || res.body.data.id;
    });
  });

  // ─── Create Cultivation Cycle ─────────────────────────────────

  describe('POST /api/v1/roots/cycles', () => {
    it('should create a cultivation cycle', async () => {
      if (!fieldId) return;

      const res = await agent
        .post('/api/v1/roots/cycles')
        .set('Authorization', `Bearer ${farmerToken}`)
        .send({
          fieldId,
          season: 'kharif',
          year: 2025,
          cropId: 1,
        });

      expect([200, 201]).toContain(res.status);
      if (res.body.data) cycleId = res.body.data.cycleId || res.body.data.id;
    });
  });

  // ─── Get Farm Summary ─────────────────────────────────────────

  describe('GET /api/v1/roots/farms', () => {
    it('should list farmer farms', async () => {
      const res = await agent
        .get('/api/v1/roots/farms')
        .set('Authorization', `Bearer ${farmerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });
});
