/**
 * Unit Tests — ROOTS Verification Service
 */

const mockTransaction = { commit: jest.fn(), rollback: jest.fn() };

jest.mock('../../src/shared/models', () => ({
  sequelize: { transaction: jest.fn().mockResolvedValue(mockTransaction) },
  Sequelize: { Op: require('sequelize').Op },
  SathiTask: { create: jest.fn(), findByPk: jest.fn() },
  SathiTaskExecution: { create: jest.fn() },
  SathiEvidenceBundle: { create: jest.fn() },
  SathiEvidenceItem: { create: jest.fn() },
  ChoiceAssignment: { findOne: jest.fn() },
  CultivationCycle: { findByPk: jest.fn(), findOne: jest.fn() },
  RootsComplianceSnapshot: { findOne: jest.fn(), update: jest.fn() },
  RootsRedFlag: { create: jest.fn(), findAll: jest.fn() },
  SoilHealthRecord: { findOne: jest.fn() },
  WorkbandExecution: { findAll: jest.fn() },
}));

jest.mock('../../src/shared/utils/logger', () => ({
  info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn(),
}));

jest.mock('../../src/shared/utils/uuidHelper', () => ({
  generateUUID: jest.fn().mockReturnValue('test-uuid'),
}));

const db = require('../../src/shared/models');
const service = require('../../src/modules/sathi/services/rootsVerificationService');

describe('rootsVerificationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockTransaction.commit.mockClear();
    mockTransaction.rollback.mockClear();
  });

  describe('createRootsVerificationTask', () => {
    it('should create task with assigned Sathi', async () => {
      db.ChoiceAssignment.findOne.mockResolvedValue({ intermediary_id: 99 });
      db.SathiTask.create.mockResolvedValue({ id: 1, task_uuid: 'test-uuid' });

      const result = await service.createRootsVerificationTask(42, 'HIGH', ['COST_ANOMALY']);

      expect(result).not.toBeNull();
      expect(result.taskUuid).toBe('test-uuid');
      expect(result.assignedTo).toBe(99);
      expect(result.priority).toBe('high');
      expect(result.checklist.length).toBeGreaterThan(4); // base 4 + cost-specific items

      expect(db.SathiTask.create).toHaveBeenCalledWith(
        expect.objectContaining({
          task_type: 'roots_field_verification',
          farmer_id: 42,
          task_priority: 'high',
          assigned_to_agent_id: 99,
        }),
        expect.any(Object)
      );
    });

    it('should return null when no Sathi assigned', async () => {
      db.ChoiceAssignment.findOne.mockResolvedValue(null);

      const result = await service.createRootsVerificationTask(42, 'HIGH', []);
      expect(result).toBeNull();
    });

    it('should map CRITICAL severity to urgent priority', async () => {
      db.ChoiceAssignment.findOne.mockResolvedValue({ intermediary_id: 99 });
      db.SathiTask.create.mockResolvedValue({ id: 1, task_uuid: 'test-uuid' });

      const result = await service.createRootsVerificationTask(42, 'CRITICAL', []);
      expect(result.priority).toBe('urgent');
    });

    it('should add concern-specific checklist items', async () => {
      db.ChoiceAssignment.findOne.mockResolvedValue({ intermediary_id: 99 });
      db.SathiTask.create.mockResolvedValue({ id: 1, task_uuid: 'test-uuid' });

      const result = await service.createRootsVerificationTask(42, 'MEDIUM', ['NO_DATA_ENTRY', 'YIELD_ANOMALY']);

      const ids = result.checklist.map((c) => c.id);
      expect(ids).toContain('data_gap_reason');
      expect(ids).toContain('harvest_estimate');
    });
  });

  describe('completeVerification', () => {
    beforeEach(() => {
      db.SathiTask.findByPk.mockResolvedValue({
        id: 1, task_type: 'roots_field_verification', farmer_id: 42,
        task_entity_id: 1,
        update: jest.fn().mockResolvedValue(true),
      });
      db.SathiTaskExecution.create.mockResolvedValue({ id: 10 });
      db.SathiEvidenceBundle.create.mockResolvedValue({ id: 20, bundle_uuid: 'bundle-uuid' });
      db.SathiEvidenceItem.create.mockResolvedValue({ id: 30 });
      db.RootsComplianceSnapshot.update.mockResolvedValue([1]);
      db.RootsRedFlag.create.mockResolvedValue({ id: 40 });
    });

    it('should create execution, bundle, and mark sathi_verified', async () => {
      const result = await service.completeVerification(1, 99, {
        cropStanding: true,
        estimatedStage: 'vegetative',
        farmerInterview: 'Farmer confirmed inputs used.',
        gps: { latitude: 21.5, longitude: 79.1 },
        discrepancies: [],
      });

      expect(result.sathiVerified).toBe(true);
      expect(result.discrepanciesFound).toBe(0);
      expect(db.SathiTaskExecution.create).toHaveBeenCalledTimes(1);
      expect(db.SathiEvidenceBundle.create).toHaveBeenCalledTimes(1);
      expect(db.RootsComplianceSnapshot.update).toHaveBeenCalledWith(
        { sathi_verified: true },
        expect.objectContaining({ where: { farmer_id: 42, is_active: true } })
      );
      expect(mockTransaction.commit).toHaveBeenCalled();
    });

    it('should create discrepancy red flags', async () => {
      const result = await service.completeVerification(1, 99, {
        cropStanding: false,
        discrepancies: [
          { description: 'No crop in field', severity: 'HIGH', activityType: 'CROP', activityRefId: 1 },
        ],
        gps: null,
      });

      expect(result.discrepanciesFound).toBe(1);
      expect(db.RootsRedFlag.create).toHaveBeenCalledWith(
        expect.objectContaining({ flag_type: 'SATHI_DISCREPANCY', severity: 'HIGH' }),
        expect.any(Object)
      );
    });

    it('should throw 404 for non-verification task', async () => {
      db.SathiTask.findByPk.mockResolvedValue({ id: 1, task_type: 'field_visit' });

      await expect(service.completeVerification(1, 99, {}))
        .rejects.toThrow('Verification task not found');
    });

    it('should create GPS evidence item', async () => {
      await service.completeVerification(1, 99, {
        gps: { latitude: 21.5, longitude: 79.1 },
        discrepancies: [],
      });

      expect(db.SathiEvidenceItem.create).toHaveBeenCalledWith(
        expect.objectContaining({ evidence_type: 'gps_location', gps_latitude: 21.5 }),
        expect.any(Object)
      );
    });
  });

  describe('getVerificationChecklist', () => {
    it('should build checklist from farmer concerns', async () => {
      db.CultivationCycle.findOne.mockResolvedValue({
        id: 1, farmer_id: 42, self_declared_crop: 'Paddy', field_id: 10,
      });
      db.RootsComplianceSnapshot.findOne.mockResolvedValue({
        overall_compliance_score: 45, data_completeness_pct: 30,
      });
      db.RootsRedFlag.findAll.mockResolvedValue([
        { flag_type: 'COST_ANOMALY' },
      ]);
      db.SoilHealthRecord.findOne.mockResolvedValue(null);

      const result = await service.getVerificationChecklist(42, null);

      expect(result.farmerId).toBe(42);
      expect(result.concerns).toContain('low_compliance');
      expect(result.concerns).toContain('NO_DATA_ENTRY');
      expect(result.concerns).toContain('COST_ANOMALY');
      expect(result.concerns).toContain('soil_health');
      expect(result.checklist.length).toBeGreaterThan(4);
    });

    it('should return base checklist when no concerns found', async () => {
      db.CultivationCycle.findOne.mockResolvedValue({
        id: 1, farmer_id: 42, field_id: 10,
      });
      db.RootsComplianceSnapshot.findOne.mockResolvedValue({
        overall_compliance_score: 85, data_completeness_pct: 90,
      });
      db.RootsRedFlag.findAll.mockResolvedValue([]);
      db.SoilHealthRecord.findOne.mockResolvedValue({ id: 1 });

      const result = await service.getVerificationChecklist(42, null);

      expect(result.checklist.length).toBe(4); // only base items
    });
  });
});
