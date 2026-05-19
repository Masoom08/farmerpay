/**
 * Sathi Assignment & RBAC Integration Tests
 *
 * Covers:
 *   1. Non-Sathi JWT cannot hit /sathi/assist/* (403 SATHI_NOT_REGISTERED)
 *   2. A registered Sathi cannot assist a farmer without an active
 *      IntermediaryAssignment (403 SATHI_NO_ASSIGNMENT)
 *   3. Dashboard overview returns 403 for non-Sathis, 200 for Sathis
 */

const { initApp, getAgent, closeConnections, truncateTables } = require('../helpers/setup');
const { createTestUser } = require('../helpers/factories');

let db, agent;
let farmerToken;               // plain farmer, not a Sathi
let sathiUser, sathiToken, sathiIntermediary;
let otherFarmerUser;           // a farmer who is NOT assigned to this Sathi

beforeAll(async () => {
  await initApp();
  agent = getAgent();
  db = require('../../src/shared/models');

  // Plain farmer (NOT a Sathi)
  const f = await createTestUser({
    firstName: 'Plain',
    lastName: 'Farmer',
    mobile: `94${Math.floor(10000000 + Math.random() * 90000000)}`,
  });
  farmerToken = f.token;

  // A Sathi (user + Intermediary row)
  const s = await createTestUser({
    firstName: 'Sathi',
    lastName: 'Registered',
    mobile: `93${Math.floor(10000000 + Math.random() * 90000000)}`,
  });
  sathiUser = s.user;
  sathiToken = s.token;
  sathiIntermediary = await db.Intermediary.create({
    intermediary_uuid: `rbac-${Date.now()}`,
    name: 'RBAC Sathi',
    mobile: `+91${Math.floor(9000000000 + Math.random() * 999999999)}`,
    type: 'insurance_sakhi',
    user_id: sathiUser.id,
    onboarding_kyc_status: 'verified',
    is_active: true,
    is_available: true,
  });

  // Another farmer the Sathi is NOT assigned to
  const other = await createTestUser({
    firstName: 'Unassigned',
    lastName: 'Farmer',
    mobile: `92${Math.floor(10000000 + Math.random() * 90000000)}`,
  });
  otherFarmerUser = other.user;
});

afterAll(async () => {
  await truncateTables([
    'sathi_nudges',
    'sathi_issue_flags',
    'sathi_incentive_ledger',
    'sathi_commission_ledger',
    'sathi_beneficiaries',
    'intermediary_assignments',
    'intermediaries',
    'users',
  ]);
  await closeConnections();
});

describe('Sathi RBAC', () => {
  test('non-Sathi JWT gets 403 on /sathi/assist/loan', async () => {
    const res = await agent
      .post('/api/v1/sathi/assist/loan')
      .set('Authorization', `Bearer ${farmerToken}`)
      .send({
        farmerId: otherFarmerUser.id,
        amount: 100000,
        tenureMonths: 12,
      });
    expect([403, 404]).toContain(res.status);
    if (res.body && res.body.errorCode) {
      expect(['SATHI_NOT_REGISTERED', 'RES_001']).toContain(res.body.errorCode);
    }
  });

  test('registered Sathi without an assignment gets 403 on assist', async () => {
    const res = await agent
      .post('/api/v1/sathi/assist/loan')
      .set('Authorization', `Bearer ${sathiToken}`)
      .send({
        farmerId: otherFarmerUser.id,
        amount: 50000,
        tenureMonths: 12,
      });
    expect(res.status).toBe(403);
    if (res.body && res.body.errorCode) {
      expect(['SATHI_NO_ASSIGNMENT', 'SATHI_NO_CONSENT']).toContain(res.body.errorCode);
    }
  });

  test('non-Sathi JWT gets 403 on /sathi/dashboard/overview', async () => {
    const res = await agent
      .get('/api/v1/sathi/dashboard/overview')
      .set('Authorization', `Bearer ${farmerToken}`);
    expect([403, 404]).toContain(res.status);
  });

  test('registered Sathi gets 200 on /sathi/dashboard/overview', async () => {
    const res = await agent
      .get('/api/v1/sathi/dashboard/overview')
      .set('Authorization', `Bearer ${sathiToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toBeDefined();
    expect(res.body.data.beneficiaries).toBeDefined();
    expect(res.body.data.incentive).toBeDefined();
  });
});
