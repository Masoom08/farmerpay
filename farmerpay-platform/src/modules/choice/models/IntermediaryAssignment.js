/**
 * IntermediaryAssignment Model — CHOICE Module
 * Tracks farmer ↔ intermediary relationship with selection, change request, and escalation lifecycle.
 */

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class IntermediaryAssignment extends Model {
    static associate(models) {
      IntermediaryAssignment.belongsTo(models.Intermediary, {
        foreignKey: 'intermediary_id',
        as: 'intermediary',
      });
      IntermediaryAssignment.belongsTo(models.User, {
        foreignKey: 'farmer_id',
        as: 'farmer',
      });
    }
  }

  IntermediaryAssignment.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      assignment_uuid: { type: DataTypes.STRING(36), allowNull: false, unique: true },
      intermediary_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'intermediaries', key: 'id' },
      },
      farmer_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' },
      },
      assigned_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      assignment_status: {
        type: DataTypes.ENUM('active', 'pending_change', 'completed', 'reassigned', 'escalated', 'terminated'),
        allowNull: false,
        defaultValue: 'active',
      },
      // Farmer self-selection
      selected_by_farmer: { type: DataTypes.BOOLEAN, defaultValue: false },
      // Change request flow
      change_requested_at: { type: DataTypes.DATE, allowNull: true },
      change_reason: { type: DataTypes.TEXT, allowNull: true },
      // Escalation flow
      escalation_reason: { type: DataTypes.TEXT, allowNull: true },
      // Farmer feedback
      farmer_rating: { type: DataTypes.INTEGER, allowNull: true }, // 1-5
      farmer_feedback: { type: DataTypes.TEXT, allowNull: true },
      is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
    },
    {
      sequelize,
      modelName: 'IntermediaryAssignment',
      tableName: 'intermediary_assignments',
      timestamps: true,
      underscored: true,
      indexes: [
        { fields: ['assignment_uuid'], unique: true },
        { fields: ['farmer_id'] },
        { fields: ['intermediary_id'] },
        { fields: ['assignment_status'] },
      ],
    }
  );

  return IntermediaryAssignment;
};
