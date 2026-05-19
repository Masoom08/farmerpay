/**
 * DiversionRiskAssessment Model
 * Fund diversion risk assessment with indicators and recommended actions.
 */

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class DiversionRiskAssessment extends Model {
    static associate(models) {
      DiversionRiskAssessment.belongsTo(models.LoanApplication, {
        foreignKey: 'application_id',
        as: 'application',
      });
    }
  }

  DiversionRiskAssessment.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      assessment_uuid: { type: DataTypes.STRING(36), allowNull: false, unique: true },
      application_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'loan_applications', key: 'id' },
      },
      diversion_risk_level: {
        type: DataTypes.ENUM('low', 'medium', 'high', 'critical'),
        allowNull: false,
      },
      diversion_indicators: { type: DataTypes.JSON, allowNull: true },
      risk_score: { type: DataTypes.INTEGER, allowNull: true },
      recommended_action: { type: DataTypes.STRING(200), allowNull: true },
      assessment_date: { type: DataTypes.DATEONLY, allowNull: true },
      assessed_by_bank_officer: { type: DataTypes.INTEGER, allowNull: true },
      is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
    },
    {
      sequelize,
      modelName: 'DiversionRiskAssessment',
      tableName: 'diversion_risk_assessments',
      timestamps: true,
      underscored: true,
      indexes: [
        { fields: ['assessment_uuid'], unique: true },
        { fields: ['application_id'] },
        { fields: ['diversion_risk_level'] },
      ],
    }
  );

  return DiversionRiskAssessment;
};
