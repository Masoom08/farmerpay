/**
 * SathiIssueFlag — issues raised by a Sathi that need banker / ops
 * intervention (loan delinquency, fraud, disputes, etc.). Surfaces in
 * the banker loan inbox and the Sathi dashboard.
 */

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class SathiIssueFlag extends Model {
    static associate(models) {
      SathiIssueFlag.belongsTo(models.Intermediary, {
        foreignKey: 'intermediary_id',
        as: 'intermediary',
      });
      SathiIssueFlag.belongsTo(models.User, {
        foreignKey: 'farmer_id',
        as: 'farmer',
      });
    }
  }

  SathiIssueFlag.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      intermediary_id: { type: DataTypes.INTEGER, allowNull: false },
      farmer_id: { type: DataTypes.INTEGER, allowNull: false },
      loan_application_id: { type: DataTypes.INTEGER, allowNull: true },
      issue_type: {
        type: DataTypes.ENUM(
          'loan_delinquent',
          'crop_failure',
          'fraud_suspicion',
          'document_dispute',
          'farmer_unreachable',
          'grievance',
          'other'
        ),
        allowNull: false,
      },
      severity: {
        type: DataTypes.ENUM('low', 'medium', 'high', 'critical'),
        allowNull: false,
        defaultValue: 'medium',
      },
      description: { type: DataTypes.TEXT, allowNull: false },
      status: {
        type: DataTypes.ENUM('open', 'acknowledged', 'in_progress', 'resolved', 'dismissed'),
        allowNull: false,
        defaultValue: 'open',
      },
      assigned_banker_id: { type: DataTypes.INTEGER, allowNull: true },
      resolution_notes: { type: DataTypes.TEXT, allowNull: true },
      opened_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      acknowledged_at: { type: DataTypes.DATE, allowNull: true },
      resolved_at: { type: DataTypes.DATE, allowNull: true },
    },
    {
      sequelize,
      modelName: 'SathiIssueFlag',
      tableName: 'sathi_issue_flags',
      timestamps: true,
      underscored: true,
      indexes: [
        { fields: ['intermediary_id', 'status'] },
        { fields: ['farmer_id'] },
        { fields: ['assigned_banker_id', 'status'] },
        { fields: ['severity', 'status'] },
      ],
    }
  );

  return SathiIssueFlag;
};
