/**
 * PoultryRevenueEvent Model — Revenue ledger for poultry sales.
 */
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class PoultryRevenueEvent extends Model {
    static associate(models) {
      PoultryRevenueEvent.belongsTo(models.PoultryFlock, { foreignKey: 'flock_id', as: 'flock' });
    }
  }

  PoultryRevenueEvent.init({
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    uuid: { type: DataTypes.STRING(36), allowNull: false, unique: true },
    flock_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'poultry_flocks', key: 'id' } },
    event_date: { type: DataTypes.DATEONLY, allowNull: false },
    category: { type: DataTypes.ENUM('EGG_SALE', 'BIRD_SALE', 'MANURE_SALE', 'OTHER'), allowNull: false },
    quantity: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    unit: { type: DataTypes.STRING(20), allowNull: true },
    rate_per_unit: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
    total_amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    buyer_name: { type: DataTypes.STRING(200), allowNull: true },
    buyer_type: { type: DataTypes.ENUM('TRADER', 'RETAIL', 'HOTEL', 'MARKET', 'OTHER'), allowNull: true },
    is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
  }, {
    sequelize, modelName: 'PoultryRevenueEvent', tableName: 'poultry_revenue_events',
    timestamps: true, underscored: true,
    indexes: [{ fields: ['flock_id', 'category'] }],
  });

  return PoultryRevenueEvent;
};
