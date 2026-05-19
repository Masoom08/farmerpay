/**
 * AaFinancialAnalysis Model
 * Persisted financial analysis results: health scores, income/expense summaries, risk flags.
 */

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class AaFinancialAnalysis extends Model {
    static associate(models) {
      AaFinancialAnalysis.belongsTo(models.User, { foreignKey: 'farmer_id', as: 'farmer' });
      AaFinancialAnalysis.belongsTo(models.AaConsent, { foreignKey: 'consent_id', as: 'consent' });
    }
  }

  AaFinancialAnalysis.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      analysis_uuid: { type: DataTypes.STRING(36), allowNull: false, unique: true },
      farmer_id: {
        type: DataTypes.INTEGER, allowNull: false,
        references: { model: 'users', key: 'id' },
      },
      consent_id: {
        type: DataTypes.INTEGER, allowNull: false,
        references: { model: 'aa_consents', key: 'id' },
      },
      analysis_type: {
        type: DataTypes.ENUM('full', 'health_score_only', 'summary_only'), allowNull: false,
      },
      health_score: { type: DataTypes.DECIMAL(5, 2), allowNull: true },
      health_grade: { type: DataTypes.CHAR(1), allowNull: true },
      score_components: { type: DataTypes.JSON, allowNull: true },
      income_summary: { type: DataTypes.JSON, allowNull: true },
      expense_summary: { type: DataTypes.JSON, allowNull: true },
      seasonality_data: { type: DataTypes.JSON, allowNull: true },
      risk_flags: { type: DataTypes.JSON, allowNull: true },
      bridge_data: { type: DataTypes.JSON, allowNull: true },
      analysis_mode: {
        type: DataTypes.ENUM('raw_transactions', 'summary_fallback'), allowNull: true,
      },
      transaction_count: { type: DataTypes.INTEGER, allowNull: true },
      period_from: { type: DataTypes.DATEONLY, allowNull: true },
      period_to: { type: DataTypes.DATEONLY, allowNull: true },
      is_latest: { type: DataTypes.BOOLEAN, defaultValue: true },
      is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
    },
    {
      sequelize, modelName: 'AaFinancialAnalysis', tableName: 'aa_financial_analyses',
      timestamps: true, underscored: true,
      indexes: [
        { fields: ['analysis_uuid'], unique: true },
        { fields: ['farmer_id'] },
        { fields: ['consent_id'] },
        { fields: ['farmer_id', 'is_latest'], name: 'idx_aa_analysis_farmer_latest' },
      ],
    }
  );

  return AaFinancialAnalysis;
};
