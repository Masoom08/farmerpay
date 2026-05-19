/**
 * TrustFarmerActivityMix Model
 * Annual share-of-income snapshot per activity. (farmer, activity_type, year)
 * is unique. Powers diversification signals + leverage computation.
 */
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class TrustFarmerActivityMix extends Model {
    static associate(models) {
      TrustFarmerActivityMix.belongsTo(models.User, { foreignKey: 'farmer_id', as: 'farmer' });
    }
  }

  TrustFarmerActivityMix.init({
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    mix_uuid: { type: DataTypes.STRING(36), allowNull: false, unique: true },
    farmer_id: { type: DataTypes.INTEGER, allowNull: false },
    activity_type: {
      type: DataTypes.ENUM('CROP', 'DAIRY', 'FISHERY', 'HORTI', 'LABOUR', 'OFF_FARM', 'AGRI_BIZ'),
      allowNull: false,
    },
    reference_year: { type: DataTypes.INTEGER, allowNull: false },
    share_percent: { type: DataTypes.DECIMAL(5, 2), allowNull: false, defaultValue: 0 },
    estimated_annual_income_inr: { type: DataTypes.DECIMAL(12, 2), allowNull: true },
    confidence: {
      type: DataTypes.ENUM('LOW', 'MEDIUM', 'HIGH'),
      allowNull: false,
      defaultValue: 'MEDIUM',
    },
    notes: { type: DataTypes.TEXT, allowNull: true },
    is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  }, {
    sequelize,
    modelName: 'TrustFarmerActivityMix',
    tableName: 'trust_farmer_activity_mix',
    timestamps: true,
    underscored: true,
  });

  return TrustFarmerActivityMix;
};
