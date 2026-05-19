/**
 * FarmerFisheryProfile Model
 * Per-farmer fishery operation profile. Stores operation_type (INLAND/SEA/BOTH)
 * which gates the mobile screens the farmer sees, plus tier (drives entry_mode)
 * and cooperative linkage.
 */

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class FarmerFisheryProfile extends Model {
    static associate(models) {
      FarmerFisheryProfile.belongsTo(models.User, { foreignKey: 'farmer_id', as: 'farmer' });
    }
  }

  FarmerFisheryProfile.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      profile_uuid: { type: DataTypes.STRING(36), allowNull: false, unique: true },
      farmer_id: { type: DataTypes.INTEGER, allowNull: false, unique: true },
      operation_type: {
        type: DataTypes.ENUM('INLAND', 'SEA', 'BOTH'),
        allowNull: false,
        defaultValue: 'INLAND',
      },
      tier: {
        type: DataTypes.ENUM('SMALL', 'MEDIUM', 'LARGE'),
        allowNull: false,
        defaultValue: 'SMALL',
      },
      entry_mode: {
        type: DataTypes.ENUM('TRANSACTIONAL', 'WEEKLY_BULK', 'MONTHLY_BULK'),
        allowNull: false,
        defaultValue: 'TRANSACTIONAL',
      },
      cooperative_name: { type: DataTypes.STRING(120), allowNull: true },
      cooperative_member_id: { type: DataTypes.STRING(50), allowNull: true },
      primary_market: { type: DataTypes.STRING(120), allowNull: true },
      default_payment_mode: {
        type: DataTypes.ENUM('CASH', 'UPI', 'BANK', 'CREDIT', 'NONE'),
        allowNull: false,
        defaultValue: 'CASH',
      },
      currency: { type: DataTypes.STRING(8), allowNull: false, defaultValue: 'INR' },
      onboarded_at: { type: DataTypes.DATE, allowNull: true },
      last_active_at: { type: DataTypes.DATE, allowNull: true },
      is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
    },
    {
      sequelize,
      modelName: 'FarmerFisheryProfile',
      tableName: 'farmer_fishery_profiles',
      timestamps: true,
      underscored: true,
    },
  );

  return FarmerFisheryProfile;
};
