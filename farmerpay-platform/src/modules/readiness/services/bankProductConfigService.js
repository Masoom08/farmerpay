/**
 * BankProductConfigService
 * Manages per-bank, per-product decisioning thresholds with version history.
 *
 * Every update deactivates the previous active row and creates a new one
 * with an incremented version — full audit trail, no destructive updates.
 */

const logger = require('../../../shared/utils/logger');
const { generateUUID } = require('../../../shared/utils/uuidHelper');
const { setWithTTL, getKey, deleteKeys } = require('../../../config/redis');

// Lazy DB loading
let db;
const getDb = () => { if (!db) db = require('../../../shared/models'); return db; };

const CACHE_TTL = 3600; // 1 hour — thresholds change rarely

const DEFAULT_THRESHOLDS = {
  trustCutoff: 60,
  fhsCutoff: 50,
};

/**
 * Get active thresholds for a (bank, product) pair.
 * Resolution order: product-specific → bank-wide default → system default.
 */
const getThresholds = async (bankId, productId = null) => {
  const cacheKey = `bpc:thresholds:${bankId}:${productId || 'default'}`;
  const cached = await getKey(cacheKey);
  if (cached) {
    try { return JSON.parse(cached); } catch { /* fall through */ }
  }

  const { BankProductConfig } = getDb();

  // Try product-specific first
  if (productId) {
    const specific = await BankProductConfig.findOne({
      where: { bank_id: bankId, product_id: productId, is_active: true },
      order: [['version', 'DESC']],
    });
    if (specific) {
      const result = {
        trustCutoff: Number(specific.trust_cutoff),
        fhsCutoff: Number(specific.fhs_cutoff),
        source: 'product',
        configUuid: specific.config_uuid,
        version: specific.version,
      };
      await setWithTTL(cacheKey, JSON.stringify(result), CACHE_TTL);
      return result;
    }
  }

  // Fall back to bank-wide default (product_id IS NULL)
  const bankDefault = await BankProductConfig.findOne({
    where: { bank_id: bankId, product_id: null, is_active: true },
    order: [['version', 'DESC']],
  });
  if (bankDefault) {
    const result = {
      trustCutoff: Number(bankDefault.trust_cutoff),
      fhsCutoff: Number(bankDefault.fhs_cutoff),
      source: 'bank',
      configUuid: bankDefault.config_uuid,
      version: bankDefault.version,
    };
    await setWithTTL(cacheKey, JSON.stringify(result), CACHE_TTL);
    return result;
  }

  // System defaults
  return { ...DEFAULT_THRESHOLDS, source: 'system', configUuid: null, version: 0 };
};

/**
 * Update thresholds for a (bank, product) pair.
 * Deactivates the current active row and creates a new versioned row.
 * Returns the new config row.
 */
const updateThresholds = async ({ bankId, productId = null, trustCutoff, fhsCutoff, reason, updatedBy }) => {
  const { BankProductConfig, sequelize: seq } = getDb();

  const transaction = await seq.transaction();
  try {
    // Find current active config
    const current = await BankProductConfig.findOne({
      where: { bank_id: bankId, product_id: productId, is_active: true },
      order: [['version', 'DESC']],
      transaction,
    });

    const nextVersion = current ? current.version + 1 : 1;

    // Deactivate current if exists
    if (current) {
      await BankProductConfig.update(
        { is_active: false },
        { where: { id: current.id }, transaction },
      );
    }

    // Create new versioned row
    const newConfig = await BankProductConfig.create({
      config_uuid: generateUUID(),
      bank_id: bankId,
      product_id: productId,
      trust_cutoff: trustCutoff ?? current?.trust_cutoff ?? DEFAULT_THRESHOLDS.trustCutoff,
      fhs_cutoff: fhsCutoff ?? current?.fhs_cutoff ?? DEFAULT_THRESHOLDS.fhsCutoff,
      version: nextVersion,
      change_reason: reason || null,
      updated_by: updatedBy,
      is_active: true,
      effective_from: new Date(),
    }, { transaction });

    await transaction.commit();

    // Invalidate cache
    await deleteKeys([
      `bpc:thresholds:${bankId}:${productId || 'default'}`,
      `bpc:thresholds:${bankId}:default`,
    ]);

    logger.info('bankProductConfig: thresholds updated', {
      bankId, productId, version: nextVersion, trustCutoff: newConfig.trust_cutoff, fhsCutoff: newConfig.fhs_cutoff,
    });

    return formatConfig(newConfig);
  } catch (err) {
    await transaction.rollback();
    throw err;
  }
};

/**
 * Get version history for a (bank, product) pair.
 */
const getHistory = async (bankId, productId = null) => {
  const { BankProductConfig } = getDb();

  const rows = await BankProductConfig.findAll({
    where: { bank_id: bankId, ...(productId ? { product_id: productId } : { product_id: null }) },
    order: [['version', 'DESC']],
    limit: 50,
  });

  return rows.map(formatConfig);
};

/**
 * Get active config for a bank (optionally filtered by product).
 */
const getActiveConfig = async (bankId, productId = null) => {
  const { BankProductConfig } = getDb();

  const config = await BankProductConfig.findOne({
    where: { bank_id: bankId, product_id: productId, is_active: true },
    order: [['version', 'DESC']],
  });

  return config ? formatConfig(config) : null;
};

function formatConfig(row) {
  return {
    configUuid: row.config_uuid,
    bankId: row.bank_id,
    productId: row.product_id,
    trustCutoff: Number(row.trust_cutoff),
    fhsCutoff: Number(row.fhs_cutoff),
    version: row.version,
    changeReason: row.change_reason,
    updatedBy: row.updated_by,
    isActive: row.is_active,
    effectiveFrom: row.effective_from,
    createdAt: row.created_at,
  };
}

module.exports = { getThresholds, updateThresholds, getHistory, getActiveConfig, DEFAULT_THRESHOLDS };
