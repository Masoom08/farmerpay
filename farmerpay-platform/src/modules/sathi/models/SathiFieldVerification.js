/**
 * SathiFieldVerification Model
 * Field-level verifications: address, farm boundary, field size, crop variety, ownership.
 */

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class SathiFieldVerification extends Model {
    static associate(models) {
      SathiFieldVerification.belongsTo(models.User, {
        foreignKey: 'farmer_id',
        as: 'farmer',
      });
      SathiFieldVerification.belongsTo(models.FieldAgentProfile, {
        foreignKey: 'agent_id',
        as: 'agent',
      });
      SathiFieldVerification.hasMany(models.SathiFieldVisitChecklist, {
        foreignKey: 'verification_uuid',
        sourceKey: 'verification_uuid',
        as: 'checklist',
      });
    }
  }

  SathiFieldVerification.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      verification_uuid: {
        type: DataTypes.STRING(36),
        allowNull: false,
        unique: true,
      },
      farmer_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' },
      },
      agent_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'field_agent_profiles', key: 'id' },
      },
      verification_type: {
        type: DataTypes.ENUM('address', 'farm_boundary', 'field_size', 'crop_variety', 'ownership_status'),
        allowNull: false,
      },
      verification_date: { type: DataTypes.DATEONLY, allowNull: true },
      verified_latitude: { type: DataTypes.DECIMAL(10, 8), allowNull: true },
      verified_longitude: { type: DataTypes.DECIMAL(11, 8), allowNull: true },
      verification_status: {
        type: DataTypes.ENUM('verified', 'needs_clarification', 'rejected'),
        allowNull: false,
        defaultValue: 'verified',
      },
      verification_comment: { type: DataTypes.TEXT, allowNull: true },
      photo_count: { type: DataTypes.INTEGER, allowNull: true, defaultValue: 0 },
      verification_confidence_pct: { type: DataTypes.DECIMAL(5, 2), allowNull: true },
      contradiction_detected: { type: DataTypes.BOOLEAN, defaultValue: false },
      contradiction_notes: { type: DataTypes.TEXT, allowNull: true },
      is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
    },
    {
      sequelize,
      modelName: 'SathiFieldVerification',
      tableName: 'sathi_field_verifications',
      timestamps: true,
      underscored: true,
      indexes: [
        { fields: ['verification_uuid'], unique: true },
        { fields: ['farmer_id'] },
        { fields: ['agent_id'] },
      ],
    }
  );

  return SathiFieldVerification;
};
