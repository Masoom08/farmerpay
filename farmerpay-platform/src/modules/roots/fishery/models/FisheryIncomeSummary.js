/**
 * FisheryIncomeSummary Model
 * Monthly income summary per pond register: fish sales, byproduct income.
 */

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class FisheryIncomeSummary extends Model {
    static associate(models) {
      FisheryIncomeSummary.belongsTo(models.FisheryPondRegister, { foreignKey: 'register_id', as: 'register' });
    }
  }

  FisheryIncomeSummary.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      register_id: {
        type: DataTypes.INTEGER, allowNull: false,
        references: { model: 'fishery_pond_registers', key: 'id' },
      },
      income_month: { type: DataTypes.INTEGER, allowNull: false },
      income_year: { type: DataTypes.INTEGER, allowNull: false },
      fish_sale_kg: { type: DataTypes.INTEGER, allowNull: true },
      fish_sale_income: { type: DataTypes.DECIMAL(15, 2), allowNull: true },
      byproduct_income: { type: DataTypes.DECIMAL(15, 2), allowNull: true },
      total_income: { type: DataTypes.DECIMAL(15, 2), allowNull: true },
      is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
    },
    {
      sequelize, modelName: 'FisheryIncomeSummary', tableName: 'fishery_income_summaries',
      timestamps: true, underscored: true,
      indexes: [{ fields: ['register_id'] }, { fields: ['income_month', 'income_year'] }],
    }
  );

  return FisheryIncomeSummary;
};
