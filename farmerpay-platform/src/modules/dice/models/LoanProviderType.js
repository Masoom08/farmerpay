const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class LoanProviderType extends Model {
    static associate(models) { LoanProviderType.hasMany(models.LoanProvider, { foreignKey: 'provider_type_id', as: 'providers' }); }
  }
  LoanProviderType.init({
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    provider_type_code: { type: DataTypes.STRING(50), allowNull: false, unique: true },
    provider_type_name: { type: DataTypes.STRING(100), allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: true },
    is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
  }, { sequelize, modelName: 'LoanProviderType', tableName: 'loan_provider_types', timestamps: true, underscored: true });
  return LoanProviderType;
};
