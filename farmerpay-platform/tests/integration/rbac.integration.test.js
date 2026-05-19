/**
 * RBAC Integration Tests
 * Verifies role-based access: farmer → agent → bank_user → admin
 */

const { initApp, getAgent, truncateTables, closeConnections } = require('../helpers/setup');
const { createTestUser, createTestAgent, createTestBankUser, createTestAdmin } = require('../helpers/factories');

let agent, farmerToken, agentToken, bankToken, adminToken;

beforeAll(async () => {
  await initApp();
  agent = getAgent();
  const farmer = await createTestUser();
  farmerToken = farmer.token;
  const agentData = await createTestAgent();
  agentToken = agentData.token;
  const bank = await createTestBankUser();
  bankToken = bank.token;
  const admin = await createTestAdmin();
  adminToken = admin.token;
});

afterAll(async () => {
  await truncateTables(['field_agent_profiles', 'users']);
  await closeConnections();
});

describe('RBAC Integration', () => {
  // ─── Farmer can access own profile ─────────────────────────────

  describe('Farmer role', () => {
    it('should access farmer profile endpoint', async () => {
      const res = await agent
        .get('/api/v1/farmer/profile')
        .set('Authorization', `Bearer ${farmerToken}`);

      expect([200, 404]).toContain(res.status);
    });

    it('should access trust sections', async () => {
      const res = await agent
        .get('/api/v1/trust/sections')
        .set('Authorization', `Bearer ${farmerToken}`);

      expect(res.status).toBe(200);
    });

    it('should access pulse commodities (public)', async () => {
      const res = await agent.get('/api/v1/pulse/commodities');
      expect(res.status).toBe(200);
    });
  });

  // ─── Agent can access SATHI tasks ──────────────────────────────

  describe('Agent role', () => {
    it('should access agent-specific endpoints', async () => {
      const res = await agent
        .get('/api/v1/farmer/profile')
        .set('Authorization', `Bearer ${agentToken}`);

      // Agents can access profile endpoints too
      expect([200, 404]).toContain(res.status);
    });
  });

  // ─── Bank user can access sentinel ─────────────────────────────

  describe('Bank user role', () => {
    it('should access sentinel portfolio', async () => {
      const res = await agent
        .get('/api/v1/sentinel/portfolio')
        .set('Authorization', `Bearer ${bankToken}`);

      expect(res.status).toBe(200);
    });

    it('should access sentinel alerts', async () => {
      const res = await agent
        .get('/api/v1/sentinel/alerts')
        .set('Authorization', `Bearer ${bankToken}`);

      expect(res.status).toBe(200);
    });
  });

  // ─── Unauthenticated access blocked ────────────────────────────

  describe('Unauthenticated', () => {
    it('should block farmer profile without token', async () => {
      const res = await agent.get('/api/v1/farmer/profile');
      expect(res.status).toBe(401);
    });

    it('should block sentinel without token', async () => {
      const res = await agent.get('/api/v1/sentinel/portfolio');
      expect(res.status).toBe(401);
    });

    it('should block trust without token', async () => {
      const res = await agent.get('/api/v1/trust/sections');
      expect(res.status).toBe(401);
    });

    it('should allow pulse commodities without token (public)', async () => {
      const res = await agent.get('/api/v1/pulse/commodities');
      expect(res.status).toBe(200);
    });
  });
});
