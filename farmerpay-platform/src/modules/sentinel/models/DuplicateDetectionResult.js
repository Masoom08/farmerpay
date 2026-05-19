/**
 * DuplicateDetectionResult Model
 * Tracks potential duplicate farmer pairs with match scores and resolution status.
 */

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class DuplicateDetectionResult extends Model {
    static associate(models) {
      DuplicateDetectionResult.belongsTo(models.User, { foreignKey: 'farmer_id_a', as: 'farmerA' });
      DuplicateDetectionResult.belongsTo(models.User, { foreignKey: 'farmer_id_b', as: 'farmerB' });
      DuplicateDetectionResult.belongsTo(models.User, { foreignKey: 'reviewed_by', as: 'reviewer' });
    }

    /**
     * Default JSON serialization strips `match_details` because it contains
     * sensitive cross-farmer linkage data (aadhaar_hash, phone, name). Any
     * endpoint that needs the full payload must use `toFullJSON()` and gate
     * the call on ADMIN role. This ensures a future route that blindly
     * spreads the row in a response can't leak PII by default.
     */
    toJSON() {
      const values = { ...this.get() };
      delete values.match_details;
      return values;
    }

    toFullJSON() {
      return { ...this.get() };
    }
  }

  DuplicateDetectionResult.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      detection_uuid: { type: DataTypes.STRING(36), allowNull: false, unique: true },
      farmer_id_a: {
        type: DataTypes.INTEGER, allowNull: false,
        references: { model: 'users', key: 'id' },
      },
      farmer_id_b: {
        type: DataTypes.INTEGER, allowNull: false,
        references: { model: 'users', key: 'id' },
      },
      match_type: {
        type: DataTypes.ENUM(
          'aadhaar_hash', 'phone_number', 'name_phonetic', 'address_cluster',
          'device_fingerprint', 'bank_account', 'composite'
        ),
        allowNull: false,
      },
      match_score: {
        type: DataTypes.DECIMAL(5, 2), allowNull: false,
        comment: '0-100 confidence of match',
      },
      match_details: {
        type: DataTypes.JSON, allowNull: true,
        comment: 'Which fields matched and individual scores',
      },
      status: {
        type: DataTypes.ENUM('pending_review', 'confirmed_duplicate', 'false_positive', 'merged', 'escalated'),
        defaultValue: 'pending_review',
      },
      reviewed_by: {
        type: DataTypes.INTEGER, allowNull: true,
        references: { model: 'users', key: 'id' },
      },
      reviewed_at: { type: DataTypes.DATE, allowNull: true },
      resolution_notes: { type: DataTypes.TEXT, allowNull: true },
      detected_at: { type: DataTypes.DATE, allowNull: false },
      is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
    },
    {
      sequelize, modelName: 'DuplicateDetectionResult', tableName: 'duplicate_detection_results',
      timestamps: true, underscored: true,
      indexes: [
        { unique: true, fields: ['farmer_id_a', 'farmer_id_b', 'match_type'], name: 'idx_dup_pair_type' },
        { fields: ['status'], name: 'idx_dup_status' },
        { fields: ['farmer_id_a'], name: 'idx_dup_farmer_a' },
        { fields: ['farmer_id_b'], name: 'idx_dup_farmer_b' },
        { fields: ['match_score'], name: 'idx_dup_score' },
      ],
    }
  );

  return DuplicateDetectionResult;
};
