/**
 * SathiNudge — scheduled or dispatched nudges (SMS / push / whatsapp / IVR)
 * for repayment reminders, policy renewals, KYC refreshes. The
 * linked_action_taken_at field is the key piece — it turns each nudge into
 * a measurable attributed conversion.
 */

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class SathiNudge extends Model {
    static associate(models) {
      SathiNudge.belongsTo(models.Intermediary, {
        foreignKey: 'intermediary_id',
        as: 'intermediary',
      });
      SathiNudge.belongsTo(models.User, {
        foreignKey: 'farmer_id',
        as: 'farmer',
      });
    }
  }

  SathiNudge.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      intermediary_id: { type: DataTypes.INTEGER, allowNull: false },
      farmer_id: { type: DataTypes.INTEGER, allowNull: false },
      nudge_type: {
        type: DataTypes.ENUM(
          'repayment_due',
          'policy_renewal',
          'kyc_refresh',
          'subsidy_claim',
          'document_upload',
          'custom'
        ),
        allowNull: false,
      },
      channel: {
        type: DataTypes.ENUM('sms', 'push', 'whatsapp', 'ivr', 'in_app'),
        allowNull: false,
      },
      payload_json: { type: DataTypes.JSON, allowNull: true },
      scheduled_for: { type: DataTypes.DATE, allowNull: true },
      sent_at: { type: DataTypes.DATE, allowNull: true },
      delivered_at: { type: DataTypes.DATE, allowNull: true },
      acknowledged_at: { type: DataTypes.DATE, allowNull: true },
      linked_action_taken_at: { type: DataTypes.DATE, allowNull: true },
      linked_action_ref_id: { type: DataTypes.INTEGER, allowNull: true },
      status: {
        type: DataTypes.ENUM('scheduled', 'sent', 'delivered', 'failed', 'acknowledged'),
        allowNull: false,
        defaultValue: 'scheduled',
      },
    },
    {
      sequelize,
      modelName: 'SathiNudge',
      tableName: 'sathi_nudges',
      timestamps: true,
      underscored: true,
      indexes: [
        { fields: ['intermediary_id', 'status'] },
        { fields: ['farmer_id', 'nudge_type'] },
        { fields: ['scheduled_for'] },
        { fields: ['linked_action_taken_at'] },
      ],
    }
  );

  return SathiNudge;
};
