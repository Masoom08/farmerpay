/**
 * Offline Queue Service — Sync vendor transactions from offline mode.
 */

const { v4: uuidv4 } = require('uuid');
const logger = require('../../../shared/utils/logger');

let db;
const getDb = () => { if (!db) db = require('../../../shared/models'); return db; };

/**
 * Processes offline transaction queue for a vendor.
 */
const processOfflineQueue = async (vendorId, queueItems) => {
  const { VendorOfflineQueue } = getDb();

  let syncedCount = 0;
  let failedCount = 0;

  for (const item of queueItems) {
    try {
      await VendorOfflineQueue.create({
        vendor_id: vendorId,
        offline_transaction_id: item.offlineTransactionId || uuidv4(),
        transaction_data: item.data,
        sync_status: 'synced',
        synced_at: new Date(),
      });
      syncedCount++;
    } catch (err) {
      await VendorOfflineQueue.create({
        vendor_id: vendorId,
        offline_transaction_id: item.offlineTransactionId || uuidv4(),
        transaction_data: item.data,
        sync_status: 'failed',
        failed_reason: err.message,
      });
      failedCount++;
    }
  }

  logger.info(`Vendor ${vendorId} offline sync: ${syncedCount} synced, ${failedCount} failed`);
  return { syncedCount, failedCount };
};

module.exports = { processOfflineQueue };
