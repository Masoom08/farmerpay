'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class VendorServiceArea extends Model {
    static associate(models) {
      VendorServiceArea.belongsTo(models.VendorProfile, { foreignKey: 'vendor_id', as: 'vendor' });
    }
  }

  VendorServiceArea.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      vendor_id: {
        type: DataTypes.INTEGER,
        references: {
          model: 'vendor_profiles',
          key: 'id',
        },
      },
      lgd_state_id: {
        type: DataTypes.INTEGER,
      },
      lgd_district_id: {
        type: DataTypes.INTEGER,
      },
      lgd_block_id: {
        type: DataTypes.INTEGER,
      },
      lgd_village_id: {
        type: DataTypes.INTEGER,
      },
      service_radius_km: {
        type: DataTypes.INTEGER,
      },
      service_start_date: {
        type: DataTypes.DATEONLY,
      },
      is_primary_service_area: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
    },
    {
      sequelize,
      modelName: 'VendorServiceArea',
      tableName: 'vendor_service_areas',
      timestamps: true,
      underscored: true,
    }
  );

  return VendorServiceArea;
};
