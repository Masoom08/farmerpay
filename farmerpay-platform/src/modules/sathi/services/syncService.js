/**
 * Sync Service
 * Handles offline sync queue processing and conflict resolution.
 */

const { v4: uuidv4 } = require('uuid');
const logger = require('../../../shared/utils/logger');

let db;
const getDb = () => {
  if (!db) db = require('../../../shared/models');
  return db;
};

/**
 * Processes a batch of sync queue items from the mobile client.
 * Returns counts of synced/failed items and any conflicts detected.
 */
const processSyncQueue = async (agentUserId, syncQueue) => {
  const { SathiSyncQueue, SathiSyncConflict } = getDb();

  let syncedCount = 0;
  let failedCount = 0;
  const conflicts = [];

  for (const item of syncQueue) {
    const queueItemUuid = uuidv4();

    try {
      // Check for conflicts (entity already modified on server)
      const existingItem = await SathiSyncQueue.findOne({
        where: {
          sync_entity_type: item.entityType,
          sync_entity_id: item.entityId,
          sync_status: 'synced',
          is_active: true,
        },
        order: [['sync_succeeded_at', 'DESC']],
      });

      let hasConflict = false;

      if (existingItem && item.action === 'update') {
        // Potential conflict: entity was synced before, check timestamps
        hasConflict = true;
      }

      const queueRecord = await SathiSyncQueue.create({
        queue_item_uuid: queueItemUuid,
        sync_entity_type: item.entityType,
        sync_entity_id: item.entityId || null,
        sync_action: item.action,
        sync_data: item.data || null,
        sync_status: hasConflict ? 'failed' : 'synced',
        sync_attempted_at: new Date(),
        sync_succeeded_at: hasConflict ? null : new Date(),
        sync_failure_reason: hasConflict ? 'Conflict detected: entity modified on server' : null,
      });

      if (hasConflict) {
        const conflict = await SathiSyncConflict.create({
          conflict_uuid: uuidv4(),
          queue_item_id: queueRecord.id,
          conflict_type: 'concurrent_modification',
          server_value: existingItem.sync_data,
          client_value: item.data,
        });

        conflicts.push({
          conflictId: conflict.id,
          conflictUuid: conflict.conflict_uuid,
          entityType: item.entityType,
          entityId: item.entityId,
          conflictType: 'concurrent_modification',
        });

        failedCount++;
      } else {
        syncedCount++;
      }
    } catch (err) {
      logger.error(`Sync failed for ${item.entityType}:${item.entityId}: ${err.message}`);

      await SathiSyncQueue.create({
        queue_item_uuid: queueItemUuid,
        sync_entity_type: item.entityType,
        sync_entity_id: item.entityId || null,
        sync_action: item.action,
        sync_data: item.data || null,
        sync_status: 'failed',
        sync_attempted_at: new Date(),
        sync_failure_reason: err.message,
      });

      failedCount++;
    }
  }

  logger.info(`Sync batch processed: ${syncedCount} synced, ${failedCount} failed, ${conflicts.length} conflicts`);
  return { syncedCount, failedCount, conflicts };
};

/**
 * Resolves a sync conflict with the chosen resolution strategy.
 */
const resolveConflict = async (conflictId, userId, data) => {
  const { SathiSyncConflict, SathiSyncQueue } = getDb();

  const conflict = await SathiSyncConflict.findOne({
    where: { id: conflictId, is_active: true },
    include: [{ model: SathiSyncQueue, as: 'queueItem' }],
  });

  if (!conflict) {
    const err = new Error('Conflict not found');
    err.statusCode = 404;
    err.errorCode = 'RES_001';
    throw err;
  }

  if (conflict.resolution) {
    const err = new Error('Conflict already resolved');
    err.statusCode = 400;
    err.errorCode = 'VAL_002';
    throw err;
  }

  await conflict.update({
    resolution: data.resolution,
    resolved_by: userId,
    resolved_at: new Date(),
  });

  // Re-sync the queue item based on resolution
  if (conflict.queueItem) {
    const syncData = data.resolution === 'use_client'
      ? conflict.client_value
      : data.resolution === 'use_server'
        ? conflict.server_value
        : data.selectedValue;

    await conflict.queueItem.update({
      sync_status: 'synced',
      sync_data: syncData,
      sync_succeeded_at: new Date(),
      sync_failure_reason: null,
    });
  }

  logger.info(`Conflict ${conflictId} resolved with ${data.resolution} by user ${userId}`);
  return conflict;
};

module.exports = {
  processSyncQueue,
  resolveConflict,
};
