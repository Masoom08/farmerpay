/**
 * HorticultureExpenseSummary Model
 * Monthly expense breakdown per orchard.
 */

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class HorticultureExpenseSummary extends Model {
    static associate(models) {
      HorticultureExpenseSummary.belongsTo(models.HorticultureOrchard, { foreignKey: 'orchard_id', as: 'orchard' });
    }
  }

  HorticultureExpenseSummary.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      orchard_id: {
        type: DataTypes.INTEGER, allowNull: false,
        references: { model: 'horticulture_orchards', key: 'id' },
      },
      expense_month: { type: DataTypes.INTEGER, allowNull: false },
      expense_year: { type: DataTypes.INTEGER, allowNull: false },
      sapling_cost: { type: DataTypes.DECIMAL(15, 2), allowNull: true },
      input_cost: { type: DataTypes.DECIMAL(15, 2), allowNull: true },
      labor_cost: { type: DataTypes.DECIMAL(15, 2), allowNull: true },
      infrastructure_cost: { type: DataTypes.DECIMAL(15, 2), allowNull: true },
      other_cost: { type: DataTypes.DECIMAL(15, 2), allowNull: true },
      total_expense: { type: DataTypes.DECIMAL(15, 2), allowNull: true },
      is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
    },
    {
      sequelize, modelName: 'HorticultureExpenseSummary', tableName: 'horticulture_expense_summaries',
      timestamps: true, underscored: true,
      indexes: [{ fields: ['orchard_id'] }, { fields: ['expense_month', 'expense_year'] }],
    }
  );

  return HorticultureExpenseSummary;
};
