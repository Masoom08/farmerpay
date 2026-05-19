/**
 * PulseCommodity Model
 * Master commodity list: grains, cash crops, vegetables, fruits, spices.
 */

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class PulseCommodity extends Model {
    static associate(models) {
      PulseCommodity.hasMany(models.PulseCommodityTranslation, { foreignKey: 'commodity_id', sourceKey: 'commodity_id', as: 'translations' });
      PulseCommodity.hasMany(models.PulsePriceRecord, { foreignKey: 'commodity_id', sourceKey: 'commodity_id', as: 'priceRecords' });
      PulseCommodity.hasMany(models.PulsePriceForecast, { foreignKey: 'commodity_id', sourceKey: 'commodity_id', as: 'forecasts' });
      PulseCommodity.hasMany(models.PulseMsp, { foreignKey: 'commodity_id', sourceKey: 'commodity_id', as: 'msps' });
      PulseCommodity.hasMany(models.PulseMarketAlert, { foreignKey: 'commodity_id', sourceKey: 'commodity_id', as: 'marketAlerts' });
      PulseCommodity.hasMany(models.PulseFarmerPriceAlert, { foreignKey: 'commodity_id', sourceKey: 'commodity_id', as: 'farmerAlerts' });
      PulseCommodity.hasMany(models.PulseSellRecommendation, { foreignKey: 'commodity_id', sourceKey: 'commodity_id', as: 'sellRecommendations' });
    }
  }

  PulseCommodity.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      commodity_id: { type: DataTypes.STRING(36), allowNull: false, unique: true },
      commodity_code: { type: DataTypes.STRING(20), allowNull: false, unique: true },
      commodity_name: { type: DataTypes.STRING(100), allowNull: false },
      commodity_type: {
        type: DataTypes.ENUM('food_grain', 'cash_crop', 'vegetable', 'fruit', 'spice', 'pulse', 'oilseed', 'cereal'), allowNull: true,
      },
      unit_of_measurement: { type: DataTypes.STRING(20), defaultValue: 'quintal' },
      // PULSE Blueprint enrichment fields
      perishability_index: { type: DataTypes.INTEGER, allowNull: true, comment: '1=grain 10=leafy veg',
        validate: { min: 1, max: 10 } },
      storage_factor: { type: DataTypes.DECIMAL(5, 4), allowNull: true, comment: 'daily loss rate as decimal e.g. 0.002 = 0.2%/day' },
      msp_applicable: { type: DataTypes.BOOLEAN, defaultValue: false },
      volatility_class: { type: DataTypes.ENUM('ultra_high', 'high', 'moderate', 'low'), allowNull: true, comment: 'per ICAR-NIAP classification' },
      shelf_life_days: { type: DataTypes.INTEGER, allowNull: true, comment: 'days before quality degrades significantly' },
      cold_chain_dependency: { type: DataTypes.ENUM('none', 'recommended', 'mandatory'), allowNull: true },
      is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
    },
    {
      sequelize, modelName: 'PulseCommodity', tableName: 'pulse_commodities',
      timestamps: true, underscored: true,
      indexes: [{ fields: ['commodity_id'], unique: true }, { fields: ['commodity_code'], unique: true }],
    }
  );

  return PulseCommodity;
};
