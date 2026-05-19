/**
 * PortfolioSnapshot Model
 * Aggregate portfolio health metrics for bank users: NPA%, SMA%, total outstanding.
 */

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class PortfolioSnapshot extends Model {
    static associate() {
      // No foreign key associations — bank_user_id is a loose reference
    }
  }

  PortfolioSnapshot.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      snapshot_uuid: { type: DataTypes.STRING(36), allowNull: false, unique: true },
      bank_user_id: { type: DataTypes.INTEGER, allowNull: true },
      snapshot_date: { type: DataTypes.DATEONLY, allowNull: false },
      total_applications: { type: DataTypes.INTEGER, allowNull: true, defaultValue: 0 },
      total_loan_amount: { type: DataTypes.DECIMAL(15, 2), allowNull: true },
      total_outstanding_amount: { type: DataTypes.DECIMAL(15, 2), allowNull: true },
      portfolio_npa_percent: { type: DataTypes.DECIMAL(5, 2), allowNull: true },
      portfolio_sma_percent: { type: DataTypes.DECIMAL(5, 2), allowNull: true },
      portfolio_health_score: { type: DataTypes.INTEGER, allowNull: true },
      is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
    },
    {
      sequelize,
      modelName: 'PortfolioSnapshot',
      tableName: 'portfolio_snapshots',
      timestamps: true,
      underscored: true,
      indexes: [
        { fields: ['snapshot_uuid'], unique: true },
        { fields: ['bank_user_id', 'snapshot_date'] },
      ],
    }
  );

  return PortfolioSnapshot;
};
