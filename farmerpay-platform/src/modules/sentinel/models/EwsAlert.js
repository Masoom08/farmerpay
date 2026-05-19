/**
 * EwsAlert Model
 * Alerts generated from EWS signals, routable to bank officers with action tracking.
 */

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class EwsAlert extends Model {
    static associate(models) {
      EwsAlert.belongsTo(models.EwsSignal, {
        foreignKey: 'signal_id',
        as: 'signal',
      });
    }
  }

  EwsAlert.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      alert_uuid: { type: DataTypes.STRING(36), allowNull: false, unique: true },
      signal_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'ews_signals', key: 'id' },
      },
      alert_priority: {
        type: DataTypes.ENUM('low', 'medium', 'high', 'urgent'),
        allowNull: false,
      },
      alert_recipient_bank_officer: { type: DataTypes.INTEGER, allowNull: true },
      alert_generated_at: { type: DataTypes.DATE, allowNull: true },
      alert_acknowledged_at: { type: DataTypes.DATE, allowNull: true },
      alert_acknowledged_by: { type: DataTypes.INTEGER, allowNull: true },
      action_recommended: { type: DataTypes.TEXT, allowNull: true },
      action_taken: { type: DataTypes.TEXT, allowNull: true },
      action_status: {
        type: DataTypes.ENUM('pending', 'in_progress', 'completed'),
        allowNull: false,
        defaultValue: 'pending',
      },
      is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
    },
    {
      sequelize,
      modelName: 'EwsAlert',
      tableName: 'ews_alerts',
      timestamps: true,
      underscored: true,
      indexes: [
        { fields: ['alert_uuid'], unique: true },
        { fields: ['signal_id'] },
        { fields: ['alert_priority'] },
        { fields: ['action_status'] },
      ],
    }
  );

  return EwsAlert;
};
