/**
 * FisheryStockingEventV2 Model
 * Inland-only domain event: pond stocking with fingerlings.
 * Service layer auto-creates a FINGERLINGS cost event on save.
 */

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class FisheryStockingEventV2 extends Model {
    static associate(models) {
      FisheryStockingEventV2.belongsTo(models.User, { foreignKey: 'farmer_id', as: 'farmer' });
    }
  }

  FisheryStockingEventV2.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      event_uuid: { type: DataTypes.STRING(36), allowNull: false, unique: true },
      farmer_id: { type: DataTypes.INTEGER, allowNull: false },
      pond_id: { type: DataTypes.STRING(36), allowNull: false },
      stocking_date: { type: DataTypes.DATEONLY, allowNull: false },
      species_name: { type: DataTypes.STRING(80), allowNull: false },
      species_type: {
        type: DataTypes.ENUM('CARP', 'CATFISH', 'TILAPIA', 'SHRIMP', 'PRAWN', 'ROHU', 'KATLA', 'PANGASIUS', 'OTHER'),
        allowNull: false,
      },
      fingerlings_count: { type: DataTypes.INTEGER, allowNull: false },
      cost_per_fingerling: { type: DataTypes.DECIMAL(8, 2), allowNull: true },
      total_cost: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
      cost_formal: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
      cost_informal: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
      payment_mode: {
        type: DataTypes.ENUM('CASH', 'UPI', 'BANK', 'CREDIT', 'NONE'),
        allowNull: true,
      },
      supplier_name: { type: DataTypes.STRING(120), allowNull: true },
      expected_survival_rate: { type: DataTypes.DECIMAL(5, 2), allowNull: true },
      expected_harvest_date: { type: DataTypes.DATEONLY, allowNull: true },
      notes: { type: DataTypes.TEXT, allowNull: true },
      cost_event_uuid: { type: DataTypes.STRING(36), allowNull: true },
    },
    {
      sequelize,
      modelName: 'FisheryStockingEventV2',
      tableName: 'fishery_stocking_events',
      timestamps: true,
      underscored: true,
    },
  );

  return FisheryStockingEventV2;
};
