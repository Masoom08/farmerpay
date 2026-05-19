'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class VendorTransactionEvidence extends Model {
    static associate(models) {
      VendorTransactionEvidence.belongsTo(models.VendorTransaction, { foreignKey: 'transaction_id', as: 'transaction' });
    }
  }

  VendorTransactionEvidence.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      transaction_id: {
        type: DataTypes.INTEGER,
        references: {
          model: 'vendor_transactions',
          key: 'id',
        },
      },
      document_id: {
        type: DataTypes.INTEGER,
      },
      evidence_type: {
        type: DataTypes.ENUM('receipt', 'bill', 'photo', 'video'),
      },
      verified_by_agent: {
        type: DataTypes.INTEGER,
      },
      verified_at: {
        type: DataTypes.DATE,
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
    },
    {
      sequelize,
      modelName: 'VendorTransactionEvidence',
      tableName: 'vendor_transaction_evidence',
      timestamps: true,
      underscored: true,
    }
  );

  return VendorTransactionEvidence;
};
