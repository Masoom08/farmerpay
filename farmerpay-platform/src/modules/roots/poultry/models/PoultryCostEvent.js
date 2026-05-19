/**
 * PoultryCostEvent Model — Cost ledger for poultry operations.
 */
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class PoultryCostEvent extends Model {
    static associate(models) {
      PoultryCostEvent.belongsTo(models.PoultryFlock, { foreignKey: 'flock_id', as: 'flock' });
    }
  }

  PoultryCostEvent.init({
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    uuid: { type: DataTypes.STRING(36), allowNull: false, unique: true },
    flock_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'poultry_flocks', key: 'id' } },
    event_date: { type: DataTypes.DATEONLY, allowNull: false },
    category: { type: DataTypes.ENUM('FEED', 'MEDICINE', 'LABOR', 'ENERGY', 'CHICK_PURCHASE', 'EQUIPMENT', 'LITTER', 'TRANSPORT', 'OTHER'), allowNull: false },
    description: { type: DataTypes.STRING(255), allowNull: true },
    amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    quantity: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
    unit: { type: DataTypes.STRING(20), allowNull: true },
    is_recurring: { type: DataTypes.BOOLEAN, defaultValue: false },
    recurring_frequency: { type: DataTypes.ENUM('DAILY', 'WEEKLY', 'MONTHLY'), allowNull: true },
    source: { type: DataTypes.ENUM('FARMER', 'SATHI', 'VYAPAR', 'AUTO'), defaultValue: 'FARMER' },
    vendor_transaction_id: { type: DataTypes.INTEGER, allowNull: true },
    is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
  }, {
    sequelize, modelName: 'PoultryCostEvent', tableName: 'poultry_cost_events',
    timestamps: true, underscored: true,
    indexes: [{ fields: ['flock_id', 'category'] }],
  });

  return PoultryCostEvent;
};
