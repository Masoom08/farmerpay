/**
 * SAGE Integration Tests
 * Full journey: get advisories → acknowledge → crop observation → alerts
 */

const { initApp, getAgent, truncateTables, closeConnections } = require('../helpers/setup');
const { createTestUser } = require('../helpers/factories');

let agent, farmerToken, farmerId;

beforeAll(async () => {
  await initApp();
  agent = getAgent();
  const data = await createTestUser();
  farmerToken = data.token;
  farmerId = data.user.id;
});

afterAll(async () => {
  await truncateTables([
    'sage_feedback', 'sage_farmer_interactions', 'sage_crop_health_observations',
    'sage_weather_events', 'sage_advisories', 'sage_advisory_types', 'sage_alerts', 'users',
  ]);
  await closeConnections();
});

describe('SAGE Integration', () => {
  // ─── Get Advisories ───────────────────────────────────────────

  describe('GET /api/v1/sage/advisories/:farmerId', () => {
    it('should return farmer advisories', async () => {
      const res = await agent
        .get(`/api/v1/sage/advisories/${farmerId}`)
        .set('Authorization', `Bearer ${farmerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  // ─── Get Alerts ───────────────────────────────────────────────

  describe('GET /api/v1/sage/alerts/:farmerId', () => {
    it('should return farmer alerts', async () => {
      const res = await agent
        .get(`/api/v1/sage/alerts/${farmerId}`)
        .set('Authorization', `Bearer ${farmerToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('should filter alerts by type', async () => {
      const res = await agent
        .get(`/api/v1/sage/alerts/${farmerId}?type=weather`)
        .set('Authorization', `Bearer ${farmerToken}`);

      expect(res.status).toBe(200);
    });
  });

  // ─── Crop Observation ─────────────────────────────────────────

  describe('POST /api/v1/sage/crop-observation/:farmerId', () => {
    it('should create observation and generate advisory for pest', async () => {
      const res = await agent
        .post(`/api/v1/sage/crop-observation/${farmerId}`)
        .set('Authorization', `Bearer ${farmerToken}`)
        .send({
          healthStatus: 'poor',
          pestObserved: true,
          pestName: 'Fall Armyworm',
          affectedAreaPercent: 25.5,
          diseaseObserved: false,
        });

      expect(res.status).toBe(201);
      expect(res.body.data).toHaveProperty('observationId');
      expect(res.body.data.advisoryGenerated).toBe(true);
    });

    it('should create observation without advisory for healthy crop', async () => {
      const res = await agent
        .post(`/api/v1/sage/crop-observation/${farmerId}`)
        .set('Authorization', `Bearer ${farmerToken}`)
        .send({
          healthStatus: 'good',
          pestObserved: false,
          diseaseObserved: false,
        });

      expect(res.status).toBe(201);
      expect(res.body.data.advisoryGenerated).toBe(false);
    });

    it('should reject invalid health status', async () => {
      const res = await agent
        .post(`/api/v1/sage/crop-observation/${farmerId}`)
        .set('Authorization', `Bearer ${farmerToken}`)
        .send({ healthStatus: 'invalid' });

      expect(res.status).toBe(400);
    });
  });
});
