/**
 * SathiSyncQueue Model
 * Offline sync queue for mobile-first operation. Tracks pending changes to sync when online.
 */

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class SathiSyncQueue extends Model {
    static associate(models) {
      SathiSyncQueue.hasMany(models.SathiSyncConflict, {
        foreignKey: 'queue_item_id',
        as: 'conflicts',
      });
    }
  }

  SathiSyncQueue.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      queue_item_uuid: {
        type: DataTypes.STRING(36),
        allowNull: false,
        unique: true,
      },
      sync_entity_type: { type: DataTypes.STRING(100), allowNull: false },
      sync_entity_id: { type: DataTypes.INTEGER, allowNull: true },
      sync_action: {
        type: DataTypes.ENUM('create', 'update', 'delete'),
        allowNull: false,
      },
      sync_data: { type: DataTypes.JSON, allowNull: true },
      sync_status: {
        type: DataTypes.ENUM('pending', 'synced', 'failed', 'retry'),
        allowNull: false,
        defaultValue: 'pending',
      },
      sync_attempted_at: { type: DataTypes.DATE, allowNull: true },
      sync_succeeded_at: { type: DataTypes.DATE, allowNull: true },
      sync_failure_reason: { type: DataTypes.TEXT, allowNull: true },
      retry_count: { type: DataTypes.INTEGER, allowNull: true, defaultValue: 0 },
      is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
    },
    {
      sequelize,
      modelName: 'SathiSyncQueue',
      tableName: 'sathi_sync_queues',
      timestamps: true,
      underscored: true,
      indexes: [
        { fields: ['queue_item_uuid'], unique: true },
        { fields: ['sync_status'] },
        { fields: ['sync_entity_type', 'sync_entity_id'] },
      ],
    }
  );

  return SathiSyncQueue;
};
