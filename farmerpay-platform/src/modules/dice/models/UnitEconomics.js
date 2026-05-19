const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class UnitEconomics extends Model {
    static associate(models) { UnitEconomics.belongsTo(models.ScaleOfFinance, { foreignKey: 'sof_id', as: 'scaleOfFinance' }); }
  }
  UnitEconomics.init({
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    ue_uuid: { type: DataTypes.STRING(36), allowNull: false, unique: true },
    sof_id: { type: DataTypes.INTEGER, allowNull: true, references: { model: 'scale_of_finances', key: 'id' } },
    crop_id: { type: DataTypes.INTEGER, allowNull: true },
    state_id: { type: DataTypes.INTEGER, allowNull: true },
    total_cost_per_hectare: { type: DataTypes.DECIMAL(15, 2), allowNull: true },
    expected_yield_kg_per_hectare: { type: DataTypes.INTEGER, allowNull: true },
    expected_price_per_kg: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
    expected_gross_return: { type: DataTypes.DECIMAL(15, 2), allowNull: true },
    expected_net_profit: { type: DataTypes.DECIMAL(15, 2), allowNull: true },
    repayment_period_months: { type: DataTypes.INTEGER, allowNull: true },
    last_updated: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
  }, { sequelize, modelName: 'UnitEconomics', tableName: 'unit_economics', timestamps: true, underscored: true });
  return UnitEconomics;
};
