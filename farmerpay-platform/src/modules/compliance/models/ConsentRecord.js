/**
 * ConsentRecord Model
 * Tracks farmer consent for various platform activities (KYC, lending, data processing, etc.).
 */

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class ConsentRecord extends Model {
    static associate(models) {
      ConsentRecord.belongsTo(models.User, {
        foreignKey: 'farmer_id',
        as: 'farmer',
      });
    }
  }

  ConsentRecord.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      consent_uuid: { type: DataTypes.STRING(36), allowNull: false, unique: true },
      farmer_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' },
      },
      consent_type: {
        type: DataTypes.ENUM('kyc', 'lending', 'data_processing', 'marketing', 'insurance'),
        allowNull: false,
      },
      consent_version: { type: DataTypes.STRING(20), allowNull: false },
      accepted: { type: DataTypes.BOOLEAN, allowNull: false },
      accepted_at: { type: DataTypes.DATE, allowNull: false },
      withdrawn_at: { type: DataTypes.DATE, allowNull: true },
      ip_address: { type: DataTypes.STRING(45), allowNull: true },
      user_agent: { type: DataTypes.TEXT, allowNull: true },
      application_id: {
        type: DataTypes.INTEGER, allowNull: true,
        references: { model: 'loan_applications', key: 'id' },
      },
      consent_text: { type: DataTypes.TEXT, allowNull: true },
      consent_channel: { type: DataTypes.STRING(30), allowNull: true },
      consent_expiry_at: { type: DataTypes.DATE, allowNull: true },
      is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
    },
    {
      sequelize,
      modelName: 'ConsentRecord',
      tableName: 'consent_records',
      timestamps: true,
      // Append-only audit trail. Consents are legal artefacts: once recorded
      // they must not be mutated. `withdrawn_at` is the only post-creation
      // change and it's handled by creating a new revoke row in practice —
      // see compliance runbook. If a legitimate update is ever needed,
      // remove this flag behind a migration and a code review.
      updatedAt: false,
      underscored: true,
      indexes: [
        { fields: ['consent_uuid'], unique: true },
        { fields: ['farmer_id', 'consent_type'] },
      ],
    }
  );

  return ConsentRecord;
};
