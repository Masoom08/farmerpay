/**
 * DiceProduceHypothecationLog Model — Track produce movement and valuation changes.
 */
const { Model } = require('sequelize');
const EVENT_TYPES = ['deposit', 'valuation_update', 'partial_release', 'full_release', 'quality_check', 'insurance_claim'];

module.exports = (sequelize, DataTypes) => {
  class DiceProduceHypothecationLog extends Model {
    static associate(models) {
      DiceProduceHypothecationLog.belongsTo(models.DicePostharvestTopupLoan, { foreignKey: 'topup_loan_id', as: 'topupLoan' });
    }
  }
  DiceProduceHypothecationLog.init({
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    log_uuid: { type: DataTypes.STRING(36), allowNull: false, unique: true },
    topup_loan_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'dice_postharvest_topup_loans', key: 'id' } },
    log_date: { type: DataTypes.DATEONLY, allowNull: false },
    event_type: { type: DataTypes.ENUM(...EVENT_TYPES), allowNull: false },
    quantity_quintals: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
    price_per_quintal: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
    total_value: { type: DataTypes.DECIMAL(15, 2), allowNull: true },
    current_ltv_ratio: { type: DataTypes.DECIMAL(5, 2), allowNull: true },
    margin_call_triggered: { type: DataTypes.BOOLEAN, defaultValue: false },
    notes: { type: DataTypes.TEXT, allowNull: true },
    logged_by: { type: DataTypes.INTEGER, allowNull: true },
    is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
  }, {
    sequelize,
    modelName: 'DiceProduceHypothecationLog',
    tableName: 'dice_produce_hypothecation_logs',
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ['topup_loan_id', 'log_date'] }
    ]
  });
  return DiceProduceHypothecationLog;
};
