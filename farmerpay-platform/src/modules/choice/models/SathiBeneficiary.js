/**
 * SathiBeneficiary — tracks farmers that count toward a Sathi's revenue
 * share and 100-beneficiary milestone. One row per (intermediary, farmer).
 */

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class SathiBeneficiary extends Model {
    static associate(models) {
      SathiBeneficiary.belongsTo(models.Intermediary, {
        foreignKey: 'intermediary_id',
        as: 'intermediary',
      });
      SathiBeneficiary.belongsTo(models.User, {
        foreignKey: 'farmer_id',
        as: 'farmer',
      });
      SathiBeneficiary.belongsTo(models.IntermediaryAssignment, {
        foreignKey: 'assignment_id',
        as: 'assignment',
      });
    }
  }

  SathiBeneficiary.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      intermediary_id: { type: DataTypes.INTEGER, allowNull: false },
      farmer_id: { type: DataTypes.INTEGER, allowNull: false },
      assignment_id: { type: DataTypes.INTEGER, allowNull: true },
      first_product_activated_at: { type: DataTypes.DATE, allowNull: true },
      first_product_type: {
        type: DataTypes.ENUM('loan', 'insurance', 'activity'),
        allowNull: true,
      },
      first_product_ref_id: { type: DataTypes.INTEGER, allowNull: true },
      is_counted_for_incentive: { type: DataTypes.BOOLEAN, defaultValue: false },
      status: {
        type: DataTypes.ENUM('pending', 'active', 'dormant', 'churned'),
        allowNull: false,
        defaultValue: 'pending',
      },
    },
    {
      sequelize,
      modelName: 'SathiBeneficiary',
      tableName: 'sathi_beneficiaries',
      timestamps: true,
      underscored: true,
      indexes: [
        { fields: ['intermediary_id', 'farmer_id'], unique: true },
        { fields: ['intermediary_id', 'status'] },
        { fields: ['first_product_activated_at'] },
      ],
    }
  );

  return SathiBeneficiary;
};
