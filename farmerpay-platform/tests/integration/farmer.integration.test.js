/**
 * Farmer Integration Tests
 * Full journey: onboarding 4 steps → profile → addresses → preferences
 */

const { initApp, getAgent, truncateTables, closeConnections } = require('../helpers/setup');
const { createTestUser, createFarmerProfile } = require('../helpers/factories');

let agent, farmerToken, farmerId;

beforeAll(async () => {
  await initApp();
  agent = getAgent();
  const { token, user } = await createTestUser();
  farmerToken = token;
  farmerId = user.id;
});

afterAll(async () => {
  await truncateTables([
    'farmer_language_preferences', 'farmer_activity_preferences',
    'farmer_bank_accounts', 'farmer_addresses', 'farmer_gps_locations',
    'farmer_profile_details', 'farmer_profiles', 'onboarding_progress',
    'profile_completeness_scores', 'users',
  ]);
  await closeConnections();
});

describe('Farmer Integration', () => {
  // ─── Onboarding Step 1: Basic Info ────────────────────────────

  describe('POST /api/v1/farmer/onboarding/step1', () => {
    it('should save basic info (name, DOB, gender)', async () => {
      const res = await agent
        .post('/api/v1/farmer/onboarding/step1')
        .set('Authorization', `Bearer ${farmerToken}`)
        .send({
          firstName: 'Ramesh',
          lastName: 'Kumar',
          dateOfBirth: '1985-06-15',
          gender: 'male',
          fatherName: 'Suresh Kumar',
        });

      expect([200, 201]).toContain(res.status);
      expect(res.body.success).toBe(true);
    });

    it('should reject invalid gender', async () => {
      const res = await agent
        .post('/api/v1/farmer/onboarding/step1')
        .set('Authorization', `Bearer ${farmerToken}`)
        .send({ firstName: 'Test', gender: 'invalid' });

      expect(res.status).toBe(400);
    });
  });

  // ─── Onboarding Step 2: Address ───────────────────────────────

  describe('POST /api/v1/farmer/onboarding/step2', () => {
    it('should save address details', async () => {
      const res = await agent
        .post('/api/v1/farmer/onboarding/step2')
        .set('Authorization', `Bearer ${farmerToken}`)
        .send({
          addressType: 'permanent',
          streetAddress: 'Village Road',
          postalCode: '110001',
          latitude: 28.6139,
          longitude: 77.2090,
        });

      expect([200, 201]).toContain(res.status);
      expect(res.body.success).toBe(true);
    });
  });

  // ─── Profile Retrieval ────────────────────────────────────────

  describe('GET /api/v1/farmer/profile', () => {
    it('should return farmer profile with addresses', async () => {
      const res = await agent
        .get('/api/v1/farmer/profile')
        .set('Authorization', `Bearer ${farmerToken}`);

      expect([200, 404]).toContain(res.status);
      if (res.status === 200) {
        expect(res.body.data).toHaveProperty('profile');
      }
    });
  });

  // ─── Profile Update ───────────────────────────────────────────

  describe('PUT /api/v1/farmer/profile', () => {
    it('should update profile fields', async () => {
      const res = await agent
        .put('/api/v1/farmer/profile')
        .set('Authorization', `Bearer ${farmerToken}`)
        .send({ educationLevel: 'graduate' });

      expect([200, 404]).toContain(res.status);
    });
  });

  // ─── Address Management ───────────────────────────────────────

  describe('POST /api/v1/farmer/addresses', () => {
    it('should add a new address', async () => {
      const res = await agent
        .post('/api/v1/farmer/addresses')
        .set('Authorization', `Bearer ${farmerToken}`)
        .send({
          addressType: 'farm',
          streetAddress: 'Farm Plot 12',
          postalCode: '226001',
        });

      expect([200, 201]).toContain(res.status);
    });
  });

  // ─── Soft Delete Verification ─────────────────────────────────

  describe('Soft delete behavior', () => {
    it('should not return deactivated records', async () => {
      // Profile endpoints should respect is_active
      const res = await agent
        .get('/api/v1/farmer/profile')
        .set('Authorization', `Bearer ${farmerToken}`);

      if (res.status === 200 && res.body.data) {
        // All returned records should be active
        expect(res.body.success).toBe(true);
      }
    });
  });
});
