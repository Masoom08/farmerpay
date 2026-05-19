'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class FieldOwnershipStatus extends Model {
    static associate(models) {
      FieldOwnershipStatus.belongsTo(models.Field, {
        foreignKey: 'field_id',
        as: 'field',
      });
    }
  }

  FieldOwnershipStatus.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      field_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'fields',
          key: 'id',
        },
      },
      ownership_type: {
        type: DataTypes.ENUM('owned', 'leased', 'shared'),
      },
      owner_name: {
        type: DataTypes.STRING(100),
      },
      ownership_document_url: {
        type: DataTypes.STRING(255),
      },
      document_verified: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      verified_by_agent: {
        type: DataTypes.INTEGER,
      },
      lease_start_date: {
        type: DataTypes.DATEONLY,
      },
      lease_end_date: {
        type: DataTypes.DATEONLY,
      },
      annual_lease_rent: {
        type: DataTypes.DECIMAL(15, 2),
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
    },
    {
      sequelize,
      modelName: 'FieldOwnershipStatus',
      tableName: 'field_ownership_statuses',
      timestamps: true,
      underscored: true,
    }
  );

  return FieldOwnershipStatus;
};
