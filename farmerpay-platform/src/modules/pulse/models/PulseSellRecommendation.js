/**
 * PulseSellRecommendation Model
 * Optimal sell timing and mandi recommendations for farmers' harvests.
 */

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class PulseSellRecommendation extends Model {
    static associate(models) {
      PulseSellRecommendation.belongsTo(models.User, { foreignKey: 'farmer_id', as: 'farmer' });
      PulseSellRecommendation.belongsTo(models.PulseCommodity, { foreignKey: 'commodity_id', targetKey: 'commodity_id', as: 'commodity' });
      PulseSellRecommendation.belongsTo(models.CultivationCycle, { foreignKey: 'cycle_id', targetKey: 'cycle_uuid', as: 'cycle' });
    }
  }

  PulseSellRecommendation.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      recommendation_uuid: { type: DataTypes.STRING(36), allowNull: false, unique: true },
      farmer_id: {
        type: DataTypes.INTEGER, allowNull: false,
        references: { model: 'users', key: 'id' },
      },
      cycle_id: { type: DataTypes.STRING(36), allowNull: true },
      commodity_id: { type: DataTypes.STRING(36), allowNull: false },
      recommended_timing: { type: DataTypes.STRING(50), allowNull: true },
      recommended_price: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
      rationale: { type: DataTypes.TEXT, allowNull: true },
      mandi_recommendations: { type: DataTypes.JSON, allowNull: true },
      recommendation_generated_date: { type: DataTypes.DATEONLY, allowNull: true },
      farmer_followed_recommendation: { type: DataTypes.BOOLEAN, defaultValue: null },
      actual_price_achieved: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
      // DICE integration fields
      linked_loan_application_id: { type: DataTypes.INTEGER, allowNull: true, comment: 'active crop loan against this cycle' },
      loan_outstanding_at_recommendation: { type: DataTypes.DECIMAL(15, 2), allowNull: true },
      sell_now_realisation: { type: DataTypes.DECIMAL(15, 2), allowNull: true },
      store_15d_realisation: { type: DataTypes.DECIMAL(15, 2), allowNull: true },
      store_30d_realisation: { type: DataTypes.DECIMAL(15, 2), allowNull: true },
      optimal_strategy: { type: DataTypes.ENUM('sell_now', 'store_15d', 'store_30d'), allowNull: true, comment: 'system recommendation' },
      topup_loan_eligible: { type: DataTypes.BOOLEAN, defaultValue: false },
      topup_loan_max_amount: { type: DataTypes.DECIMAL(15, 2), allowNull: true },
      is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
    },
    {
      sequelize, modelName: 'PulseSellRecommendation', tableName: 'pulse_sell_recommendations',
      timestamps: true, underscored: true,
      indexes: [{ fields: ['recommendation_uuid'], unique: true }, { fields: ['farmer_id'] }, { fields: ['commodity_id'] }],
    }
  );

  return PulseSellRecommendation;
};
