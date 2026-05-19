/**
 * EwsSignal Model
 * Early Warning System signals: payment irregularity, cash flow stress, market risk, etc.
 */

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class EwsSignal extends Model {
    static associate(models) {
      EwsSignal.belongsTo(models.LoanApplication, {
        foreignKey: 'application_id',
        as: 'application',
      });
      EwsSignal.hasMany(models.EwsAlert, {
        foreignKey: 'signal_id',
        as: 'alerts',
      });
    }
  }

  EwsSignal.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      signal_uuid: { type: DataTypes.STRING(36), allowNull: false, unique: true },
      application_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'loan_applications', key: 'id' },
      },
      signal_type: {
        type: DataTypes.ENUM(
          'payment_irregularity', 'cash_flow_stress', 'vendor_risk',
          'collateral_depreciation', 'market_risk', 'weather_risk'
        ),
        allowNull: false,
      },
      signal_strength: {
        type: DataTypes.ENUM('weak', 'moderate', 'strong'),
        allowNull: false,
      },
      signal_timestamp: { type: DataTypes.DATE, allowNull: true },
      signal_data: { type: DataTypes.JSON, allowNull: true },
      is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
    },
    {
      sequelize,
      modelName: 'EwsSignal',
      tableName: 'ews_signals',
      timestamps: true,
      underscored: true,
      indexes: [
        { fields: ['signal_uuid'], unique: true },
        { fields: ['application_id'] },
        { fields: ['signal_type'] },
        { fields: ['signal_strength'] },
      ],
    }
  );

  return EwsSignal;
};
