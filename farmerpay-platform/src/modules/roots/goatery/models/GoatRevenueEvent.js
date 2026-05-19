/**
 * GoatRevenueEvent Model — Revenue tracking from sales and other income.
 */
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class GoatRevenueEvent extends Model {
    static associate(models) {
      GoatRevenueEvent.belongsTo(models.GoatHerd, { foreignKey: 'herd_id', as: 'herd' });
      GoatRevenueEvent.belongsTo(models.GoatAnimal, { foreignKey: 'animal_id', as: 'animal' });
    }
  }

  GoatRevenueEvent.init({
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    uuid: { type: DataTypes.STRING(36), allowNull: false, unique: true },
    herd_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'goat_herds', key: 'id' } },
    animal_id: { type: DataTypes.INTEGER, allowNull: true, references: { model: 'goat_animals', key: 'id' } },
    event_date: { type: DataTypes.DATEONLY, allowNull: false },
    category: { type: DataTypes.ENUM('LIVE_SALE', 'MEAT_SALE', 'MANURE_SALE', 'MILK_SALE', 'OTHER'), allowNull: false },
    quantity: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
    unit: { type: DataTypes.STRING(20), allowNull: true },
    rate_per_unit: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
    total_amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    buyer_name: { type: DataTypes.STRING(200), allowNull: true },
    sale_weight_kg: { type: DataTypes.DECIMAL(6, 2), allowNull: true },
    is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
  }, {
    sequelize, modelName: 'GoatRevenueEvent', tableName: 'goat_revenue_events',
    timestamps: true, underscored: true,
    indexes: [{ fields: ['herd_id', 'category'] }],
  });

  return GoatRevenueEvent;
};
