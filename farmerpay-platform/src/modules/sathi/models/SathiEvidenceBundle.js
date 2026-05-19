/**
 * SathiEvidenceBundle Model
 * Groups evidence items collected during task execution for review and approval.
 */

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class SathiEvidenceBundle extends Model {
    static associate(models) {
      SathiEvidenceBundle.belongsTo(models.SathiTaskExecution, {
        foreignKey: 'task_execution_id',
        as: 'taskExecution',
      });
      SathiEvidenceBundle.hasMany(models.SathiEvidenceItem, {
        foreignKey: 'bundle_id',
        as: 'items',
      });
    }
  }

  SathiEvidenceBundle.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      bundle_uuid: {
        type: DataTypes.STRING(36),
        allowNull: false,
        unique: true,
      },
      task_execution_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'sathi_task_executions', key: 'id' },
      },
      bundle_type: {
        type: DataTypes.ENUM(
          'aadhaar_verification',
          'address_verification',
          'farm_field_verification',
          'transaction_evidence',
          'soil_sample',
          'weather_observation'
        ),
        allowNull: false,
      },
      bundle_submission_date: { type: DataTypes.DATEONLY, allowNull: true },
      bundle_verification_status: {
        type: DataTypes.ENUM('submitted', 'under_review', 'approved', 'rejected', 'needs_resubmission'),
        allowNull: false,
        defaultValue: 'submitted',
      },
      verified_by_admin_id: { type: DataTypes.INTEGER, allowNull: true },
      verification_notes: { type: DataTypes.TEXT, allowNull: true },
      verified_at: { type: DataTypes.DATE, allowNull: true },
      is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
    },
    {
      sequelize,
      modelName: 'SathiEvidenceBundle',
      tableName: 'sathi_evidence_bundles',
      timestamps: true,
      underscored: true,
      indexes: [
        { fields: ['bundle_uuid'], unique: true },
        { fields: ['task_execution_id'] },
        { fields: ['bundle_verification_status'] },
      ],
    }
  );

  return SathiEvidenceBundle;
};
