/**
 * BankProductConfig Model
 * Per-bank, per-product decisioning thresholds.
 * Tracks trust_cutoff and fhs_cutoff with version history.
 *
 * The "active" row for a (bank, product) pair is the one with is_active=true.
 * When a threshold is updated, the old row is deactivated and a new row is created.
 */

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class BankProductConfig extends Model {
    static associate(models) {
      BankProductConfig.belongsTo(models.LoanProvider, { foreignKey: 'bank_id', as: 'bank' });
      BankProductConfig.belongsTo(models.LoanProduct, { foreignKey: 'product_id', as: 'product' });
      BankProductConfig.belongsTo(models.User, { foreignKey: 'updated_by', as: 'updater' });
    }
  }

  BankProductConfig.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      config_uuid: { type: DataTypes.STRING(36), allowNull: false, unique: true },
      bank_id: {
        type: DataTypes.INTEGER, allowNull: false,
        references: { model: 'loan_providers', key: 'id' },
      },
      product_id: {
        type: DataTypes.INTEGER, allowNull: true,
        references: { model: 'loan_products', key: 'id' },
        comment: 'NULL = bank-wide default; set = product-specific override',
      },
      trust_cutoff: {
        type: DataTypes.DECIMAL(5, 2), allowNull: false, defaultValue: 60,
        comment: 'T_cutoff — TRUST score threshold for High vs Low',
      },
      fhs_cutoff: {
        type: DataTypes.DECIMAL(5, 2), allowNull: false, defaultValue: 50,
        comment: 'F_cutoff — FHS score threshold for High vs Low',
      },
      version: {
        type: DataTypes.INTEGER, allowNull: false, defaultValue: 1,
        comment: 'Monotonically increasing version per (bank_id, product_id)',
      },
      change_reason: {
        type: DataTypes.STRING(500), allowNull: true,
        comment: 'Why this threshold change was made',
      },
      updated_by: {
        type: DataTypes.INTEGER, allowNull: false,
        references: { model: 'users', key: 'id' },
      },
      is_active: {
        type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true,
      },
      effective_from: {
        type: DataTypes.DATE, allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      sequelize,
      modelName: 'BankProductConfig',
      tableName: 'bank_product_configs',
      timestamps: true,
      underscored: true,
      indexes: [
        { fields: ['bank_id', 'product_id', 'is_active'] },
        { fields: ['bank_id', 'is_active'] },
        { fields: ['config_uuid'], unique: true },
      ],
    }
  );

  return BankProductConfig;
};
