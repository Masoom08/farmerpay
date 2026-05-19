/**
 * FisheryVessel Model
 * Sea fishing vessel — first-class asset (analogous to DairyAnimal). Trips
 * belong to a vessel, so vessels are the unit for per-asset P&L attribution
 * on the sea side.
 */

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class FisheryVessel extends Model {
    static associate(models) {
      FisheryVessel.belongsTo(models.User, { foreignKey: 'farmer_id', as: 'farmer' });
    }
  }

  FisheryVessel.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      vessel_uuid: { type: DataTypes.STRING(36), allowNull: false, unique: true },
      farmer_id: { type: DataTypes.INTEGER, allowNull: false },
      vessel_name: { type: DataTypes.STRING(100), allowNull: true },
      registration_number: { type: DataTypes.STRING(50), allowNull: true },
      vessel_type: {
        type: DataTypes.ENUM('CATAMARAN', 'MECHANIZED_BOAT', 'TRAWLER', 'CANOE', 'OTHER'),
        allowNull: false,
        defaultValue: 'MECHANIZED_BOAT',
      },
      length_meters: { type: DataTypes.DECIMAL(5, 2), allowNull: true },
      engine_hp: { type: DataTypes.INTEGER, allowNull: true },
      fuel_type: {
        type: DataTypes.ENUM('DIESEL', 'PETROL', 'KEROSENE', 'NONE'),
        allowNull: true,
      },
      crew_size: { type: DataTypes.INTEGER, allowNull: true },
      license_type: { type: DataTypes.STRING(50), allowNull: true },
      license_number: { type: DataTypes.STRING(50), allowNull: true },
      license_expiry: { type: DataTypes.DATEONLY, allowNull: true },
      home_port: { type: DataTypes.STRING(120), allowNull: true },
      purchase_date: { type: DataTypes.DATEONLY, allowNull: true },
      purchase_cost: { type: DataTypes.DECIMAL(12, 2), allowNull: true },
      purchase_cost_formal: { type: DataTypes.DECIMAL(12, 2), allowNull: true },
      purchase_cost_informal: { type: DataTypes.DECIMAL(12, 2), allowNull: true },
      acquisition_mode: {
        type: DataTypes.ENUM('PURCHASED', 'INHERITED', 'GIFTED', 'LEASED'),
        allowNull: true,
      },
      status: {
        type: DataTypes.ENUM('ACTIVE', 'SOLD', 'LOST', 'SCRAPPED', 'DORMANT'),
        allowNull: false,
        defaultValue: 'ACTIVE',
      },
      exit_date: { type: DataTypes.DATEONLY, allowNull: true },
      exit_reason: { type: DataTypes.STRING(50), allowNull: true },
      exit_value: { type: DataTypes.DECIMAL(12, 2), allowNull: true },
      primary_photo_url: { type: DataTypes.STRING(500), allowNull: true },
      notes: { type: DataTypes.TEXT, allowNull: true },
      is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
    },
    {
      sequelize,
      modelName: 'FisheryVessel',
      tableName: 'fishery_vessels',
      timestamps: true,
      underscored: true,
    },
  );

  return FisheryVessel;
};
