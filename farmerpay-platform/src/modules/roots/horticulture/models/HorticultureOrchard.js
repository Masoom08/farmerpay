/**
 * HorticultureOrchard Model
 * Orchard/plantation register with infrastructure type and subsidy tracking.
 */

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class HorticultureOrchard extends Model {
    static associate(models) {
      HorticultureOrchard.belongsTo(models.User, { foreignKey: 'farmer_id', as: 'farmer' });
      HorticultureOrchard.hasMany(models.HorticulturePlanting, { foreignKey: 'orchard_id', as: 'plantings' });
      HorticultureOrchard.hasMany(models.HorticultureHarvest, { foreignKey: 'orchard_id', as: 'harvests' });
      HorticultureOrchard.hasMany(models.HorticultureInputLog, { foreignKey: 'orchard_id', as: 'inputLogs' });
      HorticultureOrchard.hasMany(models.HorticultureHealthRecord, { foreignKey: 'orchard_id', as: 'healthRecords' });
      HorticultureOrchard.hasMany(models.HorticultureExpenseSummary, { foreignKey: 'orchard_id', as: 'expenses' });
      HorticultureOrchard.hasMany(models.HorticultureIncomeSummary, { foreignKey: 'orchard_id', as: 'incomes' });
    }
  }

  HorticultureOrchard.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      orchard_uuid: { type: DataTypes.STRING(36), allowNull: false, unique: true },
      farmer_id: {
        type: DataTypes.INTEGER, allowNull: false,
        references: { model: 'users', key: 'id' },
      },
      orchard_name: { type: DataTypes.STRING(100), allowNull: false },
      crop_name: { type: DataTypes.STRING(100), allowNull: true },
      variety: { type: DataTypes.STRING(100), allowNull: true },
      area_hectares: { type: DataTypes.DECIMAL(10, 4), allowNull: true },
      planting_date: { type: DataTypes.DATEONLY, allowNull: true },
      plant_count: { type: DataTypes.INTEGER, allowNull: true },
      plant_spacing_meters: { type: DataTypes.DECIMAL(5, 2), allowNull: true },
      infrastructure_type: {
        type: DataTypes.ENUM('open_field', 'polyhouse', 'shade_net', 'low_tunnel', 'greenhouse'),
        defaultValue: 'open_field',
      },
      infrastructure_area_sqm: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
      subsidy_scheme: { type: DataTypes.STRING(100), allowNull: true },
      subsidy_amount: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
      orchard_gps_latitude: { type: DataTypes.DECIMAL(10, 8), allowNull: true },
      orchard_gps_longitude: { type: DataTypes.DECIMAL(11, 8), allowNull: true },
      is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
    },
    {
      sequelize, modelName: 'HorticultureOrchard', tableName: 'horticulture_orchards',
      timestamps: true, underscored: true,
      indexes: [{ fields: ['orchard_uuid'], unique: true }, { fields: ['farmer_id'] }],
    }
  );

  return HorticultureOrchard;
};
