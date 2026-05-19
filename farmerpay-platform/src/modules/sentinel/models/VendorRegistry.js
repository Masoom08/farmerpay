/**
 * VendorRegistry Model
 * Vendor credit and risk registry for monitoring vendor creditworthiness.
 */

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class VendorRegistry extends Model {
    static associate(models) {
      if (models.VendorProfile) {
        VendorRegistry.belongsTo(models.VendorProfile, {
          foreignKey: 'vendor_id',
          as: 'vendor',
        });
      }
    }
  }

  VendorRegistry.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      registry_uuid: { type: DataTypes.STRING(36), allowNull: false, unique: true },
      vendor_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'vendor_profiles', key: 'id' },
      },
      vendor_credit_score: { type: DataTypes.INTEGER, allowNull: true },
      vendor_credit_behavior_score: { type: DataTypes.INTEGER, allowNull: true },
      vendor_default_history_count: { type: DataTypes.INTEGER, allowNull: true, defaultValue: 0 },
      vendor_repayment_rate: { type: DataTypes.DECIMAL(5, 2), allowNull: true },
      is_high_risk: { type: DataTypes.BOOLEAN, defaultValue: false },
      registry_date: { type: DataTypes.DATEONLY, allowNull: true },
      is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
    },
    {
      sequelize,
      modelName: 'VendorRegistry',
      tableName: 'vendor_registries',
      timestamps: true,
      underscored: true,
      indexes: [
        { fields: ['registry_uuid'], unique: true },
        { fields: ['vendor_id'] },
        { fields: ['is_high_risk'] },
      ],
    }
  );

  return VendorRegistry;
};
