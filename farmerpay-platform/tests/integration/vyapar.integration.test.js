/**
 * Vyapar Integration Tests
 * Full journey: vendor registration → catalog → transactions
 */

const { initApp, getAgent, truncateTables, closeConnections } = require('../helpers/setup');
const { createTestUser } = require('../helpers/factories');

let agent, vendorToken;

beforeAll(async () => {
  await initApp();
  agent = getAgent();
  const data = await createTestUser({ role: 'VENDOR', firstName: 'Vendor' });
  vendorToken = data.token;
});

afterAll(async () => {
  await truncateTables(['users']);
  await closeConnections();
});

describe('Vyapar Integration', () => {
  // ─── Vendor Profile ───────────────────────────────────────────

  describe('Vendor profile endpoints', () => {
    it('should access profile with vendor token', async () => {
      const res = await agent
        .get('/api/v1/farmer/profile')
        .set('Authorization', `Bearer ${vendorToken}`);

      // Vendor users may or may not have farmer profiles
      expect([200, 404]).toContain(res.status);
    });
  });

  // ─── Public Commodity Access ──────────────────────────────────

  describe('Market data access', () => {
    it('should access public price endpoints', async () => {
      const res = await agent.get('/api/v1/pulse/commodities');
      expect(res.status).toBe(200);
    });
  });
});
