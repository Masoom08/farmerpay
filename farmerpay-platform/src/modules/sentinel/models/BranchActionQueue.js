/**
 * BranchActionQueue Model
 * Branch-level action queue for verification, settlement, recovery, and legal actions.
 */

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class BranchActionQueue extends Model {
    static associate(models) {
      BranchActionQueue.belongsTo(models.LoanApplication, {
        foreignKey: 'application_id',
        as: 'application',
      });
    }
  }

  BranchActionQueue.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      queue_uuid: { type: DataTypes.STRING(36), allowNull: false, unique: true },
      application_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'loan_applications', key: 'id' },
      },
      action_type: {
        type: DataTypes.ENUM(
          'verification_needed', 'settlement_discussion', 'recovery_initiation',
          'account_restructuring', 'account_closure', 'legal_action'
        ),
        allowNull: false,
      },
      action_priority: {
        type: DataTypes.ENUM('low', 'medium', 'high', 'urgent'),
        allowNull: false,
      },
      action_assigned_to: { type: DataTypes.INTEGER, allowNull: true },
      action_assigned_date: { type: DataTypes.DATE, allowNull: true },
      action_due_date: { type: DataTypes.DATEONLY, allowNull: true },
      action_completed_date: { type: DataTypes.DATEONLY, allowNull: true },
      action_status: {
        type: DataTypes.ENUM('pending', 'in_progress', 'completed', 'overdue'),
        allowNull: false,
        defaultValue: 'pending',
      },
      action_notes: { type: DataTypes.TEXT, allowNull: true },
      is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
    },
    {
      sequelize,
      modelName: 'BranchActionQueue',
      tableName: 'branch_action_queues',
      timestamps: true,
      underscored: true,
      indexes: [
        { fields: ['queue_uuid'], unique: true },
        { fields: ['application_id'] },
        { fields: ['action_status'] },
        { fields: ['action_priority'] },
      ],
    }
  );

  return BranchActionQueue;
};
