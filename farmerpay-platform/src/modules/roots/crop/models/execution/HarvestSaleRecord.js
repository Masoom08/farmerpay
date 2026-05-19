'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class HarvestSaleRecord extends Model {
    static associate(models) {
      HarvestSaleRecord.belongsTo(models.HarvestRecord, {
        foreignKey: 'harvest_record_id',
        as: 'harvestRecord',
      });
    }
  }

  HarvestSaleRecord.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      record_uuid: {
        type: DataTypes.STRING(36),
        unique: true,
        allowNull: false,
      },
      harvest_record_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'harvest_records',
          key: 'id',
        },
      },
      sale_date: {
        type: DataTypes.DATEONLY,
      },
      quantity_sold_kg: {
        type: DataTypes.INTEGER,
      },
      price_per_kg: {
        type: DataTypes.DECIMAL(10, 2),
      },
      gross_sale_value: {
        type: DataTypes.DECIMAL(15, 2),
      },
      transportation_cost: {
        type: DataTypes.DECIMAL(10, 2),
      },
      market_fees_cost: {
        type: DataTypes.DECIMAL(10, 2),
      },
      net_sale_value: {
        type: DataTypes.DECIMAL(15, 2),
      },
      buyer_name: {
        type: DataTypes.STRING(100),
      },
      buyer_type: {
        type: DataTypes.ENUM('local_trader', 'mandi', 'fpo', 'company', 'broker'),
      },
      sale_type: {
        type: DataTypes.ENUM('mandi', 'msp_procurement', 'fpo_pooling', 'contract_buyback', 'direct_retail', 'export'),
        defaultValue: 'mandi',
      },
      transport_mode: { type: DataTypes.STRING(50), allowNull: true },
      distance_to_market_km: { type: DataTypes.DECIMAL(6, 1), allowNull: true },
      sale_contract_linked: {
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
      modelName: 'HarvestSaleRecord',
      tableName: 'harvest_sale_records',
      timestamps: true,
      underscored: true,
    }
  );

  return HarvestSaleRecord;
};
