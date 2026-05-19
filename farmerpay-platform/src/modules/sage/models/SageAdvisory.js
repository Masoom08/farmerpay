/**
 * SageAdvisory Model
 * AI-driven advisories delivered to farmers via multiple channels.
 */

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class SageAdvisory extends Model {
    static associate(models) {
      SageAdvisory.belongsTo(models.User, { foreignKey: 'farmer_id', as: 'farmer' });
      SageAdvisory.belongsTo(models.SageAdvisoryType, { foreignKey: 'advisory_type_id', as: 'advisoryType' });
      SageAdvisory.hasMany(models.SageFeedback, { foreignKey: 'advisory_id', as: 'feedback' });
    }
  }

  SageAdvisory.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      advisory_uuid: { type: DataTypes.STRING(36), allowNull: false, unique: true },
      farmer_id: {
        type: DataTypes.INTEGER, allowNull: false,
        references: { model: 'users', key: 'id' },
      },
      advisory_type_id: {
        type: DataTypes.INTEGER, allowNull: true,
        references: { model: 'sage_advisory_types', key: 'id' },
      },
      advisory_content: { type: DataTypes.TEXT, allowNull: true },
      advisory_language: { type: DataTypes.STRING(10), allowNull: true },
      advisory_urgency: {
        type: DataTypes.ENUM('low', 'medium', 'high', 'critical'), allowNull: false, defaultValue: 'medium',
      },
      delivery_channel: {
        type: DataTypes.ENUM('sms', 'email', 'push', 'in_app', 'voice_call'), allowNull: true,
      },
      delivered_at: { type: DataTypes.DATE, allowNull: true },
      acknowledged_at: { type: DataTypes.DATE, allowNull: true },
      action_taken_by_farmer: { type: DataTypes.BOOLEAN, defaultValue: false },
      action_outcome: { type: DataTypes.TEXT, allowNull: true },
      advisory_metadata: { type: DataTypes.JSON, allowNull: true },
      source: { type: DataTypes.STRING(32), allowNull: true },
      is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
    },
    {
      sequelize, modelName: 'SageAdvisory', tableName: 'sage_advisories',
      timestamps: true, underscored: true,
      indexes: [
        { fields: ['advisory_uuid'], unique: true },
        { fields: ['farmer_id'] },
        { fields: ['advisory_type_id'] },
        { fields: ['advisory_urgency'] },
      ],
    }
  );

  return SageAdvisory;
};
