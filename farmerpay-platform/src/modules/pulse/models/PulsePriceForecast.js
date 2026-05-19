/**
 * PulsePriceForecast Model
 * ML-based commodity price predictions with confidence scores.
 */

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class PulsePriceForecast extends Model {
    static associate(models) {
      PulsePriceForecast.belongsTo(models.PulseCommodity, { foreignKey: 'commodity_id', targetKey: 'commodity_id', as: 'commodity' });
    }
  }

  PulsePriceForecast.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      forecast_uuid: { type: DataTypes.STRING(36), allowNull: false, unique: true },
      mandi_id: { type: DataTypes.INTEGER, allowNull: true, comment: 'specific mandi if available, NULL for commodity-level' },
      commodity_id: { type: DataTypes.STRING(36), allowNull: false },
      forecast_date: { type: DataTypes.DATEONLY, allowNull: false },
      horizon_days: { type: DataTypes.INTEGER, allowNull: false, comment: '7, 15, or 30' },
      forecast_price_min: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
      forecast_price_max: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
      predicted_price: { type: DataTypes.DECIMAL(10, 2), allowNull: true, comment: 'ensemble point estimate' },
      forecast_confidence: { type: DataTypes.DECIMAL(5, 2), allowNull: true, comment: 'confidence percentage 0-100' },
      forecast_factors: { type: DataTypes.JSON, allowNull: true, comment: 'SHAP-based top contributing factors' },
      // PULSE Blueprint fields
      model_version: { type: DataTypes.STRING(50), allowNull: true },
      risk_score: { type: DataTypes.INTEGER, allowNull: true, comment: 'price risk 1=safe 100=extreme volatility',
        validate: { min: 1, max: 100 } },
      directional_confidence: { type: DataTypes.DECIMAL(5, 2), allowNull: true, comment: 'probability direction is correct' },
      is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
    },
    {
      sequelize, modelName: 'PulsePriceForecast', tableName: 'pulse_price_forecasts',
      timestamps: true, underscored: true,
      indexes: [
        { fields: ['forecast_uuid'], unique: true },
        { fields: ['commodity_id', 'mandi_id', 'forecast_date', 'horizon_days'], name: 'idx_forecast_lookup' },
      ],
    }
  );

  return PulsePriceForecast;
};
