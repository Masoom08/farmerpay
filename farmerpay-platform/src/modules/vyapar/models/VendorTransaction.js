'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class VendorTransaction extends Model {
    static associate(models) {
      VendorTransaction.belongsTo(models.VendorProfile, { foreignKey: 'vendor_id', as: 'vendor' });
      VendorTransaction.belongsTo(models.User, { foreignKey: 'farmer_id', as: 'farmer' });
      VendorTransaction.hasMany(models.VendorTransactionItem, { foreignKey: 'transaction_id', as: 'items' });
      VendorTransaction.hasMany(models.VendorTransactionEvidence, { foreignKey: 'transaction_id', as: 'evidence' });
    }
  }

  VendorTransaction.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      transaction_uuid: {
        type: DataTypes.STRING(36),
        unique: true,
      },
      vendor_id: {
        type: DataTypes.INTEGER,
        references: {
          model: 'vendor_profiles',
          key: 'id',
        },
      },
      farmer_id: {
        type: DataTypes.INTEGER,
        references: {
          model: 'users',
          key: 'id',
        },
      },
      transaction_type: {
        type: DataTypes.ENUM('cash_sale', 'credit_sale', 'cash_credit_sale', 'return', 'exchange'),
      },
      transaction_date: {
        type: DataTypes.DATEONLY,
      },
      transaction_amount: {
        type: DataTypes.DECIMAL(15, 2),
      },
      cash_amount: {
        type: DataTypes.DECIMAL(12,2),
        defaultValue: 0
      },
      credit_amount: {
        type: DataTypes.DECIMAL(12,2),
        defaultValue: 0
      },
      transaction_status: {
        type: DataTypes.ENUM('completed', 'pending', 'cancelled'),
        defaultValue: 'pending',
      },
      payment_status: {
        type: DataTypes.ENUM('paid', 'partial_paid', 'credit_given', 'pending'),
        defaultValue: 'pending',
      },
      agent_facilitated: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      // agent_id: {
      //   type: DataTypes.INTEGER,
      // },
      loan_application_id: {
        type: DataTypes.INTEGER,
      },
      is_insurance_proof: { type: DataTypes.BOOLEAN, defaultValue: false },
      season: {
        type: DataTypes.ENUM('kharif', 'rabi', 'zaid', 'year_round'), allowNull: true,
      },
      fpo_id: { type: DataTypes.STRING(16), allowNull: true },
      is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
    },
    {
      sequelize,
      modelName: 'VendorTransaction',
      tableName: 'vendor_transactions',
      timestamps: true,
      underscored: true,
      indexes: [
        {
          fields: ['vendor_id', 'transaction_date'],
        },
        {
          fields: ['farmer_id', 'transaction_date'],
        },
      ],
    }
  );

  return VendorTransaction;
};
