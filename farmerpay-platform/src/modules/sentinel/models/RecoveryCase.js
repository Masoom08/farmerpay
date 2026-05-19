/**
 * RecoveryCase Model
 * Recovery case management: stages from early recovery to writeoff.
 */

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class RecoveryCase extends Model {
    static associate(models) {
      RecoveryCase.belongsTo(models.LoanApplication, {
        foreignKey: 'application_id',
        as: 'application',
      });
      RecoveryCase.hasMany(models.RecoveryActionLog, {
        foreignKey: 'recovery_case_id',
        as: 'actionLogs',
      });
    }
  }

  RecoveryCase.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      case_uuid: { type: DataTypes.STRING(36), allowNull: false, unique: true },
      application_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'loan_applications', key: 'id' },
      },
      recovery_case_stage: {
        type: DataTypes.ENUM('early_recovery', 'intensive_recovery', 'legal_recovery', 'writeoff'),
        allowNull: false,
      },
      recovery_case_opened_date: { type: DataTypes.DATEONLY, allowNull: true },
      recovery_case_opened_by: { type: DataTypes.INTEGER, allowNull: true },
      last_recovery_attempt_date: { type: DataTypes.DATEONLY, allowNull: true },
      total_recovery_amount: { type: DataTypes.DECIMAL(15, 2), allowNull: true },
      remaining_recovery_amount: { type: DataTypes.DECIMAL(15, 2), allowNull: true },
      recovery_probability_percent: { type: DataTypes.INTEGER, allowNull: true },
      is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
    },
    {
      sequelize,
      modelName: 'RecoveryCase',
      tableName: 'recovery_cases',
      timestamps: true,
      underscored: true,
      indexes: [
        { fields: ['case_uuid'], unique: true },
        { fields: ['application_id'] },
        { fields: ['recovery_case_stage'] },
      ],
    }
  );

  return RecoveryCase;
};
