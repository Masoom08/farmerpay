/**
 * AgroClimaticZoneMapping Model
 * Maps existing ClimateZone records to LGD blocks/districts.
 * Enables auto-inference of a farmer's agro-climatic zone from their village address.
 */

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class AgroClimaticZoneMapping extends Model {
    static associate(models) {
      AgroClimaticZoneMapping.belongsTo(models.ClimateZone, { foreignKey: 'climate_zone_id', as: 'climateZone' });
      if (models.LgdState) AgroClimaticZoneMapping.belongsTo(models.LgdState, { foreignKey: 'lgd_state_id', as: 'state' });
      if (models.LgdDistrict) AgroClimaticZoneMapping.belongsTo(models.LgdDistrict, { foreignKey: 'lgd_district_id', as: 'district' });
      if (models.LgdBlock) AgroClimaticZoneMapping.belongsTo(models.LgdBlock, { foreignKey: 'lgd_block_id', as: 'block' });
    }
  }

  AgroClimaticZoneMapping.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      climate_zone_id: {
        type: DataTypes.INTEGER, allowNull: false,
        references: { model: 'climate_zones', key: 'id' },
      },
      lgd_state_id: {
        type: DataTypes.INTEGER, allowNull: true,
        references: { model: 'lgd_states', key: 'id' },
      },
      lgd_district_id: {
        type: DataTypes.INTEGER, allowNull: true,
        references: { model: 'lgd_districts', key: 'id' },
      },
      lgd_block_id: {
        type: DataTypes.INTEGER, allowNull: true,
        references: { model: 'lgd_blocks', key: 'id' },
      },
      mapping_source: {
        type: DataTypes.ENUM('icar', 'state_govt', 'manual'),
        defaultValue: 'icar',
      },
      is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
    },
    {
      sequelize, modelName: 'AgroClimaticZoneMapping', tableName: 'agro_climatic_zone_mappings',
      timestamps: true, underscored: true,
      indexes: [
        { fields: ['climate_zone_id', 'lgd_block_id'], name: 'idx_zone_block' },
        { fields: ['climate_zone_id', 'lgd_district_id'], name: 'idx_zone_district' },
      ],
    }
  );

  return AgroClimaticZoneMapping;
};
