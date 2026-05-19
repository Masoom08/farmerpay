/**
 * FisheryRevenueEvent Model
 * Master revenue ledger for fishery operations. Append-only with polymorphic
 * scope (FARM/POND/VESSEL/TRIP). Captures species, kg, rate and buyer details.
 */

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class FisheryRevenueEvent extends Model {
    static associate(models) {
      FisheryRevenueEvent.belongsTo(models.User, { foreignKey: 'farmer_id', as: 'farmer' });
    }
  }

  FisheryRevenueEvent.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      event_uuid: { type: DataTypes.STRING(36), allowNull: false, unique: true },
      farmer_id: { type: DataTypes.INTEGER, allowNull: false },
      event_date: { type: DataTypes.DATEONLY, allowNull: false },
      scope: {
        type: DataTypes.ENUM('FARM', 'POND', 'VESSEL', 'TRIP'),
        allowNull: false,
        defaultValue: 'FARM',
      },
      pond_id: { type: DataTypes.STRING(36), allowNull: true },
      vessel_id: { type: DataTypes.STRING(36), allowNull: true },
      trip_id: { type: DataTypes.STRING(36), allowNull: true },
      category: {
        type: DataTypes.ENUM(
          'FISH_SALE_WHOLESALE', 'FISH_SALE_AUCTION', 'FISH_SALE_DIRECT',
          'FISH_SALE_EXPORT', 'FISH_SALE_COOPERATIVE',
          'BYPRODUCT_SALE', 'POND_LEASE_INCOME', 'VESSEL_SALE',
          'INSURANCE_PAYOUT', 'SUBSIDY', 'OTHER',
        ),
        allowNull: false,
      },
      species: { type: DataTypes.STRING(50), allowNull: true },
      quantity_kg: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
      avg_weight_grams: { type: DataTypes.DECIMAL(8, 2), allowNull: true },
      rate_per_kg: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
      amount: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
      amount_formal: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
      amount_informal: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
      buyer_name: { type: DataTypes.STRING(120), allowNull: true },
      buyer_type: {
        type: DataTypes.ENUM('WHOLESALER', 'AUCTION', 'DIRECT', 'EXPORTER', 'COOPERATIVE', 'RESTAURANT', 'OTHER'),
        allowNull: true,
      },
      payment_mode: {
        type: DataTypes.ENUM('CASH', 'UPI', 'BANK', 'CREDIT', 'NONE'),
        allowNull: true,
      },
      landing_port: { type: DataTypes.STRING(120), allowNull: true },
      notes: { type: DataTypes.TEXT, allowNull: true },
      source_table: { type: DataTypes.STRING(50), allowNull: true },
      source_event_uuid: { type: DataTypes.STRING(36), allowNull: true },
      is_estimated: { type: DataTypes.BOOLEAN, defaultValue: false },
      is_correction: { type: DataTypes.BOOLEAN, defaultValue: false },
      corrects_event_uuid: { type: DataTypes.STRING(36), allowNull: true },
    },
    {
      sequelize,
      modelName: 'FisheryRevenueEvent',
      tableName: 'fishery_revenue_events',
      timestamps: true,
      underscored: true,
    },
  );

  return FisheryRevenueEvent;
};
