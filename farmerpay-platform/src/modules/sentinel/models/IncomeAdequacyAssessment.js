/**
 * IncomeAdequacyAssessment Model
 * Loan-to-income adequacy analysis: can farmer's projected income repay the loan?
 */

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class IncomeAdequacyAssessment extends Model {
    static associate(models) {
      IncomeAdequacyAssessment.belongsTo(models.LoanApplication, { foreignKey: 'application_id', as: 'application' });
    }
  }

  IncomeAdequacyAssessment.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      assessment_uuid: { type: DataTypes.STRING(36), allowNull: false, unique: true },
      application_id: {
        type: DataTypes.INTEGER, allowNull: false,
        references: { model: 'loan_applications', key: 'id' },
      },
      assessment_date: { type: DataTypes.DATEONLY, allowNull: false },

      // Income summary (from FarmerIncomeStream)
      total_annual_income: { type: DataTypes.DECIMAL(15, 2), allowNull: true },
      crop_income: { type: DataTypes.DECIMAL(15, 2), allowNull: true },
      dairy_income: { type: DataTypes.DECIMAL(15, 2), allowNull: true },
      allied_income: { type: DataTypes.DECIMAL(15, 2), allowNull: true },
      non_farm_income: { type: DataTypes.DECIMAL(15, 2), allowNull: true },
      govt_transfer_income: { type: DataTypes.DECIMAL(15, 2), allowNull: true },
      income_stream_count: { type: DataTypes.INTEGER, allowNull: true },

      // Loan obligation
      total_loan_obligation: { type: DataTypes.DECIMAL(15, 2), allowNull: true },
      emi_or_bullet_amount: { type: DataTypes.DECIMAL(15, 2), allowNull: true },

      // Adequacy ratios
      loan_to_income_ratio: { type: DataTypes.DECIMAL(5, 2), allowNull: true },
      emi_to_income_ratio: { type: DataTypes.DECIMAL(5, 2), allowNull: true },
      income_adequacy_status: {
        type: DataTypes.ENUM('strong', 'adequate', 'marginal', 'inadequate', 'failed'),
        allowNull: true,
      },
      shortfall_amount: { type: DataTypes.DECIMAL(15, 2), allowNull: true },
      shortfall_probability_pct: { type: DataTypes.DECIMAL(5, 2), allowNull: true },

      // Verification
      income_verified_by_sathi: { type: DataTypes.BOOLEAN, defaultValue: false },
      income_verified_by_vyapar: { type: DataTypes.BOOLEAN, defaultValue: false },
      verification_confidence_pct: { type: DataTypes.DECIMAL(5, 2), allowNull: true },

      is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
    },
    {
      sequelize, modelName: 'IncomeAdequacyAssessment', tableName: 'income_adequacy_assessments',
      timestamps: true, underscored: true,
      indexes: [
        { fields: ['assessment_uuid'], unique: true },
        { fields: ['application_id'] },
        { fields: ['income_adequacy_status'] },
      ],
    }
  );

  return IncomeAdequacyAssessment;
};
