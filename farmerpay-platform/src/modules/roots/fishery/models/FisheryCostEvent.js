/**
 * FisheryCostEvent Model
 * Master cost ledger for fishery operations. Append-only with polymorphic
 * scope (FARM/POND/VESSEL/TRIP), formal/informal split. Source of truth for
 * the P&L allocation engine.
 */

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class FisheryCostEvent extends Model {
    static associate(models) {
      FisheryCostEvent.belongsTo(models.User, { foreignKey: 'farmer_id', as: 'farmer' });
    }
  }

  FisheryCostEvent.init(
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
          'LABOR', 'LICENSE', 'INSURANCE', 'EQUIPMENT', 'TRANSPORT', 'OTHER',
          'FINGERLINGS', 'FEED', 'POND_PREP', 'AERATION_ELECTRICITY',
          'WATER_MGMT', 'HARVEST_LABOR', 'HEALTH_TREATMENT',
          'FUEL', 'ICE', 'NETS_GEAR', 'BAIT', 'CREW_WAGES',
          'BOAT_MAINTENANCE', 'AUCTION_COMMISSION', 'LANDING_FEES',
          'POND_CONSTRUCTION', 'VESSEL_PURCHASE',
        ),
        allowNull: false,
      },
      subcategory: { type: DataTypes.STRING(50), allowNull: true },
      quantity: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
      unit: { type: DataTypes.STRING(20), allowNull: true },
      unit_price: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
      amount: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
      amount_formal: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
      amount_informal: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
      payment_mode: {
        type: DataTypes.ENUM('CASH', 'UPI', 'BANK', 'CREDIT', 'NONE'),
        allowNull: true,
      },
      vendor_name: { type: DataTypes.STRING(120), allowNull: true },
      notes: { type: DataTypes.TEXT, allowNull: true },
      source_table: { type: DataTypes.STRING(50), allowNull: true },
      source_event_uuid: { type: DataTypes.STRING(36), allowNull: true },
      is_recurring: { type: DataTypes.BOOLEAN, defaultValue: false },
      recurring_template_id: { type: DataTypes.INTEGER, allowNull: true },
      is_pending: { type: DataTypes.BOOLEAN, defaultValue: false },
      is_estimated: { type: DataTypes.BOOLEAN, defaultValue: false },
      is_correction: { type: DataTypes.BOOLEAN, defaultValue: false },
      corrects_event_uuid: { type: DataTypes.STRING(36), allowNull: true },
    },
    {
      sequelize,
      modelName: 'FisheryCostEvent',
      tableName: 'fishery_cost_events',
      timestamps: true,
      underscored: true,
    },
  );

  return FisheryCostEvent;
};
