/**
 * PulseMandi Model
 * Indian agricultural market (mandi) registry with geolocation.
 */

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class PulseMandi extends Model {
    static associate(models) {
      PulseMandi.belongsTo(models.LgdState, { foreignKey: 'mandi_state_id', as: 'state' });
      PulseMandi.belongsTo(models.LgdDistrict, { foreignKey: 'mandi_district_id', as: 'district' });
      PulseMandi.hasMany(models.PulsePriceRecord, { foreignKey: 'mandi_id', as: 'priceRecords' });
    }
  }

  PulseMandi.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      mandi_code: { type: DataTypes.STRING(50), allowNull: false, unique: true },
      mandi_name: { type: DataTypes.STRING(150), allowNull: false },
      mandi_state_id: {
        type: DataTypes.INTEGER, allowNull: true,
        references: { model: 'lgd_states', key: 'id' },
      },
      mandi_district_id: {
        type: DataTypes.INTEGER, allowNull: true,
        references: { model: 'lgd_districts', key: 'id' },
      },
      mandi_latitude: { type: DataTypes.DECIMAL(10, 8), allowNull: true },
      mandi_longitude: { type: DataTypes.DECIMAL(11, 8), allowNull: true },
      mandi_regulated_by: { type: DataTypes.STRING(100), allowNull: true },
      // PULSE Blueprint enrichment fields
      mandi_type: { type: DataTypes.ENUM('apmc', 'enam', 'private', 'fpo_direct'), defaultValue: 'apmc' },
      density_score: { type: DataTypes.DECIMAL(5, 2), allowNull: true, comment: 'mandis per 1000 sq km in district' },
      transport_cost_index: { type: DataTypes.DECIMAL(10, 2), allowNull: true, comment: 'cost to nearest consumption centre' },
      cold_storage_proximity_km: { type: DataTypes.DECIMAL(10, 2), allowNull: true, comment: 'km to nearest cold storage' },
      fpo_aggregation_flag: { type: DataTypes.BOOLEAN, defaultValue: false },
      price_discovery_rank: { type: DataTypes.INTEGER, allowNull: true, comment: 'larger mandis adjust faster per ICAR-NIAP' },
      is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
    },
    {
      sequelize, modelName: 'PulseMandi', tableName: 'pulse_mandis',
      timestamps: true, underscored: true,
      indexes: [{ fields: ['mandi_code'], unique: true }, { fields: ['mandi_state_id'] }, { fields: ['mandi_district_id'] }],
    }
  );

  return PulseMandi;
};
