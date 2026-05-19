/**
 * FisheryTripEvent Model
 * Sea-only domain event: a single fishing trip. This is the P&L unit for sea
 * farmers (analogous to a pond cycle for inland). Captures trip diary +
 * auto-creates FUEL/ICE/CREW_WAGES cost events and a landing revenue event.
 */

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class FisheryTripEvent extends Model {
    static associate(models) {
      FisheryTripEvent.belongsTo(models.User, { foreignKey: 'farmer_id', as: 'farmer' });
    }
  }

  FisheryTripEvent.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      trip_uuid: { type: DataTypes.STRING(36), allowNull: false, unique: true },
      farmer_id: { type: DataTypes.INTEGER, allowNull: false },
      vessel_id: { type: DataTypes.STRING(36), allowNull: false },
      depart_date: { type: DataTypes.DATEONLY, allowNull: false },
      depart_time: { type: DataTypes.TIME, allowNull: true },
      return_date: { type: DataTypes.DATEONLY, allowNull: true },
      return_time: { type: DataTypes.TIME, allowNull: true },
      trip_hours: { type: DataTypes.DECIMAL(6, 2), allowNull: true },

      fuel_liters: { type: DataTypes.DECIMAL(8, 2), allowNull: true },
      fuel_cost: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
      ice_kg: { type: DataTypes.DECIMAL(8, 2), allowNull: true },
      ice_cost: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
      bait_cost: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
      crew_count: { type: DataTypes.INTEGER, allowNull: true },
      crew_wages_total: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
      other_cost: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },

      catch_total_kg: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
      catch_species_mix: { type: DataTypes.JSON, allowNull: true },
      landing_port: { type: DataTypes.STRING(120), allowNull: true },

      sale_amount: { type: DataTypes.DECIMAL(12, 2), allowNull: true },
      sale_buyer: { type: DataTypes.STRING(120), allowNull: true },
      sale_buyer_type: {
        type: DataTypes.ENUM('WHOLESALER', 'AUCTION', 'DIRECT', 'EXPORTER', 'COOPERATIVE', 'RESTAURANT', 'OTHER'),
        allowNull: true,
      },
      auction_commission: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },

      cost_formal: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
      cost_informal: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
      payment_mode: {
        type: DataTypes.ENUM('CASH', 'UPI', 'BANK', 'CREDIT', 'NONE'),
        allowNull: true,
      },

      status: {
        type: DataTypes.ENUM('IN_PROGRESS', 'COMPLETED', 'ABORTED'),
        allowNull: false,
        defaultValue: 'COMPLETED',
      },
      notes: { type: DataTypes.TEXT, allowNull: true },
    },
    {
      sequelize,
      modelName: 'FisheryTripEvent',
      tableName: 'fishery_trip_events',
      timestamps: true,
      underscored: true,
    },
  );

  return FisheryTripEvent;
};
