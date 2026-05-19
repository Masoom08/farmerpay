/**
 * ScaleOfFinance Model — District-crop-season specific cost norms.
 * Based on DLTC (District Level Technical Committee) norms headed by District Magistrate,
 * updated annually. Includes NABARD standard input cost benchmarks.
 */
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class ScaleOfFinance extends Model {
    static associate(models) {
      ScaleOfFinance.hasMany(models.UnitEconomics, { foreignKey: 'sof_id', as: 'unitEconomics' });
      ScaleOfFinance.belongsTo(models.LgdDistrict, { foreignKey: 'district_id', as: 'district' });
      ScaleOfFinance.belongsTo(models.LgdState, { foreignKey: 'state_id', as: 'state' });
    }
  }
  ScaleOfFinance.init({
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    sof_code: { type: DataTypes.STRING(50), allowNull: false, unique: true },
    sof_name: { type: DataTypes.STRING(100), allowNull: false },
    // Land size thresholds (original fields — kept for backward compatibility)
    min_land_size_hectares: { type: DataTypes.DECIMAL(10, 4), allowNull: true },
    max_land_size_hectares: { type: DataTypes.DECIMAL(10, 4), allowNull: true },
    avg_investment_amount: { type: DataTypes.DECIMAL(15, 2), allowNull: true },
    recommended_loan_amount: { type: DataTypes.DECIMAL(15, 2), allowNull: true },
    // DLTC district-crop-season specificity
    district_id: { type: DataTypes.INTEGER, allowNull: true, references: { model: 'lgd_districts', key: 'id' } },
    state_id: { type: DataTypes.INTEGER, allowNull: true, references: { model: 'lgd_states', key: 'id' } },
    crop_id: { type: DataTypes.INTEGER, allowNull: true, comment: 'Crop-specific cost norms' },
    season: { type: DataTypes.ENUM('kharif', 'rabi', 'summer', 'perennial'), allowNull: true },
    financial_year: { type: DataTypes.STRING(10), allowNull: true, comment: 'e.g. 2025-26' },
    // Itemised cost norms per hectare (DLTC approved)
    cost_per_hectare_seed: { type: DataTypes.DECIMAL(15, 2), allowNull: true, comment: 'Seed cost norm per hectare' },
    cost_per_hectare_fertiliser: { type: DataTypes.DECIMAL(15, 2), allowNull: true, comment: 'Fertiliser cost norm per hectare' },
    cost_per_hectare_pesticide: { type: DataTypes.DECIMAL(15, 2), allowNull: true, comment: 'Pesticide cost norm per hectare' },
    cost_per_hectare_labour: { type: DataTypes.DECIMAL(15, 2), allowNull: true, comment: 'Labour cost norm per hectare' },
    cost_per_hectare_machinery: { type: DataTypes.DECIMAL(15, 2), allowNull: true, comment: 'Machinery/irrigation cost norm per hectare' },
    cost_per_hectare_other: { type: DataTypes.DECIMAL(15, 2), allowNull: true, comment: 'Insurance, transport, misc per hectare' },
    total_cost_per_hectare: { type: DataTypes.DECIMAL(15, 2), allowNull: true, comment: 'Total SoF norm per hectare (sum of above)' },
    // NABARD national benchmarks for comparison
    nabard_benchmark_total: { type: DataTypes.DECIMAL(15, 2), allowNull: true, comment: 'NABARD national total cost benchmark per hectare' },
    nabard_benchmark_input_cost: { type: DataTypes.DECIMAL(15, 2), allowNull: true, comment: 'NABARD input-only (seed+fert+pest) benchmark per hectare' },
    // Approval metadata
    approved_by: { type: DataTypes.STRING(200), allowNull: true, comment: 'e.g. DLTC, District Magistrate, Mysuru' },
    approved_date: { type: DataTypes.DATEONLY, allowNull: true },
    source: { type: DataTypes.ENUM('dltc', 'nabard', 'state_govt', 'custom'), allowNull: true, defaultValue: 'dltc' },
    is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
  }, {
    sequelize, modelName: 'ScaleOfFinance', tableName: 'scale_of_finances',
    timestamps: true, underscored: true,
    indexes: [
      { fields: ['sof_code'], unique: true },
      { fields: ['district_id', 'crop_id', 'season', 'financial_year'], name: 'idx_sof_district_crop_season' }
    ]
  });
  return ScaleOfFinance;
};
