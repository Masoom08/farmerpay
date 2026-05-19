/**
 * SATHI Integration Tests
 * Full journey: assign task → start → collect evidence → complete → sync
 */

const { initApp, getAgent, truncateTables, closeConnections } = require('../helpers/setup');
const { createTestUser, createTestAgent } = require('../helpers/factories');
const { v4: uuidv4 } = require('uuid');

let agent, agentToken, agentProfile, adminToken;

beforeAll(async () => {
  await initApp();
  agent = getAgent();
  const agentData = await createTestAgent();
  agentToken = agentData.token;
  agentProfile = agentData.agentProfile;
  const adminData = await createTestUser({ role: 'ADMIN', firstName: 'Admin' });
  adminToken = adminData.token;
});

afterAll(async () => {
  await truncateTables([
    'sathi_audit_logs', 'sathi_evidence_items', 'sathi_evidence_bundles',
    'sathi_task_executions', 'sathi_tasks', 'sathi_sync_conflicts',
    'sathi_sync_queues', 'sathi_farmer_consents', 'sathi_field_visit_checklists',
    'sathi_field_verifications', 'field_agent_profiles', 'users',
  ]);
  await closeConnections();
});

describe('SATHI Integration', () => {
  let taskId, executionId;

  // ─── Create Task (setup via direct DB) ─────────────────────────

  beforeAll(async () => {
    const db = require('../../src/shared/models');
    const task = await db.SathiTask.create({
      task_uuid: uuidv4(),
      assigned_to_agent_id: agentProfile.id,
      assigned_by_admin_id: null,
      task_type: 'field_visit',
      task_title: 'Verify farm boundaries',
      task_priority: 'high',
      task_status: 'assigned',
      assigned_at: new Date(),
      due_date: new Date(Date.now() + 7 * 86400000),
    });
    taskId = task.id;
  });

  // ─── Get Agent Tasks ──────────────────────────────────────────

  describe('GET /api/v1/sathi/agent/:agentId/tasks', () => {
    it('should return tasks assigned to agent', async () => {
      const res = await agent
        .get(`/api/v1/sathi/agent/${agentProfile.agent_user_id}/tasks`)
        .set('Authorization', `Bearer ${agentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  // ─── Start Task ───────────────────────────────────────────────

  describe('POST /api/v1/sathi/tasks/:taskId/start', () => {
    it('should start task with GPS location', async () => {
      const res = await agent
        .post(`/api/v1/sathi/tasks/${taskId}/start`)
        .set('Authorization', `Bearer ${agentToken}`)
        .send({ latitude: 28.6139, longitude: 77.2090, accuracy: 10 });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      if (res.body.data) executionId = res.body.data.executionId;
    });

    it('should reject starting already started task', async () => {
      const res = await agent
        .post(`/api/v1/sathi/tasks/${taskId}/start`)
        .set('Authorization', `Bearer ${agentToken}`)
        .send({ latitude: 28.6139, longitude: 77.2090 });

      expect(res.status).toBe(400);
    });
  });

  // ─── Complete Task ────────────────────────────────────────────

  describe('POST /api/v1/sathi/tasks/:taskId/complete', () => {
    it('should complete task with evidence bundle', async () => {
      const res = await agent
        .post(`/api/v1/sathi/tasks/${taskId}/complete`)
        .set('Authorization', `Bearer ${agentToken}`)
        .send({
          endLatitude: 28.6140,
          endLongitude: 77.2091,
          evidenceBundle: {
            type: 'farm_field_verification',
            items: [
              { evidenceType: 'gps_location', gpsLatitude: 28.6139, gpsLongitude: 77.2090 },
              { evidenceType: 'photo', mediaAssetId: null },
            ],
          },
          notes: 'Farm boundaries verified successfully',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('bundleId');
    });
  });

  // ─── Offline Sync ─────────────────────────────────────────────

  describe('POST /api/v1/sathi/sync', () => {
    it('should process sync queue items', async () => {
      const res = await agent
        .post('/api/v1/sathi/sync')
        .set('Authorization', `Bearer ${agentToken}`)
        .send({
          syncQueue: [
            { entityType: 'task_execution', entityId: 1, action: 'create', data: { notes: 'offline note' } },
          ],
        });

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty('syncedCount');
      expect(res.body.data).toHaveProperty('failedCount');
    });
  });
});
