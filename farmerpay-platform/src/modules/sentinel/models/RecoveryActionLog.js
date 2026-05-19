/**
 * RecoveryActionLog Model
 * Logs recovery actions: phone calls, field visits, legal notices, asset seizure.
 */

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class RecoveryActionLog extends Model {
    static associate(models) {
      RecoveryActionLog.belongsTo(models.RecoveryCase, {
        foreignKey: 'recovery_case_id',
        as: 'recoveryCase',
      });
    }
  }

  RecoveryActionLog.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      log_uuid: { type: DataTypes.STRING(36), allowNull: false, unique: true },
      recovery_case_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'recovery_cases', key: 'id' },
      },
      recovery_action_type: {
        type: DataTypes.ENUM(
          'phone_call', 'field_visit', 'settlement_offer',
          'legal_notice', 'auction_notice', 'asset_seizure'
        ),
        allowNull: false,
      },
      recovery_action_date: { type: DataTypes.DATEONLY, allowNull: true },
      recovery_action_by: { type: DataTypes.INTEGER, allowNull: true },
      recovery_action_notes: { type: DataTypes.TEXT, allowNull: true },
      recovery_amount_pursued: { type: DataTypes.DECIMAL(15, 2), allowNull: true },
      recovery_amount_received: { type: DataTypes.DECIMAL(15, 2), allowNull: true },
      is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
    },
    {
      sequelize,
      modelName: 'RecoveryActionLog',
      tableName: 'recovery_action_logs',
      timestamps: true,
      // Append-only: once logged, a recovery action (legal notice, asset
      // seizure, settlement offer) must not be silently edited. Corrections
      // must be captured as a new log row referencing the same case.
      updatedAt: false,
      underscored: true,
      indexes: [
        { fields: ['log_uuid'], unique: true },
        { fields: ['recovery_case_id'] },
        { fields: ['recovery_action_type'] },
      ],
    }
  );

  return RecoveryActionLog;
};
