/**
 * Intermediary Model — CHOICE Module
 * Community Resource Persons (CRPs): Bank Sakhi, FPO Secretary, BC, Input Seller, Adathiya,
 * FPO Agent, Agri Entrepreneur, Bank Mitra.
 * Mapped to LGD village/block/district/state for location-based discovery.
 */

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Intermediary extends Model {
    static associate(models) {
      Intermediary.hasMany(models.IntermediaryAssignment, {
        foreignKey: 'intermediary_id',
        as: 'assignments',
      });
      Intermediary.hasMany(models.FieldVisitLog, {
        foreignKey: 'intermediary_id',
        as: 'visits',
      });
    }
  }

  Intermediary.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      intermediary_uuid: { type: DataTypes.STRING(36), allowNull: false, unique: true },
      name: { type: DataTypes.STRING(100), allowNull: false },
      mobile: { type: DataTypes.STRING(13), allowNull: false, unique: true },
      type: {
        type: DataTypes.ENUM(
          // legacy
          'bc', 'fpo_agent', 'agri_entrepreneur', 'bank_mitra',
          'bank_sakhi', 'fpo_secretary', 'input_seller', 'adathiya',
          // new Sathi sub-types
          'business_correspondent', 'insurance_sakhi', 'pacs_secretary'
        ),
        allowNull: false,
      },
      // User account the Sathi logs in with (nullable for legacy rows).
      user_id: { type: DataTypes.INTEGER, allowNull: true },
      // JSON array, e.g. ["loan","insurance","data_entry","nudges"]
      services_offered: { type: DataTypes.JSON, allowNull: true },
      onboarding_kyc_status: {
        type: DataTypes.ENUM('pending', 'in_progress', 'verified', 'rejected'),
        allowNull: false,
        defaultValue: 'pending',
      },
      commission_bank_account_id: { type: DataTypes.INTEGER, allowNull: true },
      // LGD hierarchy mapping
      village_id: { type: DataTypes.INTEGER, allowNull: true },
      block_id: { type: DataTypes.INTEGER, allowNull: true },
      district_id: { type: DataTypes.INTEGER, allowNull: true },
      state_id: { type: DataTypes.INTEGER, allowNull: true },
      // Profile card fields
      profile_photo_url: { type: DataTypes.STRING(255), allowNull: true },
      bio: { type: DataTypes.TEXT, allowNull: true },
      years_of_experience: { type: DataTypes.INTEGER, allowNull: true },
      languages_spoken: { type: DataTypes.JSON, allowNull: true },
      skills: { type: DataTypes.JSON, allowNull: true },
      // Service availability
      service_radius_km: { type: DataTypes.INTEGER, defaultValue: 10 },
      is_available: { type: DataTypes.BOOLEAN, defaultValue: true },
      // Reputation
      rating: { type: DataTypes.DECIMAL(3, 2), defaultValue: 0.00 },
      total_farmers_served: { type: DataTypes.INTEGER, defaultValue: 0 },
      commission_rate_percent: { type: DataTypes.DECIMAL(5, 2), allowNull: true },
      is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
    },
    {
      sequelize,
      modelName: 'Intermediary',
      tableName: 'intermediaries',
      timestamps: true,
      underscored: true,
      indexes: [
        { fields: ['intermediary_uuid'], unique: true },
        { fields: ['mobile'], unique: true },
        { fields: ['type'] },
        { fields: ['village_id'] },
        { fields: ['district_id'] },
      ],
    }
  );

  return Intermediary;
};
