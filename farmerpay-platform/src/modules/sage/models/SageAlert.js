/**
 * SageAlert Model
 * Alerts to farmers: weather, pest/disease, input availability, market price, loan due.
 */

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class SageAlert extends Model {
    static associate(models) {
      SageAlert.belongsTo(models.User, { foreignKey: 'farmer_id', as: 'farmer' });
    }
  }

  SageAlert.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      alert_uuid: { type: DataTypes.STRING(36), allowNull: false, unique: true },
      farmer_id: {
        type: DataTypes.INTEGER, allowNull: false,
        references: { model: 'users', key: 'id' },
      },
      alert_type: {
        type: DataTypes.ENUM('weather', 'pest_disease', 'input_availability', 'market_price', 'loan_due', 'harvest_timing', 'storage_opportunity'),
        allowNull: false,
      },
      alert_message: { type: DataTypes.TEXT, allowNull: true },
      alert_urgency: {
        type: DataTypes.ENUM('low', 'medium', 'high', 'critical'), allowNull: false, defaultValue: 'medium',
      },
      alert_triggered_at: { type: DataTypes.DATE, allowNull: true },
      alert_acknowledged_at: { type: DataTypes.DATE, allowNull: true },
      action_recommended: { type: DataTypes.TEXT, allowNull: true },
      is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
    },
    {
      sequelize, modelName: 'SageAlert', tableName: 'sage_alerts',
      timestamps: true, underscored: true,
      indexes: [
        { fields: ['alert_uuid'], unique: true },
        { fields: ['farmer_id'] },
        { fields: ['alert_type'] },
        { fields: ['alert_urgency'] },
      ],
    }
  );

  return SageAlert;
};
