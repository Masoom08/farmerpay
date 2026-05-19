/**
 * TrustFarmerActivity Model
 * One row per (farmer, activity_type). Marks which livelihood activities a
 * farmer engages in. is_primary marks the dominant one. Lives in the trust
 * module so the whole "what does this farmer do" + "how trustworthy are they"
 * picture stays under one name.
 */
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class TrustFarmerActivity extends Model {
    static associate(models) {
      TrustFarmerActivity.belongsTo(models.User, { foreignKey: 'farmer_id', as: 'farmer' });
    }
  }

  TrustFarmerActivity.init({
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    activity_uuid: { type: DataTypes.STRING(36), allowNull: false, unique: true },
    farmer_id: { type: DataTypes.INTEGER, allowNull: false },
    activity_type: {
      type: DataTypes.ENUM('CROP', 'DAIRY', 'FISHERY', 'HORTI', 'LABOUR', 'OFF_FARM', 'AGRI_BIZ'),
      allowNull: false,
    },
    is_primary: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    started_year: { type: DataTypes.INTEGER, allowNull: true },
    source: {
      type: DataTypes.ENUM('FARMER_DECLARED', 'BACKFILL', 'AGENT_VERIFIED'),
      allowNull: false,
      defaultValue: 'FARMER_DECLARED',
    },
    notes: { type: DataTypes.TEXT, allowNull: true },
    is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  }, {
    sequelize,
    modelName: 'TrustFarmerActivity',
    tableName: 'trust_farmer_activities',
    timestamps: true,
    underscored: true,
  });

  return TrustFarmerActivity;
};
