/**
 * GhostDetectionFlag Model
 * Flags farmers with suspicious patterns indicating ghost/fake beneficiaries.
 */

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class GhostDetectionFlag extends Model {
    static associate(models) {
      GhostDetectionFlag.belongsTo(models.User, { foreignKey: 'farmer_id', as: 'farmer' });
      GhostDetectionFlag.belongsTo(models.User, { foreignKey: 'resolved_by', as: 'resolver' });
    }
  }

  GhostDetectionFlag.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      flag_uuid: { type: DataTypes.STRING(36), allowNull: false, unique: true },
      farmer_id: {
        type: DataTypes.INTEGER, allowNull: false,
        references: { model: 'users', key: 'id' },
      },
      flag_type: {
        type: DataTypes.ENUM(
          'no_gps_activity', 'no_transactions', 'no_field_visits',
          'no_crop_cycle', 'no_login_180d', 'suspicious_onboarding', 'device_farm'
        ),
        allowNull: false,
      },
      flag_severity: {
        type: DataTypes.ENUM('low', 'medium', 'high', 'critical'),
        allowNull: false,
      },
      evidence: {
        type: DataTypes.JSON, allowNull: true,
        comment: 'Supporting data for the flag',
      },
      auto_detected: { type: DataTypes.BOOLEAN, defaultValue: true },
      status: {
        type: DataTypes.ENUM('open', 'investigating', 'cleared', 'confirmed_ghost', 'suspended'),
        defaultValue: 'open',
      },
      resolved_by: {
        type: DataTypes.INTEGER, allowNull: true,
        references: { model: 'users', key: 'id' },
      },
      resolved_at: { type: DataTypes.DATE, allowNull: true },
      resolution_notes: { type: DataTypes.TEXT, allowNull: true },
      is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
    },
    {
      sequelize, modelName: 'GhostDetectionFlag', tableName: 'ghost_detection_flags',
      timestamps: true, underscored: true,
      indexes: [
        { fields: ['farmer_id'], name: 'idx_ghost_farmer' },
        { fields: ['flag_type', 'status'], name: 'idx_ghost_type_status' },
        { fields: ['flag_severity'], name: 'idx_ghost_severity' },
      ],
    }
  );

  return GhostDetectionFlag;
};
