/**
 * DrishtiHouseholdIncomeSource Model
 * Persistent storage of household income data collected by Sathi during
 * field visits. Feeds into snapshots and serves as standalone household
 * financial profile.
 */
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class DrishtiHouseholdIncomeSource extends Model {
    static associate(models) {
      DrishtiHouseholdIncomeSource.belongsTo(models.User, { foreignKey: 'farmer_id', as: 'farmer' });
    }
  }

  DrishtiHouseholdIncomeSource.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      source_uuid: { type: DataTypes.STRING(36), allowNull: false, unique: true },
      farmer_id: {
        type: DataTypes.INTEGER, allowNull: false,
        references: { model: 'users', key: 'id' },
      },

      // Income source details
      source_type: {
        type: DataTypes.ENUM('spouse_shg', 'wage_labor', 'mgnrega', 'pension',
          'remittance', 'petty_business', 'govt_transfer', 'rental', 'other'),
        allowNull: false,
      },
      source_label: { type: DataTypes.STRING(150), allowNull: true },
      earning_member: {
        type: DataTypes.ENUM('farmer', 'spouse', 'son', 'daughter',
          'parent', 'family', 'other'),
        allowNull: false,
      },
      earning_member_name: { type: DataTypes.STRING(100), allowNull: true },

      // Amount and frequency
      amount: { type: DataTypes.DECIMAL(15, 2), allowNull: false },
      frequency: {
        type: DataTypes.ENUM('daily', 'weekly', 'monthly', 'quarterly',
          'seasonal', 'annual', 'irregular'),
        allowNull: false,
      },
      amount_monthly_equivalent: { type: DataTypes.DECIMAL(15, 2), allowNull: true },
      active_months: { type: DataTypes.JSON, allowNull: true },
      reliability: {
        type: DataTypes.ENUM('guaranteed', 'regular', 'irregular', 'one_time'),
        defaultValue: 'regular',
      },

      // SHG-specific fields (populated when source_type = 'spouse_shg')
      shg_name: { type: DataTypes.STRING(100), allowNull: true },
      shg_monthly_saving: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
      shg_loan_outstanding: { type: DataTypes.DECIMAL(15, 2), allowNull: true },
      shg_member_since: { type: DataTypes.DATEONLY, allowNull: true },

      // Verification
      verified_by_sathi: { type: DataTypes.BOOLEAN, defaultValue: false },
      verified_at: { type: DataTypes.DATEONLY, allowNull: true },
      verification_evidence: { type: DataTypes.STRING(200), allowNull: true },
      confidence_level: {
        type: DataTypes.ENUM('declared', 'sathi_verified', 'document_verified'),
        defaultValue: 'declared',
      },

      is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
    },
    {
      sequelize,
      modelName: 'DrishtiHouseholdIncomeSource',
      tableName: 'drishti_household_income_sources',
      timestamps: true,
      underscored: true,
      indexes: [
        { fields: ['source_uuid'], unique: true },
        { fields: ['farmer_id'] },
        { fields: ['source_type'] },
        { fields: ['earning_member'] },
      ],
    }
  );

  return DrishtiHouseholdIncomeSource;
};
