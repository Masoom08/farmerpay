/**
 * SathiFarmerConsent Model
 * GDPR-like consent tracking for farmer data sharing, location, photo/video, and biometrics.
 */

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class SathiFarmerConsent extends Model {
    static associate(models) {
      SathiFarmerConsent.belongsTo(models.User, {
        foreignKey: 'farmer_id',
        as: 'farmer',
      });
    }
  }

  SathiFarmerConsent.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      consent_uuid: {
        type: DataTypes.STRING(36),
        allowNull: false,
        unique: true,
      },
      farmer_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' },
      },
      consent_type: {
        type: DataTypes.ENUM('data_sharing', 'location_tracking', 'photo_video', 'biometric_capture'),
        allowNull: false,
      },
      consent_given_at: { type: DataTypes.DATE, allowNull: true },
      consent_given_by_farmer: { type: DataTypes.INTEGER, allowNull: true },
      consent_verified_by_agent: { type: DataTypes.INTEGER, allowNull: true },
      consent_verified_at: { type: DataTypes.DATE, allowNull: true },
      consent_revoked_at: { type: DataTypes.DATE, allowNull: true },
      consent_revoke_reason: { type: DataTypes.TEXT, allowNull: true },
      is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
    },
    {
      sequelize,
      modelName: 'SathiFarmerConsent',
      tableName: 'sathi_farmer_consents',
      timestamps: true,
      underscored: true,
      indexes: [
        { fields: ['consent_uuid'], unique: true },
        { fields: ['farmer_id', 'consent_type'] },
      ],
    }
  );

  return SathiFarmerConsent;
};
