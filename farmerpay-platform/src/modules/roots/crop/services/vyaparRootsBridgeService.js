/**
 * VYAPAR-ROOTS Bridge Service
 *
 * Auto-links vendor purchases to ROOTS cost entries by matching
 * product categories to farm activity stages. Listens for
 * vyapar.transaction.created events via RabbitMQ consumer.
 */

const { Op } = require('sequelize');
const logger = require('../../../../shared/utils/logger');
const { generateUUID } = require('../../../../shared/utils/uuidHelper');

let db;
const getDb = () => { if (!db) db = require('../../../../shared/models'); return db; };

const MS_PER_DAY = 86400000;

/* ─── Category Mapping ─── */

const CATEGORY_MAP = {
  FERTILIZER:       { target: 'task_input_log', roots_category: 'fertilizer' },
  PESTICIDE:        { target: 'task_input_log', roots_category: 'pesticide' },
  INSECTICIDE:      { target: 'task_input_log', roots_category: 'pesticide' },
  FUNGICIDE:        { target: 'task_input_log', roots_category: 'pesticide' },
  HERBICIDE:        { target: 'task_input_log', roots_category: 'herbicide' },
  SEED:             { target: 'task_input_log', roots_category: 'seed' },
  MICRONUTRIENT:    { target: 'task_input_log', roots_category: 'micronutrient' },
  GROWTH_REGULATOR: { target: 'task_input_log', roots_category: 'growth_regulator' },
  FYM_COMPOST:      { target: 'task_input_log', roots_category: 'organic_manure' },
  ANIMAL_FEED:      { target: 'dairy_cost_event', roots_category: 'feed' },
  POULTRY_FEED:     { target: 'poultry_cost', roots_category: 'feed' },
  VETERINARY:       { target: 'treatment_event', roots_category: 'medicine' },
  MACHINERY_HIRE:   { target: 'machinery_log', roots_category: 'machinery' },
};

/* ====================================================================
 * 1. processTransaction
 * ==================================================================== */

const processTransaction = async (vendorTransactionId) => {
  const {
    VendorTransaction, VendorTransactionItem, InputItem, InputCategory,
    CultivationCycle, WorkbandExecution, TaskExecution, PopTask, PopTaskInput,
    TaskExecutionInputLog, DairyCostEvent, DairyHerdRegister,
    FarmerActivitySubscription, sequelize,
  } = getDb();

  const txn = await VendorTransaction.findByPk(vendorTransactionId, {
    include: [{ model: VendorTransactionItem, as: 'items', where: { is_active: true } }],
  });

  if (!txn || !txn.farmer_id || txn.transaction_status === 'cancelled') {
    return { mapped_items: [], unmapped_items: [], notifications: [] };
  }

  const farmerId = txn.farmer_id;
  const mappedItems = [];
  const unmappedItems = [];
  const notifications = [];

  const t = await sequelize.transaction();

  try {
    // Find active crop cycles
    const activeCycles = await CultivationCycle.findAll({
      where: {
        farmer_id: farmerId, is_active: true,
        cycle_status: { [Op.in]: ['sowing', 'growing', 'monitoring', 'harvesting'] },
      },
      order: [['created_at', 'DESC']],
      transaction: t,
    });

    for (const item of txn.items || []) {
      // Resolve input category
      const inputItem = item.input_item_id
        ? await InputItem.findOne({
          where: { item_uuid: item.input_item_id, is_active: true },
          include: [{ model: InputCategory, as: 'category', attributes: ['category_code', 'category_name'] }],
          transaction: t,
        })
        : null;

      const categoryCode = inputItem?.category?.category_code?.toUpperCase() || null;
      const mapping = categoryCode ? CATEGORY_MAP[categoryCode] : null;

      if (!mapping) {
        unmappedItems.push({
          transactionItemId: item.id,
          inputItemId: item.input_item_id,
          reason: 'no_category_match',
        });
        await item.update({ roots_link_status: 'pending' }, { transaction: t });
        continue;
      }

      let linked = false;

      // ── Crop input logs ──
      if (mapping.target === 'task_input_log' && activeCycles.length > 0) {
        const cycle = activeCycles[0]; // primary active cycle
        const matchResult = await findMatchingStage(cycle, item, inputItem, t);

        if (matchResult) {
          // Create TaskExecutionInputLog
          await TaskExecutionInputLog.create({
            task_execution_id: matchResult.taskExecutionId,
            input_item_id: item.input_item_id,
            input_pack_id: item.input_pack_id || null,
            quantity_used: item.quantity,
            input_cost: parseFloat(item.line_total || 0),
            is_active: true,
          }, { transaction: t });

          await item.update({
            roots_link_status: 'auto_linked',
            roots_cycle_id: cycle.id,
            roots_task_execution_id: matchResult.taskExecutionId,
            roots_activity_type: 'CROP',
            roots_linked_at: new Date(),
          }, { transaction: t });

          mappedItems.push({
            transactionItemId: item.id,
            activityType: 'CROP',
            cycleName: cycle.self_declared_crop || 'Crop',
            stageName: matchResult.workbandName,
            confidence: matchResult.confidence,
          });
          linked = true;
        }
      }

      // ── Dairy cost events ──
      if (mapping.target === 'dairy_cost_event' && !linked) {
        const herd = await DairyHerdRegister.findOne({
          where: { farmer_id: farmerId, is_active: true },
          transaction: t,
        });

        if (herd) {
          await DairyCostEvent.create({
            cost_uuid: generateUUID(),
            herd_id: herd.id,
            cost_type: mapping.roots_category,
            cost_amount: parseFloat(item.line_total || 0),
            cost_date: txn.transaction_date || new Date().toISOString().slice(0, 10),
            description: `Auto: VYAPAR purchase ${inputItem?.item_name || 'item'}`,
            source: 'VYAPAR',
            vendor_transaction_item_id: item.id,
            is_active: true,
          }, { transaction: t });

          await item.update({
            roots_link_status: 'auto_linked',
            roots_activity_type: 'DAIRY',
            roots_linked_at: new Date(),
          }, { transaction: t });

          mappedItems.push({
            transactionItemId: item.id,
            activityType: 'DAIRY',
            cycleName: 'Dairy Herd',
            stageName: mapping.roots_category,
            confidence: 0.8,
          });
          linked = true;
        }
      }

      if (!linked) {
        unmappedItems.push({
          transactionItemId: item.id,
          inputItemId: item.input_item_id,
          categoryCode,
          reason: 'no_active_activity',
        });
        await item.update({ roots_link_status: 'pending' }, { transaction: t });
      }
    }

    await t.commit();

    // Notifications
    if (mappedItems.length > 0) {
      await notifyFarmer(farmerId, mappedItems, txn);
    }

    logger.info(`VYAPAR-ROOTS bridge: txn ${vendorTransactionId} → ${mappedItems.length} mapped, ${unmappedItems.length} unmapped`);
    return { mapped_items: mappedItems, unmapped_items: unmappedItems, notifications };
  } catch (err) {
    await t.rollback();
    logger.error('VYAPAR-ROOTS bridge failed', { transactionId: vendorTransactionId, error: err.message });
    throw err;
  }
};

/* ─── Stage matching helper ─── */

const findMatchingStage = async (cycle, item, inputItem, transaction) => {
  const { WorkbandExecution, TaskExecution, PopTask, PopTaskInput } = getDb();

  if (!cycle.cycle_sowing_date || !cycle.pop_id) return null;

  const currentDay = Math.round((Date.now() - new Date(cycle.cycle_sowing_date).getTime()) / MS_PER_DAY);

  // Find workband executions with their tasks
  const wbExecs = await WorkbandExecution.findAll({
    where: { cycle_id: cycle.cycle_uuid, is_active: true },
    include: [{
      model: TaskExecution, as: 'taskExecutions', required: false,
      where: { is_active: true },
      include: [{
        model: PopTask, as: 'popTask', required: false,
        include: [{
          model: PopTaskInput, as: 'popTaskInputs', required: false,
          where: item.input_item_id ? { input_item_id: item.input_item_id } : {},
        }],
      }],
    }],
    order: [['id', 'DESC']], // most recent first
    transaction,
  });

  // Find best match: active/in-progress stage with matching input
  for (const wb of wbExecs) {
    const st = (wb.workband_status || '').toLowerCase();
    if (st === 'completed' || st === 'skipped') continue;

    for (const te of wb.taskExecutions || []) {
      const popInputs = te.popTask?.popTaskInputs || [];
      if (popInputs.length > 0) {
        // Direct input match
        return {
          taskExecutionId: te.id,
          workbandName: wb.workband_name || 'Unknown stage',
          confidence: 0.95,
        };
      }
    }

    // Fallback: use first task of active workband (lower confidence)
    const firstTask = (wb.taskExecutions || [])[0];
    if (firstTask) {
      return {
        taskExecutionId: firstTask.id,
        workbandName: wb.workband_name || 'Unknown stage',
        confidence: 0.6,
      };
    }
  }

  return null;
};

/* ====================================================================
 * 2. notifyFarmer
 * ==================================================================== */

const notifyFarmer = async (farmerId, mappedItems, txn) => {
  try {
    const { getChannel } = require('../../../../config/rabbitmq');
    const config = require('../../../../config');
    const channel = await getChannel();
    if (!channel) return;

    const itemSummary = mappedItems.slice(0, 2).map((m) => m.stageName || m.activityType).join(', ');
    const totalCost = mappedItems.length;

    channel.publish(
      config.rabbitmq.exchange,
      'notification.push.farmer',
      Buffer.from(JSON.stringify({
        farmerId,
        type: 'vyapar_roots_link',
        title: '🛒 Purchase linked to farm expenses',
        body: `${totalCost} item(s) from your vendor purchase added to ${itemSummary} expenses.`,
        data: { screen: 'cycle-detail', transactionId: txn.id },
        priority: 'normal',
        deliveredAt: new Date(),
      })),
      { persistent: true }
    );
  } catch (err) {
    logger.warn('VYAPAR-ROOTS notification failed', { farmerId, error: err.message });
  }
};

/* ====================================================================
 * 3. unlinkTransaction
 * ==================================================================== */

const unlinkTransaction = async (farmerId, transactionItemId, reason) => {
  const { VendorTransactionItem, VendorTransaction, TaskExecutionInputLog, sequelize } = getDb();

  const item = await VendorTransactionItem.findByPk(transactionItemId, {
    include: [{ model: VendorTransaction, as: 'transaction', attributes: ['farmer_id'] }],
  });

  if (!item || item.transaction?.farmer_id !== farmerId) {
    const err = new Error('Transaction item not found');
    err.statusCode = 404; throw err;
  }

  const t = await sequelize.transaction();
  try {
    // Remove the auto-created input log if it exists
    if (item.roots_task_execution_id) {
      await TaskExecutionInputLog.update(
        { is_active: false },
        {
          where: {
            task_execution_id: item.roots_task_execution_id,
            input_item_id: item.input_item_id,
            is_active: true,
          },
          transaction: t,
        }
      );
    }

    await item.update({
      roots_link_status: 'unlinked',
      roots_unlink_reason: reason || 'Farmer disputed',
      roots_task_execution_id: null,
      roots_cycle_id: null,
    }, { transaction: t });

    await t.commit();

    logger.info(`VYAPAR-ROOTS unlinked: item ${transactionItemId} by farmer ${farmerId}`);
    return { transactionItemId, status: 'unlinked', reason };
  } catch (err) {
    await t.rollback();
    throw err;
  }
};

/* ====================================================================
 * 4. getSuggestedLinks
 * ==================================================================== */

const getSuggestedLinks = async (farmerId, transactionId) => {
  const {
    VendorTransaction, VendorTransactionItem, InputItem, InputCategory,
    CultivationCycle, DairyHerdRegister, FarmerActivitySubscription,
  } = getDb();

  const txn = await VendorTransaction.findByPk(transactionId, {
    include: [{
      model: VendorTransactionItem, as: 'items',
      where: { is_active: true, roots_link_status: { [Op.in]: ['pending', null] } },
      required: false,
    }],
  });

  if (!txn || txn.farmer_id !== farmerId) {
    const err = new Error('Transaction not found'); err.statusCode = 404; throw err;
  }

  const activeCycles = await CultivationCycle.findAll({
    where: {
      farmer_id: farmerId, is_active: true,
      cycle_status: { [Op.in]: ['sowing', 'growing', 'monitoring', 'harvesting'] },
    },
  });

  const hasDairy = await DairyHerdRegister.findOne({ where: { farmer_id: farmerId, is_active: true } });

  const suggestions = [];

  for (const item of txn.items || []) {
    const inputItem = item.input_item_id
      ? await InputItem.findOne({
        where: { item_uuid: item.input_item_id },
        include: [{ model: InputCategory, as: 'category' }],
      })
      : null;

    const categoryCode = inputItem?.category?.category_code?.toUpperCase() || null;
    const mapping = categoryCode ? CATEGORY_MAP[categoryCode] : null;
    const itemSuggestions = [];

    if (mapping?.target === 'task_input_log') {
      activeCycles.forEach((cycle) => {
        itemSuggestions.push({
          activityType: 'CROP',
          activityName: cycle.self_declared_crop || 'Crop cycle',
          cycleId: cycle.id,
          stageName: null,
          confidence: 0.7,
        });
      });
    }

    if (mapping?.target === 'dairy_cost_event' && hasDairy) {
      itemSuggestions.push({
        activityType: 'DAIRY',
        activityName: 'Dairy Herd',
        cycleId: null,
        stageName: mapping.roots_category,
        confidence: 0.8,
      });
    }

    if (itemSuggestions.length === 0 && activeCycles.length > 0) {
      itemSuggestions.push({
        activityType: 'CROP',
        activityName: 'General expense',
        cycleId: activeCycles[0].id,
        stageName: null,
        confidence: 0.3,
      });
    }

    suggestions.push({
      transactionItemId: item.id,
      inputName: inputItem?.item_name || 'Unknown',
      category: categoryCode,
      amount: parseFloat(item.line_total || 0),
      suggestions: itemSuggestions,
    });
  }

  return suggestions;
};

module.exports = {
  processTransaction,
  notifyFarmer,
  unlinkTransaction,
  getSuggestedLinks,
  CATEGORY_MAP,
};
