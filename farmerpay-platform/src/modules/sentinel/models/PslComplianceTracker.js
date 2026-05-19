/**
 * PslComplianceTracker Model
 * Priority Sector Lending compliance: classification, reclassification, target tracking.
 */

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class PslComplianceTracker extends Model {
    static associate(models) {
      PslComplianceTracker.belongsTo(models.LoanApplication, { foreignKey: 'application_id', as: 'application' });
    }
  }

  PslComplianceTracker.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      tracker_uuid: { type: DataTypes.STRING(36), allowNull: false, unique: true },
      application_id: {
        type: DataTypes.INTEGER, allowNull: false,
        references: { model: 'loan_applications', key: 'id' },
      },

      // PSL classification
      psl_eligible: { type: DataTypes.BOOLEAN, defaultValue: true },
      psl_category: {
        type: DataTypes.ENUM('agriculture', 'small_marginal_farmer', 'allied_activities', 'non_agriculture', 'consumption'),
        allowNull: true,
      },
      original_classification: { type: DataTypes.STRING(50), allowNull: true },
      current_classification: { type: DataTypes.STRING(50), allowNull: true },
      reclassified: { type: DataTypes.BOOLEAN, defaultValue: false },
      reclassification_date: { type: DataTypes.DATEONLY, allowNull: true },
      reclassification_reason: { type: DataTypes.TEXT, allowNull: true },

      // End-use evidence for PSL
      end_use_verified: { type: DataTypes.BOOLEAN, defaultValue: false },
      end_use_score: { type: DataTypes.INTEGER, allowNull: true },
      agri_spend_percentage: { type: DataTypes.DECIMAL(5, 2), allowNull: true },
      diversion_risk_level: {
        type: DataTypes.ENUM('low', 'medium', 'high', 'critical'), allowNull: true,
      },

      // Audit readiness
      documentation_complete: { type: DataTypes.BOOLEAN, defaultValue: false },
      last_audit_date: { type: DataTypes.DATEONLY, allowNull: true },
      audit_finding: { type: DataTypes.TEXT, allowNull: true },

      is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
    },
    {
      sequelize, modelName: 'PslComplianceTracker', tableName: 'psl_compliance_trackers',
      timestamps: true, underscored: true,
      indexes: [
        { fields: ['tracker_uuid'], unique: true },
        { fields: ['application_id'] },
        { fields: ['psl_category'] },
        { fields: ['reclassified'] },
      ],
    }
  );

  return PslComplianceTracker;
};
