/**
 * SathiTaskExecution Model
 * Tracks execution details of a task including GPS location and timing.
 */

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class SathiTaskExecution extends Model {
    static associate(models) {
      SathiTaskExecution.belongsTo(models.SathiTask, {
        foreignKey: 'task_id',
        as: 'task',
      });
      SathiTaskExecution.hasMany(models.SathiEvidenceBundle, {
        foreignKey: 'task_execution_id',
        as: 'evidenceBundles',
      });
      SathiTaskExecution.hasMany(models.SathiAuditLog, {
        foreignKey: 'execution_id',
        as: 'auditLogs',
      });
    }
  }

  SathiTaskExecution.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      execution_uuid: {
        type: DataTypes.STRING(36),
        allowNull: false,
        unique: true,
      },
      task_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'sathi_tasks', key: 'id' },
      },
      start_timestamp: { type: DataTypes.DATE, allowNull: true },
      end_timestamp: { type: DataTypes.DATE, allowNull: true },
      execution_location_latitude: { type: DataTypes.DECIMAL(10, 8), allowNull: true },
      execution_location_longitude: { type: DataTypes.DECIMAL(11, 8), allowNull: true },
      execution_location_accuracy_meters: { type: DataTypes.INTEGER, allowNull: true },
      execution_notes: { type: DataTypes.TEXT, allowNull: true },
      execution_status: {
        type: DataTypes.ENUM('in_progress', 'completed', 'failed'),
        allowNull: false,
        defaultValue: 'in_progress',
      },
      failure_reason: { type: DataTypes.TEXT, allowNull: true },
      completion_photo_count: { type: DataTypes.INTEGER, allowNull: true, defaultValue: 0 },
      is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
    },
    {
      sequelize,
      modelName: 'SathiTaskExecution',
      tableName: 'sathi_task_executions',
      timestamps: true,
      underscored: true,
      indexes: [
        { fields: ['task_id'] },
        { fields: ['execution_uuid'], unique: true },
      ],
    }
  );

  return SathiTaskExecution;
};
