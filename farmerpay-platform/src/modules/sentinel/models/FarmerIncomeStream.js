/**
 * FarmerIncomeStream Model
 * Tracks farmer income sources and stability for cash flow analysis.
 */

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class FarmerIncomeStream extends Model {
    static associate(models) {
      FarmerIncomeStream.belongsTo(models.User, {
        foreignKey: 'farmer_id',
        as: 'farmer',
      });
    }
  }

  FarmerIncomeStream.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      stream_uuid: { type: DataTypes.STRING(36), allowNull: false, unique: true },
      farmer_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' },
      },
      stream_type: { type: DataTypes.STRING(50), allowNull: false },
      annual_income: { type: DataTypes.DECIMAL(15, 2), allowNull: true },
      income_source_description: { type: DataTypes.TEXT, allowNull: true },
      last_verified_date: { type: DataTypes.DATEONLY, allowNull: true },
      verified_by_agent: { type: DataTypes.INTEGER, allowNull: true },
      income_stability_rating: {
        type: DataTypes.ENUM('very_stable', 'stable', 'moderate', 'unstable'),
        allowNull: true,
      },
      dbt_scheme_name: { type: DataTypes.STRING(100), allowNull: true },
      dbt_reference_number: { type: DataTypes.STRING(50), allowNull: true },
      contract_agreement_id: { type: DataTypes.INTEGER, allowNull: true },
      is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
    },
    {
      sequelize,
      modelName: 'FarmerIncomeStream',
      tableName: 'farmer_income_streams',
      timestamps: true,
      underscored: true,
      indexes: [
        { fields: ['stream_uuid'], unique: true },
        { fields: ['farmer_id'] },
      ],
    }
  );

  return FarmerIncomeStream;
};
