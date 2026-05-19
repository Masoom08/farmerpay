/**
 * SathiAuditLog Model
 * Audit trail for all SATHI task and execution actions: who did what, when.
 */

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class SathiAuditLog extends Model {
    static associate(models) {
      SathiAuditLog.belongsTo(models.SathiTask, {
        foreignKey: 'task_id',
        as: 'task',
      });
      SathiAuditLog.belongsTo(models.SathiTaskExecution, {
        foreignKey: 'execution_id',
        as: 'execution',
      });
    }
  }

  SathiAuditLog.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      audit_id: {
        type: DataTypes.STRING(36),
        allowNull: false,
        unique: true,
      },
      task_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: 'sathi_tasks', key: 'id' },
      },
      execution_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: 'sathi_task_executions', key: 'id' },
      },
      action_type: { type: DataTypes.STRING(50), allowNull: false },
      action_by: { type: DataTypes.INTEGER, allowNull: true },
      action_at: { type: DataTypes.DATE, allowNull: true },
      action_details: { type: DataTypes.JSON, allowNull: true },
      is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
    },
    {
      sequelize,
      modelName: 'SathiAuditLog',
      tableName: 'sathi_audit_logs',
      timestamps: true,
      underscored: true,
      indexes: [
        { fields: ['audit_id'], unique: true },
        { fields: ['task_id'] },
        { fields: ['execution_id'] },
        { fields: ['action_type'] },
      ],
    }
  );

  return SathiAuditLog;
};
