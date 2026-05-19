/**
 * HorticulturePlanting Model
 * Sapling/planting material records per orchard.
 */

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class HorticulturePlanting extends Model {
    static associate(models) {
      HorticulturePlanting.belongsTo(models.HorticultureOrchard, { foreignKey: 'orchard_id', as: 'orchard' });
    }
  }

  HorticulturePlanting.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      orchard_id: {
        type: DataTypes.INTEGER, allowNull: false,
        references: { model: 'horticulture_orchards', key: 'id' },
      },
      sapling_source: { type: DataTypes.STRING(100), allowNull: true },
      sapling_variety: { type: DataTypes.STRING(100), allowNull: true },
      sapling_count: { type: DataTypes.INTEGER, allowNull: true },
      sapling_cost_per_unit: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
      planting_date: { type: DataTypes.DATEONLY, allowNull: true },
      survival_rate_percent: { type: DataTypes.DECIMAL(5, 2), allowNull: true },
      is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
    },
    {
      sequelize, modelName: 'HorticulturePlanting', tableName: 'horticulture_plantings',
      timestamps: true, underscored: true,
      indexes: [{ fields: ['orchard_id'] }],
    }
  );

  return HorticulturePlanting;
};
