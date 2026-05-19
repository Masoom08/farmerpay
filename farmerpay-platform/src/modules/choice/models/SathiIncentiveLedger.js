/**
 * SathiIncentiveLedger — milestone bonuses (10% extra) on top of the base
 * 20% commission, triggered when the Sathi crosses 100 (or 250 / 500)
 * beneficiaries in a qualifying period.
 */

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class SathiIncentiveLedger extends Model {
    static associate(models) {
      SathiIncentiveLedger.belongsTo(models.Intermediary, {
        foreignKey: 'intermediary_id',
        as: 'intermediary',
      });
    }
  }

  SathiIncentiveLedger.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      intermediary_id: { type: DataTypes.INTEGER, allowNull: false },
      milestone: {
        type: DataTypes.ENUM('100_beneficiaries', '250_beneficiaries', '500_beneficiaries'),
        allowNull: false,
        defaultValue: '100_beneficiaries',
      },
      beneficiary_count_snapshot: { type: DataTypes.INTEGER, allowNull: false },
      qualifying_period_start: { type: DataTypes.DATEONLY, allowNull: false },
      qualifying_period_end: { type: DataTypes.DATEONLY, allowNull: false },
      base_amount_paise: { type: DataTypes.BIGINT, allowNull: false },
      bonus_rate: { type: DataTypes.DECIMAL(5, 4), allowNull: false, defaultValue: 0.1 },
      bonus_amount_paise: { type: DataTypes.BIGINT, allowNull: false },
      payout_status: {
        type: DataTypes.ENUM('accrued', 'approved', 'paid', 'clawed_back'),
        allowNull: false,
        defaultValue: 'accrued',
      },
      payout_batch_id: { type: DataTypes.STRING(36), allowNull: true },
    },
    {
      sequelize,
      modelName: 'SathiIncentiveLedger',
      tableName: 'sathi_incentive_ledger',
      timestamps: true,
      underscored: true,
      indexes: [
        {
          fields: ['intermediary_id', 'milestone', 'qualifying_period_start'],
          unique: true,
        },
      ],
    }
  );

  return SathiIncentiveLedger;
};
