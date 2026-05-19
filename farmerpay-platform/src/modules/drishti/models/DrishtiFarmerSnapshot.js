/**
 * DrishtiFarmerSnapshot Model
 * Frozen-in-time snapshot of the farmer's complete profile at the moment a
 * scenario is run. This is the "digital twin" — a structured copy of everything
 * DRISHTI knows about this farmer, including full household economics.
 */
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class DrishtiFarmerSnapshot extends Model {
    static associate(models) {
      DrishtiFarmerSnapshot.belongsTo(models.User, { foreignKey: 'farmer_id', as: 'farmer' });
      DrishtiFarmerSnapshot.hasMany(models.DrishtiScenarioRun, { foreignKey: 'snapshot_id', as: 'scenarioRuns' });
    }
  }

  DrishtiFarmerSnapshot.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      snapshot_uuid: { type: DataTypes.STRING(36), allowNull: false, unique: true },
      farmer_id: {
        type: DataTypes.INTEGER, allowNull: false,
        references: { model: 'users', key: 'id' },
      },
      snapshot_date: { type: DataTypes.DATEONLY, allowNull: false },

      // FARMER module data
      total_farm_size_hectares: { type: DataTypes.DECIMAL(10, 4), allowNull: true },
      land_ownership_type: { type: DataTypes.STRING(20), allowNull: true },
      years_farming_experience: { type: DataTypes.INTEGER, allowNull: true },
      education_level: { type: DataTypes.STRING(30), allowNull: true },
      family_size: { type: DataTypes.INTEGER, allowNull: true },
      district_id: { type: DataTypes.INTEGER, allowNull: true },
      block_id: { type: DataTypes.INTEGER, allowNull: true },

      // ROOTS: Current activities summary
      active_crop_cycles: { type: DataTypes.JSON, allowNull: true },
      active_dairy_profile: { type: DataTypes.JSON, allowNull: true },
      active_fishery_profile: { type: DataTypes.JSON, allowNull: true },
      horticulture_profile: { type: DataTypes.JSON, allowNull: true },

      // ROOTS: Historical performance (last 3 seasons)
      historical_crop_profitability: { type: DataTypes.JSON, allowNull: true },
      historical_dairy_profitability: { type: DataTypes.JSON, allowNull: true },
      historical_fishery_profitability: { type: DataTypes.JSON, allowNull: true },

      // DICE: Loan exposure
      active_loans: { type: DataTypes.JSON, allowNull: true },
      total_outstanding: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
      total_monthly_emi: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },

      // TRUST: Credit profile
      trust_score: { type: DataTypes.INTEGER, allowNull: true },
      trust_band: { type: DataTypes.STRING(20), allowNull: true },

      // SENTINEL: Risk profile
      income_adequacy_status: { type: DataTypes.STRING(20), allowNull: true },
      loan_to_income_ratio: { type: DataTypes.DECIMAL(5, 2), allowNull: true },
      risk_severity_band: { type: DataTypes.STRING(20), allowNull: true },

      // PULSE: Relevant market data
      relevant_commodity_prices: { type: DataTypes.JSON, allowNull: true },

      // SAGE: Current weather outlook
      weather_outlook: { type: DataTypes.JSON, allowNull: true },

      // INSURANCE: Coverage status
      active_insurance: { type: DataTypes.JSON, allowNull: true },

      // HOUSEHOLD INCOME: Complete non-farm income picture
      household_income_details: { type: DataTypes.JSON, allowNull: true },
      spouse_shg_monthly: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
      wage_labor_monthly: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
      mgnrega_annual: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
      pension_monthly: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
      remittance_monthly: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
      petty_business_monthly: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
      govt_transfers_annual: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
      rental_income_monthly: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
      other_income_monthly: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
      total_non_farm_monthly: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
      non_farm_income_streams: { type: DataTypes.INTEGER, defaultValue: 0 },

      // HOUSEHOLD EXPENSES: Full expense picture
      household_expense_details: { type: DataTypes.JSON, allowNull: true },
      food_groceries_monthly: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
      education_monthly: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
      healthcare_monthly: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
      housing_monthly: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
      social_obligations_annual: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
      transportation_monthly: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
      utilities_monthly: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
      non_farm_loan_emi_monthly: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
      total_household_expense_monthly: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },

      // HOUSEHOLD CONTEXT
      family_members_count: { type: DataTypes.INTEGER, defaultValue: 1 },
      earning_members_count: { type: DataTypes.INTEGER, defaultValue: 1 },
      dependents_count: { type: DataTypes.INTEGER, defaultValue: 0 },
      spouse_occupation: { type: DataTypes.STRING(50), allowNull: true },
      primary_non_farm_occupation: { type: DataTypes.STRING(50), allowNull: true },

      // AA Financial Intelligence (V2)
      aa_data_available: { type: DataTypes.BOOLEAN, defaultValue: false },
      income_verification_source: {
        type: DataTypes.ENUM('self_reported', 'account_aggregator', 'mixed'),
        defaultValue: 'self_reported',
      },
      aa_seasonality: { type: DataTypes.JSON, allowNull: true },
      aa_emi_capacity: { type: DataTypes.JSON, allowNull: true },

      is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
    },
    {
      sequelize,
      modelName: 'DrishtiFarmerSnapshot',
      tableName: 'drishti_farmer_snapshots',
      timestamps: true,
      underscored: true,
      indexes: [
        { fields: ['snapshot_uuid'], unique: true },
        { fields: ['farmer_id'] },
        { fields: ['snapshot_date'] },
        { fields: ['farmer_id', 'snapshot_date'] },
      ],
    }
  );

  return DrishtiFarmerSnapshot;
};
