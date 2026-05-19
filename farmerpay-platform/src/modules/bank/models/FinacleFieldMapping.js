/**
 * FinacleFieldMapping Model
 * Maps Finacle field names to FarmerPay field names per bank.
 * Each bank may have different Finacle field naming conventions.
 */

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class FinacleFieldMapping extends Model {
    static associate() {}
  }

  FinacleFieldMapping.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      bank_code: { type: DataTypes.STRING(20), allowNull: false },
      finacle_entity: { type: DataTypes.STRING(50), allowNull: false },
      finacle_field_name: { type: DataTypes.STRING(100), allowNull: false },
      farmerpay_table: { type: DataTypes.STRING(100), allowNull: false },
      farmerpay_column: { type: DataTypes.STRING(100), allowNull: false },
      transformation_rule: { type: DataTypes.STRING(200), allowNull: true },
      is_required: { type: DataTypes.BOOLEAN, defaultValue: false },
      is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
    },
    {
      sequelize, modelName: 'FinacleFieldMapping', tableName: 'finacle_field_mappings',
      timestamps: true, underscored: true,
      indexes: [{ fields: ['bank_code', 'finacle_entity'] }],
    }
  );

  return FinacleFieldMapping;
};
