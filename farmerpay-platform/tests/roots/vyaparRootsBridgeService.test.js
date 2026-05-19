/**
 * Unit Tests — VYAPAR-ROOTS Bridge Service
 */

const mockTransaction = { commit: jest.fn(), rollback: jest.fn() };
const mockChannel = { publish: jest.fn() };

jest.mock('../../src/shared/models', () => ({
  sequelize: { transaction: jest.fn().mockResolvedValue(mockTransaction) },
  Sequelize: { Op: require('sequelize').Op },
  VendorTransaction: { findByPk: jest.fn() },
  VendorTransactionItem: { findByPk: jest.fn() },
  InputItem: { findOne: jest.fn() },
  InputCategory: {},
  CultivationCycle: { findAll: jest.fn() },
  WorkbandExecution: { findAll: jest.fn() },
  TaskExecution: {},
  PopTask: {},
  PopTaskInput: {},
  TaskExecutionInputLog: { create: jest.fn(), update: jest.fn() },
  DairyCostEvent: { create: jest.fn() },
  DairyHerdRegister: { findOne: jest.fn() },
  FarmerActivitySubscription: { findAll: jest.fn() },
}));

jest.mock('../../src/shared/utils/logger', () => ({
  info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn(),
}));

jest.mock('../../src/shared/utils/uuidHelper', () => ({
  generateUUID: jest.fn().mockReturnValue('test-uuid'),
}));

jest.mock('../../src/config/rabbitmq', () => ({
  getChannel: jest.fn().mockResolvedValue(mockChannel),
}));

jest.mock('../../src/config', () => ({
  rabbitmq: { exchange: 'farmerpay_exchange' },
}));

const db = require('../../src/shared/models');
const bridgeService = require('../../src/modules/roots/crop/services/vyaparRootsBridgeService');

describe('vyaparRootsBridgeService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockTransaction.commit.mockClear();
    mockTransaction.rollback.mockClear();
    mockChannel.publish.mockClear();
  });

  describe('processTransaction', () => {
    const mkItem = (id, inputItemId, lineTotal) => ({
      id, input_item_id: inputItemId, input_pack_id: null,
      quantity: 10, line_total: lineTotal, is_active: true,
      update: jest.fn().mockResolvedValue(true),
    });

    it('should map fertilizer purchase to crop cycle input log', async () => {
      db.VendorTransaction.findByPk.mockResolvedValue({
        id: 1, farmer_id: 42, transaction_status: 'completed',
        transaction_date: '2026-04-15',
        items: [mkItem(101, 'urea-001', 850)],
      });

      db.InputItem.findOne.mockResolvedValue({
        item_uuid: 'urea-001', item_name: 'Urea',
        category: { category_code: 'FERTILIZER', category_name: 'Fertilizer' },
      });

      db.CultivationCycle.findAll.mockResolvedValue([{
        id: 1, cycle_uuid: 'c-001', self_declared_crop: 'Paddy',
        cycle_sowing_date: '2026-03-01', pop_id: 'pop-001',
      }]);

      db.WorkbandExecution.findAll.mockResolvedValue([{
        id: 10, workband_status: 'in_progress', workband_name: 'Fertilization',
        taskExecutions: [{
          id: 20, popTask: { popTaskInputs: [{ input_item_id: 'urea-001' }] },
        }],
      }]);

      const result = await bridgeService.processTransaction(1);

      expect(result.mapped_items).toHaveLength(1);
      expect(result.mapped_items[0].activityType).toBe('CROP');
      expect(result.mapped_items[0].confidence).toBe(0.95);
      expect(db.TaskExecutionInputLog.create).toHaveBeenCalledWith(
        expect.objectContaining({ task_execution_id: 20, input_item_id: 'urea-001', input_cost: 850 }),
        expect.any(Object)
      );
      expect(mockTransaction.commit).toHaveBeenCalled();
    });

    it('should map animal feed to dairy cost event', async () => {
      db.VendorTransaction.findByPk.mockResolvedValue({
        id: 2, farmer_id: 42, transaction_status: 'completed',
        items: [mkItem(102, 'feed-001', 1200)],
      });

      db.InputItem.findOne.mockResolvedValue({
        item_uuid: 'feed-001', item_name: 'Cattle Feed',
        category: { category_code: 'ANIMAL_FEED', category_name: 'Animal Feed' },
      });

      db.CultivationCycle.findAll.mockResolvedValue([]);
      db.DairyHerdRegister.findOne.mockResolvedValue({ id: 5 });

      const result = await bridgeService.processTransaction(2);

      expect(result.mapped_items).toHaveLength(1);
      expect(result.mapped_items[0].activityType).toBe('DAIRY');
      expect(db.DairyCostEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({ herd_id: 5, cost_type: 'feed', source: 'VYAPAR' }),
        expect.any(Object)
      );
    });

    it('should leave unmapped items as pending', async () => {
      db.VendorTransaction.findByPk.mockResolvedValue({
        id: 3, farmer_id: 42, transaction_status: 'completed',
        items: [mkItem(103, 'unknown-001', 500)],
      });

      db.InputItem.findOne.mockResolvedValue(null); // no input item match

      const result = await bridgeService.processTransaction(3);

      expect(result.unmapped_items).toHaveLength(1);
      expect(result.unmapped_items[0].reason).toBe('no_category_match');
    });

    it('should skip cancelled transactions', async () => {
      db.VendorTransaction.findByPk.mockResolvedValue({
        id: 4, farmer_id: 42, transaction_status: 'cancelled', items: [],
      });

      const result = await bridgeService.processTransaction(4);

      expect(result.mapped_items).toHaveLength(0);
    });

    it('should send push notification for mapped items', async () => {
      db.VendorTransaction.findByPk.mockResolvedValue({
        id: 5, farmer_id: 42, transaction_status: 'completed',
        items: [mkItem(105, 'seed-001', 600)],
      });

      db.InputItem.findOne.mockResolvedValue({
        item_uuid: 'seed-001', category: { category_code: 'SEED' },
      });

      db.CultivationCycle.findAll.mockResolvedValue([{
        id: 1, cycle_uuid: 'c-001', cycle_sowing_date: '2026-03-01', pop_id: 'p-001',
      }]);
      db.WorkbandExecution.findAll.mockResolvedValue([{
        id: 10, workband_status: 'in_progress', workband_name: 'Sowing',
        taskExecutions: [{ id: 20, popTask: { popTaskInputs: [{ input_item_id: 'seed-001' }] } }],
      }]);

      await bridgeService.processTransaction(5);

      const pushCall = mockChannel.publish.mock.calls.find(
        (c) => c[1] === 'notification.push.farmer'
      );
      expect(pushCall).toBeDefined();
    });
  });

  describe('unlinkTransaction', () => {
    it('should unlink and deactivate input log', async () => {
      const mockItem = {
        id: 101, input_item_id: 'urea-001',
        roots_task_execution_id: 20, roots_link_status: 'auto_linked',
        transaction: { farmer_id: 42 },
        update: jest.fn().mockResolvedValue(true),
      };
      db.VendorTransactionItem.findByPk.mockResolvedValue(mockItem);
      db.TaskExecutionInputLog.update.mockResolvedValue([1]);

      const result = await bridgeService.unlinkTransaction(42, 101, 'Wrong item');

      expect(result.status).toBe('unlinked');
      expect(db.TaskExecutionInputLog.update).toHaveBeenCalledWith(
        { is_active: false },
        expect.objectContaining({ where: expect.objectContaining({ task_execution_id: 20 }) })
      );
      expect(mockItem.update).toHaveBeenCalledWith(
        expect.objectContaining({ roots_link_status: 'unlinked', roots_unlink_reason: 'Wrong item' }),
        expect.any(Object)
      );
    });

    it('should throw 404 for wrong farmer', async () => {
      db.VendorTransactionItem.findByPk.mockResolvedValue({
        id: 101, transaction: { farmer_id: 99 },
      });

      await expect(bridgeService.unlinkTransaction(42, 101, '')).rejects.toThrow('Transaction item not found');
    });
  });

  describe('getSuggestedLinks', () => {
    it('should return suggestions for pending items', async () => {
      db.VendorTransaction.findByPk.mockResolvedValue({
        id: 1, farmer_id: 42,
        items: [{ id: 101, input_item_id: 'fert-001', line_total: 500, roots_link_status: 'pending' }],
      });

      db.InputItem.findOne.mockResolvedValue({
        item_uuid: 'fert-001', item_name: 'DAP',
        category: { category_code: 'FERTILIZER' },
      });

      db.CultivationCycle.findAll.mockResolvedValue([{
        id: 1, self_declared_crop: 'Paddy',
      }]);
      db.DairyHerdRegister.findOne.mockResolvedValue(null);

      const result = await bridgeService.getSuggestedLinks(42, 1);

      expect(result).toHaveLength(1);
      expect(result[0].suggestions).toHaveLength(1);
      expect(result[0].suggestions[0].activityType).toBe('CROP');
    });
  });

  describe('CATEGORY_MAP', () => {
    it('should export category map with expected entries', () => {
      expect(bridgeService.CATEGORY_MAP.FERTILIZER.target).toBe('task_input_log');
      expect(bridgeService.CATEGORY_MAP.ANIMAL_FEED.target).toBe('dairy_cost_event');
      expect(bridgeService.CATEGORY_MAP.VETERINARY.target).toBe('treatment_event');
      expect(bridgeService.CATEGORY_MAP.MACHINERY_HIRE.target).toBe('machinery_log');
    });
  });
});
