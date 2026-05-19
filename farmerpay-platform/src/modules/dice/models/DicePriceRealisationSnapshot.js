/**
 * DicePriceRealisationSnapshot Model — Records each time a farmer views the sell-now vs store comparison.
 */
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class DicePriceRealisationSnapshot extends Model {
    static associate(models) {
      DicePriceRealisationSnapshot.belongsTo(models.User, { foreignKey: 'farmer_id', as: 'farmer' });
      DicePriceRealisationSnapshot.belongsTo(models.LoanApplication, { foreignKey: 'loan_application_id', as: 'loanApplication' });
      DicePriceRealisationSnapshot.belongsTo(models.PulseCommodity, { foreignKey: 'commodity_id', targetKey: 'commodity_id', as: 'commodity' });
    }
  }
  DicePriceRealisationSnapshot.init({
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    snapshot_uuid: { type: DataTypes.STRING(36), allowNull: false, unique: true },
    farmer_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'users', key: 'id' } },
    loan_application_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'loan_applications', key: 'id' } },
    commodity_id: { type: DataTypes.STRING(36), allowNull: false },
    snapshot_date: { type: DataTypes.DATEONLY, allowNull: false },
    // Current position
    produce_quantity_quintals: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
    loan_outstanding: { type: DataTypes.DECIMAL(15, 2), allowNull: true },
    // Scenario A: Sell Now
    current_mandi_price: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
    sell_now_gross: { type: DataTypes.DECIMAL(15, 2), allowNull: true },
    sell_now_transport_cost: { type: DataTypes.DECIMAL(15, 2), allowNull: true },
    sell_now_net: { type: DataTypes.DECIMAL(15, 2), allowNull: true },
    sell_now_surplus_deficit: { type: DataTypes.DECIMAL(15, 2), allowNull: true },
    // Scenario B: Store 15 days
    predicted_price_15d: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
    confidence_15d: { type: DataTypes.DECIMAL(5, 2), allowNull: true },
    store_15d_storage_cost: { type: DataTypes.DECIMAL(15, 2), allowNull: true },
    store_15d_interest_cost: { type: DataTypes.DECIMAL(15, 2), allowNull: true },
    store_15d_spoilage_loss: { type: DataTypes.DECIMAL(15, 2), allowNull: true },
    store_15d_gross: { type: DataTypes.DECIMAL(15, 2), allowNull: true },
    store_15d_net: { type: DataTypes.DECIMAL(15, 2), allowNull: true },
    store_15d_surplus_deficit: { type: DataTypes.DECIMAL(15, 2), allowNull: true },
    // Scenario C: Store 30 days
    predicted_price_30d: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
    confidence_30d: { type: DataTypes.DECIMAL(5, 2), allowNull: true },
    store_30d_storage_cost: { type: DataTypes.DECIMAL(15, 2), allowNull: true },
    store_30d_interest_cost: { type: DataTypes.DECIMAL(15, 2), allowNull: true },
    store_30d_spoilage_loss: { type: DataTypes.DECIMAL(15, 2), allowNull: true },
    store_30d_gross: { type: DataTypes.DECIMAL(15, 2), allowNull: true },
    store_30d_net: { type: DataTypes.DECIMAL(15, 2), allowNull: true },
    store_30d_surplus_deficit: { type: DataTypes.DECIMAL(15, 2), allowNull: true },
    // System recommendation
    recommended_strategy: { type: DataTypes.ENUM('sell_now', 'store_15d', 'store_30d'), allowNull: true },
    topup_eligible: { type: DataTypes.BOOLEAN, defaultValue: false },
    topup_max_amount: { type: DataTypes.DECIMAL(15, 2), allowNull: true },
    // Farmer action
    farmer_decision: { type: DataTypes.ENUM('sell_now', 'store', 'apply_topup', 'undecided'), defaultValue: 'undecided' },
    is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
  }, {
    sequelize,
    modelName: 'DicePriceRealisationSnapshot',
    tableName: 'dice_price_realisation_snapshots',
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ['farmer_id', 'snapshot_date'] },
      { fields: ['loan_application_id'] }
    ]
  });
  return DicePriceRealisationSnapshot;
};
