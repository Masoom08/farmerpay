/**
 * SathiTask Model
 * Represents tasks assigned to field agents for verification, collection, and support activities.
 */

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class SathiTask extends Model {
    static associate(models) {
      SathiTask.belongsTo(models.FieldAgentProfile, {
        foreignKey: 'assigned_to_agent_id',
        as: 'agent',
      });
      SathiTask.hasMany(models.SathiTaskExecution, {
        foreignKey: 'task_id',
        as: 'executions',
      });
      SathiTask.hasMany(models.SathiAuditLog, {
        foreignKey: 'task_id',
        as: 'auditLogs',
      });
    }
  }

  SathiTask.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      task_uuid: {
        type: DataTypes.STRING(36),
        allowNull: false,
        unique: true,
      },
      assigned_to_agent_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'field_agent_profiles', key: 'id' },
      },
      assigned_by_admin_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      task_type: {
        type: DataTypes.ENUM(
          'farmer_kyc_verification',
          'field_visit',
          'loan_application_verification',
          'transaction_verification',
          'document_collection',
          'farmer_feedback',
          'soil_sample_collection',
          'roots_field_verification'
        ),
        allowNull: false,
      },
      task_entity_type: { type: DataTypes.STRING(50), allowNull: true },
      task_entity_id: { type: DataTypes.INTEGER, allowNull: true },
      task_title: { type: DataTypes.STRING(200), allowNull: false },
      task_description: { type: DataTypes.TEXT, allowNull: true },
      task_priority: {
        type: DataTypes.ENUM('low', 'medium', 'high', 'urgent'),
        allowNull: false,
        defaultValue: 'medium',
      },
      task_status: {
        type: DataTypes.ENUM('assigned', 'in_progress', 'completed', 'rejected', 'on_hold'),
        allowNull: false,
        defaultValue: 'assigned',
      },
      assigned_at: { type: DataTypes.DATE, allowNull: true },
      due_date: { type: DataTypes.DATEONLY, allowNull: true },
      completed_at: { type: DataTypes.DATE, allowNull: true },
      is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
    },
    {
      sequelize,
      modelName: 'SathiTask',
      tableName: 'sathi_tasks',
      timestamps: true,
      underscored: true,
      indexes: [
        { fields: ['assigned_to_agent_id', 'task_status'] },
        { fields: ['task_uuid'], unique: true },
        { fields: ['task_type'] },
        { fields: ['due_date'] },
      ],
    }
  );

  return SathiTask;
};
