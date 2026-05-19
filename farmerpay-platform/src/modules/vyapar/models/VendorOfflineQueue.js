'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class VendorOfflineQueue extends Model {
    static associate(models) {
      VendorOfflineQueue.belongsTo(models.VendorProfile, { foreignKey: 'vendor_id', as: 'vendor' });
    }
  }

  VendorOfflineQueue.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      vendor_id: {
        type: DataTypes.INTEGER, allowNull: false,
        references: { model: 'vendor_profiles', key: 'id' },
      },
      offline_transaction_id: { type: DataTypes.STRING(36), allowNull: false },
      transaction_data: { type: DataTypes.JSON, allowNull: true },
      sync_status: {
        type: DataTypes.ENUM('pending', 'synced', 'failed'), allowNull: false, defaultValue: 'pending',
      },
      synced_at: { type: DataTypes.DATE, allowNull: true },
      failed_reason: { type: DataTypes.TEXT, allowNull: true },
      is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
    },
    {
      sequelize, modelName: 'VendorOfflineQueue', tableName: 'vendor_offline_queues',
      timestamps: true, underscored: true,
      indexes: [{ fields: ['vendor_id'] }, { fields: ['sync_status'] }],
    }
  );

  return VendorOfflineQueue;
};
