/**
 * GoatCostEvent Model — Expense tracking by category for a herd.
 */
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class GoatCostEvent extends Model {
    static associate(models) {
      GoatCostEvent.belongsTo(models.GoatHerd, { foreignKey: 'herd_id', as: 'herd' });
    }
  }

  GoatCostEvent.init({
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    uuid: { type: DataTypes.STRING(36), allowNull: false, unique: true },
    herd_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'goat_herds', key: 'id' } },
    event_date: { type: DataTypes.DATEONLY, allowNull: false },
    category: { type: DataTypes.ENUM('FEED', 'MEDICINE', 'LABOR', 'TRANSPORT', 'SHELTER', 'EQUIPMENT', 'BREEDING', 'OTHER'), allowNull: false },
    amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    description: { type: DataTypes.STRING(255), allowNull: true },
    source: { type: DataTypes.ENUM('FARMER', 'SATHI', 'VYAPAR', 'AUTO'), defaultValue: 'FARMER' },
    vendor_transaction_id: { type: DataTypes.INTEGER, allowNull: true },
    is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
  }, {
    sequelize, modelName: 'GoatCostEvent', tableName: 'goat_cost_events',
    timestamps: true, underscored: true,
    indexes: [{ fields: ['herd_id', 'category'] }],
  });

  return GoatCostEvent;
};
