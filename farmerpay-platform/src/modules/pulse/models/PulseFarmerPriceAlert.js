/**
 * PulseFarmerPriceAlert Model
 * Farmer-specific price alerts: notify when target price is reached/exceeded/below.
 */

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class PulseFarmerPriceAlert extends Model {
    static associate(models) {
      PulseFarmerPriceAlert.belongsTo(models.User, { foreignKey: 'farmer_id', as: 'farmer' });
      PulseFarmerPriceAlert.belongsTo(models.PulseCommodity, { foreignKey: 'commodity_id', targetKey: 'commodity_id', as: 'commodity' });
    }
  }

  PulseFarmerPriceAlert.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      alert_uuid: { type: DataTypes.STRING(36), allowNull: false, unique: true },
      farmer_id: {
        type: DataTypes.INTEGER, allowNull: false,
        references: { model: 'users', key: 'id' },
      },
      commodity_id: { type: DataTypes.STRING(36), allowNull: false },
      target_price: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
      alert_type: {
        type: DataTypes.ENUM('price_reached', 'price_exceeded', 'price_below'), allowNull: false,
      },
      alert_triggered_at: { type: DataTypes.DATE, allowNull: true },
      alert_acknowledged_at: { type: DataTypes.DATE, allowNull: true },
      is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
    },
    {
      sequelize, modelName: 'PulseFarmerPriceAlert', tableName: 'pulse_farmer_price_alerts',
      timestamps: true, underscored: true,
      indexes: [{ fields: ['alert_uuid'], unique: true }, { fields: ['farmer_id'] }, { fields: ['commodity_id'] }],
    }
  );

  return PulseFarmerPriceAlert;
};
