/**
 * SathiEvidenceItem Model
 * Individual evidence pieces within a bundle: documents, photos, GPS, signatures, biometrics.
 */

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class SathiEvidenceItem extends Model {
    static associate(models) {
      SathiEvidenceItem.belongsTo(models.SathiEvidenceBundle, {
        foreignKey: 'bundle_id',
        as: 'bundle',
      });
      SathiEvidenceItem.belongsTo(models.DocumentV2, {
        foreignKey: 'document_id',
        as: 'document',
      });
      SathiEvidenceItem.belongsTo(models.MediaAsset, {
        foreignKey: 'media_asset_id',
        as: 'mediaAsset',
      });
    }
  }

  SathiEvidenceItem.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      bundle_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'sathi_evidence_bundles', key: 'id' },
      },
      evidence_item_uuid: {
        type: DataTypes.STRING(36),
        allowNull: false,
        unique: true,
      },
      evidence_type: {
        type: DataTypes.ENUM('document', 'photo', 'video', 'gps_location', 'signature', 'biometric'),
        allowNull: false,
      },
      document_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: 'documents_v2', key: 'id' },
      },
      media_asset_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: 'media_assets', key: 'id' },
      },
      gps_latitude: { type: DataTypes.DECIMAL(10, 8), allowNull: true },
      gps_longitude: { type: DataTypes.DECIMAL(11, 8), allowNull: true },
      signature_url: { type: DataTypes.STRING(255), allowNull: true },
      evidence_purpose: {
        type: DataTypes.ENUM(
          'crop_proof', 'input_proof', 'land_proof', 'livestock_proof',
          'harvest_proof', 'pond_proof', 'infrastructure_proof', 'general'
        ),
        allowNull: true,
        defaultValue: 'general',
      },
      is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
    },
    {
      sequelize,
      modelName: 'SathiEvidenceItem',
      tableName: 'sathi_evidence_items',
      timestamps: true,
      underscored: true,
      indexes: [
        { fields: ['bundle_id'] },
        { fields: ['evidence_item_uuid'], unique: true },
      ],
    }
  );

  return SathiEvidenceItem;
};
