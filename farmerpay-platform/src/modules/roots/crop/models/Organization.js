'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Organization extends Model {
    static associate(models) {
      Organization.hasMany(models.PackageOfPractice, {
        foreignKey: 'recommended_by_org_id',
        as: 'packageOfPractices',
      });
    }
  }

  Organization.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      org_code: {
        type: DataTypes.STRING(50),
        unique: true,
        allowNull: false,
      },
      org_name: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      org_type: {
        type: DataTypes.ENUM('government', 'private', 'ngo', 'research_institute', 'cooperative'),
        allowNull: false,
      },
      headquarters_state_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      is_verified: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
    },
    {
      sequelize,
      modelName: 'Organization',
      tableName: 'organizations',
      timestamps: true,
      underscored: true,
    }
  );

  return Organization;
};
