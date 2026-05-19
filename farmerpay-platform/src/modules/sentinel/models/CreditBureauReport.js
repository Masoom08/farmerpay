/**
 * CreditBureauReport Model
 * Credit bureau integration: CIBIL, Experian, Equifax, CRIF HighMark scores and exposure.
 */

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class CreditBureauReport extends Model {
    static associate(models) {
      CreditBureauReport.belongsTo(models.User, { foreignKey: 'farmer_id', as: 'farmer' });
    }
  }

  CreditBureauReport.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      report_uuid: { type: DataTypes.STRING(36), allowNull: false, unique: true },
      farmer_id: {
        type: DataTypes.INTEGER, allowNull: false,
        references: { model: 'users', key: 'id' },
      },
      bureau_name: {
        type: DataTypes.ENUM('cibil', 'experian', 'equifax', 'crif_highmark'), allowNull: false,
      },
      report_date: { type: DataTypes.DATE, allowNull: false },

      // Score
      credit_score: { type: DataTypes.INTEGER, allowNull: true },
      score_band: { type: DataTypes.STRING(20), allowNull: true },

      // Loan exposure
      active_loans_count: { type: DataTypes.INTEGER, allowNull: true },
      total_outstanding: { type: DataTypes.DECIMAL(15, 2), allowNull: true },
      overdue_amount: { type: DataTypes.DECIMAL(15, 2), allowNull: true },
      max_dpd_last_12m: { type: DataTypes.INTEGER, allowNull: true },
      enquiry_count_last_6m: { type: DataTypes.INTEGER, allowNull: true },

      // Raw report (encrypted)
      raw_report_encrypted: { type: DataTypes.TEXT, allowNull: true },

      // Consent
      consent_id: { type: DataTypes.STRING(36), allowNull: true },
      consent_timestamp: { type: DataTypes.DATE, allowNull: true },

      is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
    },
    {
      sequelize, modelName: 'CreditBureauReport', tableName: 'credit_bureau_reports',
      timestamps: true, underscored: true,
      indexes: [
        { fields: ['report_uuid'], unique: true },
        { fields: ['farmer_id'] },
        { fields: ['bureau_name'] },
        { fields: ['report_date'] },
      ],
    }
  );

  return CreditBureauReport;
};
