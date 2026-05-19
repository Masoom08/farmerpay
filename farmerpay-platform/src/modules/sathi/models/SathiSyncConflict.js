/**
 * SathiSyncConflict Model
 * Records conflicts when offline changes clash with server state. Supports manual resolution.
 */

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class SathiSyncConflict extends Model {
    static associate(models) {
      SathiSyncConflict.belongsTo(models.SathiSyncQueue, {
        foreignKey: 'queue_item_id',
        as: 'queueItem',
      });
    }
  }

  SathiSyncConflict.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      conflict_uuid: {
        type: DataTypes.STRING(36),
        allowNull: false,
        unique: true,
      },
      queue_item_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'sathi_sync_queues', key: 'id' },
      },
      conflict_type: { type: DataTypes.STRING(100), allowNull: false },
      server_value: { type: DataTypes.JSON, allowNull: true },
      client_value: { type: DataTypes.JSON, allowNull: true },
      resolution: { type: DataTypes.STRING(50), allowNull: true },
      resolved_by: { type: DataTypes.INTEGER, allowNull: true },
      resolved_at: { type: DataTypes.DATE, allowNull: true },
      is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
    },
    {
      sequelize,
      modelName: 'SathiSyncConflict',
      tableName: 'sathi_sync_conflicts',
      timestamps: true,
      underscored: true,
      indexes: [
        { fields: ['conflict_uuid'], unique: true },
        { fields: ['queue_item_id'] },
      ],
    }
  );

  return SathiSyncConflict;
};
