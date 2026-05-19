/**
 * SmaClassificationLog Model
 * SMA (Special Mention Account) classification history per RBI guidelines.
 */

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class SmaClassificationLog extends Model {
    static associate(models) {
      SmaClassificationLog.belongsTo(models.LoanApplication, {
        foreignKey: 'application_id',
        as: 'application',
      });
    }
  }

  SmaClassificationLog.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      log_uuid: { type: DataTypes.STRING(36), allowNull: false, unique: true },
      application_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'loan_applications', key: 'id' },
      },
      sma_classification: {
        type: DataTypes.ENUM('standard', 'sma_0_30', 'sma_30_60', 'sma_60_90', 'sma_90_plus'),
        allowNull: false,
      },
      classification_date: { type: DataTypes.DATEONLY, allowNull: false },
      classification_reason: { type: DataTypes.TEXT, allowNull: true },
      previous_classification: { type: DataTypes.STRING(50), allowNull: true },
      classification_trigger: {
        type: DataTypes.ENUM(
          'overdue_payment', 'request_for_restructuring', 'movement_in_funds',
          'covenant_default', 'monitoring_trigger', 'red_flag'
        ),
        allowNull: true,
      },
      classified_by_bank_officer: { type: DataTypes.INTEGER, allowNull: true },
      is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
    },
    {
      sequelize,
      modelName: 'SmaClassificationLog',
      tableName: 'sma_classification_logs',
      timestamps: true,
      // Classifications are regulatory records — append-only. An operator
      // who wants to correct a row must write a new row superseding it,
      // not silently edit the prior one. `is_active` is the only allowed
      // post-creation mutation.
      updatedAt: false,
      underscored: true,
      indexes: [
        { fields: ['log_uuid'], unique: true },
        { fields: ['application_id'] },
        { fields: ['sma_classification'] },
      ],
      validate: {
        // Every classification must be attributable: a bank officer for
        // manual changes, or a system trigger for automated recalculation.
        // Rows with neither are untraceable and are rejected at save time.
        hasAuditTrail() {
          const isAutomated = ['monitoring_trigger', 'red_flag'].includes(this.classification_trigger);
          if (!this.classified_by_bank_officer && !isAutomated) {
            throw new Error(
              'SmaClassificationLog must set classified_by_bank_officer OR use a system classification_trigger'
            );
          }
        },
      },
    }
  );

  return SmaClassificationLog;
};
