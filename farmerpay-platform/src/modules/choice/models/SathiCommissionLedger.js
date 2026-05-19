/**
 * SathiCommissionLedger — immutable per-revenue-event accrual ledger.
 * Written synchronously (or via RabbitMQ queue) whenever an FP revenue
 * event fires for a farmer who has an active Sathi assignment.
 *
 * All monetary amounts in paise (BIGINT).
 */

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class SathiCommissionLedger extends Model {
    static associate(models) {
      SathiCommissionLedger.belongsTo(models.Intermediary, {
        foreignKey: 'intermediary_id',
        as: 'intermediary',
      });
      SathiCommissionLedger.belongsTo(models.User, {
        foreignKey: 'farmer_id',
        as: 'farmer',
      });
    }
  }

  SathiCommissionLedger.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      intermediary_id: { type: DataTypes.INTEGER, allowNull: false },
      farmer_id: { type: DataTypes.INTEGER, allowNull: false },
      revenue_event_type: {
        type: DataTypes.ENUM(
          'loan_processing_fee',
          'insurance_commission',
          'txn_fee',
          'subsidy_facilitation_fee',
          'other'
        ),
        allowNull: false,
      },
      revenue_event_ref_id: { type: DataTypes.INTEGER, allowNull: true },
      gross_amount_paise: { type: DataTypes.BIGINT, allowNull: false },
      commission_rate: { type: DataTypes.DECIMAL(5, 4), allowNull: false, defaultValue: 0.2 },
      commission_amount_paise: { type: DataTypes.BIGINT, allowNull: false },
      accrual_period: { type: DataTypes.STRING(7), allowNull: false },
      payout_status: {
        type: DataTypes.ENUM('accrued', 'approved', 'paid', 'clawed_back'),
        allowNull: false,
        defaultValue: 'accrued',
      },
      payout_batch_id: { type: DataTypes.STRING(36), allowNull: true },
      notes: { type: DataTypes.TEXT, allowNull: true },
    },
    {
      sequelize,
      modelName: 'SathiCommissionLedger',
      tableName: 'sathi_commission_ledger',
      timestamps: true,
      underscored: true,
      indexes: [
        { fields: ['intermediary_id', 'accrual_period'] },
        { fields: ['farmer_id'] },
        { fields: ['payout_status'] },
      ],
    }
  );

  return SathiCommissionLedger;
};
