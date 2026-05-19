/**
 * PulseMarketAlert Model
 * Market-level alerts: price spikes, crashes, supply shortages, demand surges.
 */

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class PulseMarketAlert extends Model {
    static associate(models) {
      PulseMarketAlert.belongsTo(models.PulseCommodity, { foreignKey: 'commodity_id', targetKey: 'commodity_id', as: 'commodity' });
    }
  }

  PulseMarketAlert.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      alert_uuid: { type: DataTypes.STRING(36), allowNull: false, unique: true },
      commodity_id: { type: DataTypes.STRING(36), allowNull: false },
      mandi_id: { type: DataTypes.INTEGER, allowNull: true },
      alert_type: {
        type: DataTypes.ENUM('price_spike', 'price_crash', 'supply_shortage', 'demand_surge', 'distress_warning', 'best_mandi_opportunity'), allowNull: false,
      },
      alert_triggered_at: { type: DataTypes.DATE, allowNull: true },
      alert_message: { type: DataTypes.TEXT, allowNull: true },
      alert_impact_description: { type: DataTypes.TEXT, allowNull: true },
      is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
    },
    {
      sequelize, modelName: 'PulseMarketAlert', tableName: 'pulse_market_alerts',
      timestamps: true, underscored: true,
      indexes: [{ fields: ['alert_uuid'], unique: true }, { fields: ['commodity_id'] }, { fields: ['alert_type'] }],
    }
  );

  return PulseMarketAlert;
};
