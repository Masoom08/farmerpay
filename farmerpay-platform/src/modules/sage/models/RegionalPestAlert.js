/**
 * RegionalPestAlert
 * Active pest pressure for (district, crop, pest) over a date window. The
 * crop advisory engine joins this with PopWorkbandPestSusceptibility for
 * the farmer's current stage to fire pest advisories.
 */

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class RegionalPestAlert extends Model {
    static associate() { /* loose FK to lgd_districts and crop_masters */ }
  }

  RegionalPestAlert.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      lgd_district_id: { type: DataTypes.INTEGER, allowNull: true },
      crop_id: { type: DataTypes.STRING(36), allowNull: false },
      pest_code: { type: DataTypes.STRING(40), allowNull: false },
      severity: {
        type: DataTypes.ENUM('low', 'medium', 'high'),
        allowNull: false, defaultValue: 'medium',
      },
      observed_from: { type: DataTypes.DATEONLY, allowNull: false },
      observed_until: { type: DataTypes.DATEONLY, allowNull: false },
      source: {
        type: DataTypes.ENUM('farmer_self_report_rollup', 'npss', 'manual_seed', 'krishi_dss'),
        allowNull: false, defaultValue: 'manual_seed',
      },
      notes: { type: DataTypes.TEXT, allowNull: true },
      is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    },
    {
      sequelize,
      modelName: 'RegionalPestAlert',
      tableName: 'regional_pest_alerts',
      timestamps: true,
      underscored: true,
      indexes: [{ fields: ['lgd_district_id', 'crop_id', 'observed_until'] }],
    }
  );

  return RegionalPestAlert;
};
