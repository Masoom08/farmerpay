/**
 * RssScoreHistory Model
 * Risk Severity Score history with trend tracking and deterioration detection.
 */

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class RssScoreHistory extends Model {
    static associate(models) {
      RssScoreHistory.belongsTo(models.LoanApplication, {
        foreignKey: 'application_id',
        as: 'application',
      });
    }
  }

  RssScoreHistory.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      score_uuid: { type: DataTypes.STRING(36), allowNull: false, unique: true },
      application_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'loan_applications', key: 'id' },
      },
      risk_severity_score: { type: DataTypes.INTEGER, allowNull: false },
      risk_categories: { type: DataTypes.JSON, allowNull: true },
      // 4-component RSS breakdown per FarmerPay dashboard spec
      financial_health_score: { type: DataTypes.INTEGER, allowNull: true },       // 35% weight
      agricultural_performance_score: { type: DataTypes.INTEGER, allowNull: true }, // 25% weight
      market_conditions_score: { type: DataTypes.INTEGER, allowNull: true },       // 20% weight
      behavioral_engagement_score: { type: DataTypes.INTEGER, allowNull: true },   // 20% weight
      // RSS band: GREEN (70-100), YELLOW (50-69), ORANGE (30-49), RED (0-29)
      rss_band: {
        type: DataTypes.ENUM('green', 'yellow', 'orange', 'red'), allowNull: true,
      },
      score_date: { type: DataTypes.DATEONLY, allowNull: false },
      score_trend: { type: DataTypes.STRING(50), allowNull: true },
      is_deteriorating: { type: DataTypes.BOOLEAN, defaultValue: false },
      is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
    },
    {
      sequelize,
      modelName: 'RssScoreHistory',
      tableName: 'rss_score_histories',
      timestamps: true,
      underscored: true,
      indexes: [
        { fields: ['score_uuid'], unique: true },
        { fields: ['application_id'] },
        { fields: ['score_date'] },
      ],
    }
  );

  return RssScoreHistory;
};
