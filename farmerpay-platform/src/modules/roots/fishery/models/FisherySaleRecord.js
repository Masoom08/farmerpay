/**
 * FisherySaleRecord Model
 * Fish sale records linked to harvests: quantity, pricing, buyer.
 */

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class FisherySaleRecord extends Model {
    static associate(models) {
      FisherySaleRecord.belongsTo(models.FisheryHarvestRecord, { foreignKey: 'harvest_record_id', as: 'harvest' });
    }
  }

  FisherySaleRecord.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      harvest_record_id: {
        type: DataTypes.INTEGER, allowNull: false,
        references: { model: 'fishery_harvest_records', key: 'id' },
      },
      sale_date: { type: DataTypes.DATEONLY, allowNull: true },
      quantity_sold_kg: { type: DataTypes.INTEGER, allowNull: true },
      price_per_kg: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
      total_sale_value: { type: DataTypes.DECIMAL(15, 2), allowNull: true },
      transportation_cost: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
      buyer_name: { type: DataTypes.STRING(100), allowNull: true },
      is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
    },
    {
      sequelize, modelName: 'FisherySaleRecord', tableName: 'fishery_sale_records',
      timestamps: true, underscored: true,
      indexes: [{ fields: ['harvest_record_id'] }],
    }
  );

  return FisherySaleRecord;
};
