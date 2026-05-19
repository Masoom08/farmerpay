/**
 * FisheryExpenseSummary Model
 * Monthly expense breakdown per pond register: fingerlings, feed, water, labor.
 */

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class FisheryExpenseSummary extends Model {
    static associate(models) {
      FisheryExpenseSummary.belongsTo(models.FisheryPondRegister, { foreignKey: 'register_id', as: 'register' });
    }
  }

  FisheryExpenseSummary.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      register_id: {
        type: DataTypes.INTEGER, allowNull: false,
        references: { model: 'fishery_pond_registers', key: 'id' },
      },
      expense_month: { type: DataTypes.INTEGER, allowNull: false },
      expense_year: { type: DataTypes.INTEGER, allowNull: false },
      fingerling_cost: { type: DataTypes.DECIMAL(15, 2), allowNull: true },
      feed_cost: { type: DataTypes.DECIMAL(15, 2), allowNull: true },
      water_management_cost: { type: DataTypes.DECIMAL(15, 2), allowNull: true },
      labor_cost: { type: DataTypes.DECIMAL(15, 2), allowNull: true },
      other_cost: { type: DataTypes.DECIMAL(15, 2), allowNull: true },
      total_expense: { type: DataTypes.DECIMAL(15, 2), allowNull: true },
      is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
    },
    {
      sequelize, modelName: 'FisheryExpenseSummary', tableName: 'fishery_expense_summaries',
      timestamps: true, underscored: true,
      indexes: [{ fields: ['register_id'] }, { fields: ['expense_month', 'expense_year'] }],
    }
  );

  return FisheryExpenseSummary;
};
