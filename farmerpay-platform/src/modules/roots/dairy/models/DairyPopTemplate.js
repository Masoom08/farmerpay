/**
 * DairyPopTemplate Model — Breed-specific dairy PoP benchmarks by lactation stage.
 */
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class DairyPopTemplate extends Model {
    static associate() {}
  }

  DairyPopTemplate.init({
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    uuid: { type: DataTypes.STRING(36), allowNull: false, unique: true },
    breed: { type: DataTypes.STRING(100), allowNull: false },
    species: { type: DataTypes.ENUM('CATTLE', 'BUFFALO'), allowNull: false, defaultValue: 'CATTLE' },
    lactation_stage: { type: DataTypes.ENUM('EARLY', 'MID', 'LATE', 'DRY'), allowNull: false },
    expected_daily_yield_liters: { type: DataTypes.DECIMAL(5, 2), allowNull: true },
    expected_feed_kg_per_day: { type: DataTypes.DECIMAL(5, 2), allowNull: true },
    expected_feed_cost_per_day: { type: DataTypes.DECIMAL(8, 2), allowNull: true },
    expected_lactation_length_days: { type: DataTypes.INTEGER, allowNull: true },
    expected_calving_interval_days: { type: DataTypes.INTEGER, allowNull: true },
    vaccination_schedule: { type: DataTypes.JSON, allowNull: true },
    deworming_schedule: { type: DataTypes.JSON, allowNull: true },
    expected_calf_mortality_pct: { type: DataTypes.DECIMAL(5, 2), allowNull: true },
    notes: { type: DataTypes.TEXT, allowNull: true },
    is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
  }, {
    sequelize, modelName: 'DairyPopTemplate', tableName: 'dairy_pop_templates',
    timestamps: true, underscored: true,
    indexes: [
      { fields: ['breed', 'lactation_stage'] },
      { fields: ['species'] },
    ],
  });

  return DairyPopTemplate;
};
