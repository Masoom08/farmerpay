'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class VendorCrpMapping extends Model {
    static associate(models) {
      VendorCrpMapping.belongsTo(models.VendorProfile, { foreignKey: 'vendor_id', as: 'vendor' });
      VendorCrpMapping.belongsTo(models.FieldAgentProfile, { foreignKey: 'crp_id', as: 'crp' });
    }
  }

  VendorCrpMapping.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      vendor_id: {
        type: DataTypes.INTEGER, allowNull: false,
        references: { model: 'vendor_profiles', key: 'id' },
      },
      crp_id: {
        type: DataTypes.INTEGER, allowNull: false,
        references: { model: 'field_agent_profiles', key: 'id' },
      },
      mapping_status: {
        type: DataTypes.ENUM('active', 'inactive'), allowNull: false, defaultValue: 'active',
      },
      mapped_at: { type: DataTypes.DATE, allowNull: true },
      is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
    },
    {
      sequelize, modelName: 'VendorCrpMapping', tableName: 'vendor_crp_mappings',
      timestamps: true, underscored: true,
      indexes: [{ fields: ['vendor_id'] }, { fields: ['crp_id'] }],
    }
  );

  return VendorCrpMapping;
};
