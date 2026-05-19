/**
 * RepaymentBehaviorIndex Model
 * Farmer repayment behavior tracking: on-time, early, late, and default percentages.
 */

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class RepaymentBehaviorIndex extends Model {
    static associate(models) {
      RepaymentBehaviorIndex.belongsTo(models.User, {
        foreignKey: 'farmer_id',
        as: 'farmer',
      });
    }
  }

  RepaymentBehaviorIndex.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      index_uuid: { type: DataTypes.STRING(36), allowNull: false, unique: true },
      farmer_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' },
      },
      on_time_payment_percentage: { type: DataTypes.DECIMAL(5, 2), allowNull: true },
      early_payment_percentage: { type: DataTypes.DECIMAL(5, 2), allowNull: true },
      late_payment_percentage: { type: DataTypes.DECIMAL(5, 2), allowNull: true },
      payment_default_percentage: { type: DataTypes.DECIMAL(5, 2), allowNull: true },
      average_days_late: { type: DataTypes.INTEGER, allowNull: true },
      payment_consistency_score: { type: DataTypes.INTEGER, allowNull: true },
      index_date: { type: DataTypes.DATEONLY, allowNull: true },
      is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
    },
    {
      sequelize,
      modelName: 'RepaymentBehaviorIndex',
      tableName: 'repayment_behavior_indexes',
      timestamps: true,
      underscored: true,
      indexes: [
        { fields: ['index_uuid'], unique: true },
        { fields: ['farmer_id'] },
      ],
    }
  );

  return RepaymentBehaviorIndex;
};
