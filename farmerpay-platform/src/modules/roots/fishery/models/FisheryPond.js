/**
 * FisheryPond Model
 * Individual pond with area, depth, and water source.
 */

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class FisheryPond extends Model {
    static associate(models) {
      FisheryPond.belongsTo(models.FisheryPondRegister, { foreignKey: 'register_id', as: 'register' });
      FisheryPond.hasMany(models.FisherySpeciesStocked, { foreignKey: 'pond_id', as: 'species' });
      FisheryPond.hasMany(models.FisheryFeedingLog, { foreignKey: 'pond_id', as: 'feedingLogs' });
      FisheryPond.hasMany(models.FisheryWaterQualityLog, { foreignKey: 'pond_id', as: 'waterQualityLogs' });
      FisheryPond.hasMany(models.FisheryHealthMonitoring, { foreignKey: 'pond_id', as: 'healthMonitoring' });
      FisheryPond.hasMany(models.FisheryHarvestRecord, { foreignKey: 'pond_id', as: 'harvestRecords' });
    }
  }

  FisheryPond.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      pond_uuid: { type: DataTypes.STRING(36), allowNull: false, unique: true },
      register_id: {
        type: DataTypes.INTEGER, allowNull: true,
        references: { model: 'fishery_pond_registers', key: 'id' },
      },
      farmer_id: { type: DataTypes.INTEGER, allowNull: true },
      pond_name: { type: DataTypes.STRING(100), allowNull: true },
      pond_area_hectares: { type: DataTypes.DECIMAL(10, 4), allowNull: true },
      pond_depth_meters: { type: DataTypes.DECIMAL(5, 2), allowNull: true },
      water_source: {
        type: DataTypes.ENUM('well', 'canal', 'river', 'rainwater', 'groundwater'), allowNull: true,
      },
      license_type: { type: DataTypes.STRING(50), allowNull: true },
      license_number: { type: DataTypes.STRING(50), allowNull: true },
      license_issuing_authority: { type: DataTypes.STRING(100), allowNull: true },
      license_expiry_date: { type: DataTypes.DATEONLY, allowNull: true },
      status: {
        type: DataTypes.ENUM('ACTIVE', 'DORMANT', 'DECOMMISSIONED'),
        allowNull: true,
        defaultValue: 'ACTIVE',
      },
      current_cycle_start_date: { type: DataTypes.DATEONLY, allowNull: true },
      current_species: { type: DataTypes.STRING(80), allowNull: true },
      expected_harvest_date: { type: DataTypes.DATEONLY, allowNull: true },
      construction_date: { type: DataTypes.DATEONLY, allowNull: true },
      construction_cost: { type: DataTypes.DECIMAL(12, 2), allowNull: true },
      notes: { type: DataTypes.TEXT, allowNull: true },
      exit_date: { type: DataTypes.DATEONLY, allowNull: true },
      exit_reason: { type: DataTypes.STRING(50), allowNull: true },
      is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
    },
    {
      sequelize, modelName: 'FisheryPond', tableName: 'fishery_ponds',
      timestamps: true, underscored: true,
      indexes: [{ fields: ['pond_uuid'], unique: true }, { fields: ['register_id'] }],
    }
  );

  return FisheryPond;
};
