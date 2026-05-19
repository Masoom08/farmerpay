/**
 * RedFlagEvent Model
 * Red flag events: unusual withdrawals, vendor defaults, missed payments, etc.
 */

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class RedFlagEvent extends Model {
    static associate(models) {
      RedFlagEvent.belongsTo(models.LoanApplication, {
        foreignKey: 'application_id',
        as: 'application',
      });
    }
  }

  RedFlagEvent.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      event_uuid: { type: DataTypes.STRING(36), allowNull: false, unique: true },
      application_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'loan_applications', key: 'id' },
      },
      flag_type: {
        type: DataTypes.ENUM(
          'unusual_withdrawal', 'vendor_default', 'missed_payment',
          'location_change', 'contact_lost', 'legal_notice', 'insurance_claim',
          'zero_agri_activity'
        ),
        allowNull: false,
      },
      flag_severity: {
        type: DataTypes.ENUM('low', 'medium', 'high', 'critical'),
        allowNull: false,
      },
      event_description: { type: DataTypes.TEXT, allowNull: true },
      event_date: { type: DataTypes.DATEONLY, allowNull: true },
      event_timestamp: { type: DataTypes.DATE, allowNull: true },
      flagged_by: { type: DataTypes.INTEGER, allowNull: true },
      action_taken: { type: DataTypes.TEXT, allowNull: true },
      action_taken_date: { type: DataTypes.DATEONLY, allowNull: true },
      is_resolved: { type: DataTypes.BOOLEAN, defaultValue: false },
      is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
    },
    {
      sequelize,
      modelName: 'RedFlagEvent',
      tableName: 'red_flag_events',
      timestamps: true,
      underscored: true,
      indexes: [
        { fields: ['event_uuid'], unique: true },
        { fields: ['application_id'] },
        { fields: ['flag_type'] },
        { fields: ['flag_severity'] },
        { fields: ['is_resolved'] },
      ],
    }
  );

  return RedFlagEvent;
};
