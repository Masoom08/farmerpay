/**
 * HorticultureHarvest Model
 * Harvest records with grading, rejection, and yield tracking.
 */

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class HorticultureHarvest extends Model {
    static associate(models) {
      HorticultureHarvest.belongsTo(models.HorticultureOrchard, { foreignKey: 'orchard_id', as: 'orchard' });
    }
  }

  HorticultureHarvest.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      orchard_id: {
        type: DataTypes.INTEGER, allowNull: false,
        references: { model: 'horticulture_orchards', key: 'id' },
      },
      harvest_date: { type: DataTypes.DATEONLY, allowNull: false },
      total_yield_kg: { type: DataTypes.INTEGER, allowNull: true },
      grade_a_kg: { type: DataTypes.INTEGER, allowNull: true },
      grade_b_kg: { type: DataTypes.INTEGER, allowNull: true },
      grade_c_kg: { type: DataTypes.INTEGER, allowNull: true },
      rejection_kg: { type: DataTypes.INTEGER, allowNull: true },
      rejection_reason: { type: DataTypes.STRING(200), allowNull: true },
      sale_quantity_kg: { type: DataTypes.INTEGER, allowNull: true },
      sale_price_per_kg: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
      total_sale_value: { type: DataTypes.DECIMAL(15, 2), allowNull: true },
      buyer_name: { type: DataTypes.STRING(100), allowNull: true },
      buyer_type: {
        type: DataTypes.ENUM('mandi', 'processor', 'exporter', 'retail', 'fpo'), allowNull: true,
      },
      is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
    },
    {
      sequelize, modelName: 'HorticultureHarvest', tableName: 'horticulture_harvests',
      timestamps: true, underscored: true,
      indexes: [{ fields: ['orchard_id'] }, { fields: ['harvest_date'] }],
    }
  );

  return HorticultureHarvest;
};
