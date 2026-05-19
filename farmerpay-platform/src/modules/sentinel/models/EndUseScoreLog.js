/**
 * EndUseScoreLog Model
 * Tracks intended vs actual end-use of loan funds for diversion detection.
 */

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class EndUseScoreLog extends Model {
    static associate(models) {
      EndUseScoreLog.belongsTo(models.LoanApplication, {
        foreignKey: 'application_id',
        as: 'application',
      });
    }
  }

  EndUseScoreLog.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      log_uuid: { type: DataTypes.STRING(36), allowNull: false, unique: true },
      application_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'loan_applications', key: 'id' },
      },
      end_use_category: { type: DataTypes.STRING(100), allowNull: true },
      intended_use_description: { type: DataTypes.TEXT, allowNull: true },
      actual_end_use_description: { type: DataTypes.TEXT, allowNull: true },
      use_match_percentage: { type: DataTypes.INTEGER, allowNull: true },
      diversion_detected: { type: DataTypes.BOOLEAN, defaultValue: false },
      diversion_amount: { type: DataTypes.DECIMAL(15, 2), allowNull: true },
      diversion_reason: { type: DataTypes.TEXT, allowNull: true },
      scoring_date: { type: DataTypes.DATEONLY, allowNull: true },
      is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
    },
    {
      sequelize,
      modelName: 'EndUseScoreLog',
      tableName: 'end_use_score_logs',
      timestamps: true,
      underscored: true,
      indexes: [
        { fields: ['log_uuid'], unique: true },
        { fields: ['application_id'] },
      ],
    }
  );

  return EndUseScoreLog;
};
