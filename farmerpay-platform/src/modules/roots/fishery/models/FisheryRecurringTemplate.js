/**
 * FisheryRecurringTemplate Model
 * Mirror of DairyRecurringTemplate. Lets a farmer set up routine fishery costs
 * (daily feed, weekly aeration electricity, etc.) once; a daily cron auto-
 * creates pending cost events for one-tap confirmation.
 */

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class FisheryRecurringTemplate extends Model {
    static associate(models) {
      FisheryRecurringTemplate.belongsTo(models.User, { foreignKey: 'farmer_id', as: 'farmer' });
    }
  }

  FisheryRecurringTemplate.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      template_uuid: { type: DataTypes.STRING(36), allowNull: false, unique: true },
      farmer_id: { type: DataTypes.INTEGER, allowNull: false },
      template_name: { type: DataTypes.STRING(120), allowNull: false },
      scope: {
        type: DataTypes.ENUM('FARM', 'POND', 'VESSEL'),
        allowNull: false,
        defaultValue: 'FARM',
      },
      pond_id: { type: DataTypes.STRING(36), allowNull: true },
      vessel_id: { type: DataTypes.STRING(36), allowNull: true },
      category: {
        type: DataTypes.ENUM(
          'LABOR', 'LICENSE', 'INSURANCE', 'EQUIPMENT', 'TRANSPORT', 'OTHER',
          'FINGERLINGS', 'FEED', 'POND_PREP', 'AERATION_ELECTRICITY',
          'WATER_MGMT', 'HARVEST_LABOR', 'HEALTH_TREATMENT',
          'FUEL', 'ICE', 'NETS_GEAR', 'BAIT', 'CREW_WAGES',
          'BOAT_MAINTENANCE', 'AUCTION_COMMISSION', 'LANDING_FEES',
        ),
        allowNull: false,
      },
      default_amount: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
      default_quantity: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
      default_unit: { type: DataTypes.STRING(20), allowNull: true },
      default_vendor: { type: DataTypes.STRING(120), allowNull: true },
      default_payment_mode: {
        type: DataTypes.ENUM('CASH', 'UPI', 'BANK', 'CREDIT', 'NONE'),
        allowNull: true,
      },
      frequency: {
        type: DataTypes.ENUM('DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY'),
        allowNull: false,
      },
      day_of_period: { type: DataTypes.INTEGER, allowNull: true },
      next_due_date: { type: DataTypes.DATEONLY, allowNull: false },
      last_generated_date: { type: DataTypes.DATEONLY, allowNull: true },
      is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
    },
    {
      sequelize,
      modelName: 'FisheryRecurringTemplate',
      tableName: 'fishery_recurring_templates',
      timestamps: true,
      underscored: true,
    },
  );

  return FisheryRecurringTemplate;
};
