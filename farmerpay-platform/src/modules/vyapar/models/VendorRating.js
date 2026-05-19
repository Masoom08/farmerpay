'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class VendorRating extends Model {
    static associate(models) {
      VendorRating.belongsTo(models.VendorProfile, { foreignKey: 'vendor_id', as: 'vendor' });
      VendorRating.belongsTo(models.User, { foreignKey: 'farmer_id', as: 'farmer' });
    }
  }

  VendorRating.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      vendor_id: {
        type: DataTypes.INTEGER, allowNull: false,
        references: { model: 'vendor_profiles', key: 'id' },
      },
      farmer_id: {
        type: DataTypes.INTEGER, allowNull: false,
        references: { model: 'users', key: 'id' },
      },
      rating_score: { type: DataTypes.INTEGER, allowNull: false },
      rating_feedback: { type: DataTypes.TEXT, allowNull: true },
      rated_on: { type: DataTypes.DATE, allowNull: true },
      is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
    },
    {
      sequelize, modelName: 'VendorRating', tableName: 'vendor_ratings',
      timestamps: true, underscored: true,
      indexes: [{ fields: ['vendor_id'] }, { fields: ['farmer_id'] }],
    }
  );

  return VendorRating;
};
