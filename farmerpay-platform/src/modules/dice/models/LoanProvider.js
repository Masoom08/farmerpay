const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class LoanProvider extends Model {
    static associate(models) {
      LoanProvider.belongsTo(models.LoanProviderType, { foreignKey: 'provider_type_id', as: 'providerType' });
      LoanProvider.hasMany(models.LoanProduct, { foreignKey: 'provider_id', as: 'products' });
    }
  }
  LoanProvider.init({
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    provider_uuid: { type: DataTypes.STRING(36), allowNull: false, unique: true },
    provider_type_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'loan_provider_types', key: 'id' } },
    provider_name: { type: DataTypes.STRING(150), allowNull: false },
    provider_code: { type: DataTypes.STRING(50), allowNull: false, unique: true },
    primary_contact_name: { type: DataTypes.STRING(100), allowNull: true },
    primary_contact_phone: { type: DataTypes.STRING(13), allowNull: true },
    primary_contact_email: { type: DataTypes.STRING(120), allowNull: true },
    headquarters_state_id: { type: DataTypes.INTEGER, allowNull: true },
    is_rbi_regulated: { type: DataTypes.BOOLEAN, defaultValue: false },
    rbi_license_number: { type: DataTypes.STRING(50), allowNull: true },
    operates_in_states: { type: DataTypes.TEXT, allowNull: true, comment: 'Comma-separated state IDs' },
    service_radius_km: { type: DataTypes.INTEGER, allowNull: true },
    website_url: { type: DataTypes.STRING(255), allowNull: true },
    api_integration_status: { type: DataTypes.ENUM('none', 'api', 'csv_upload'), defaultValue: 'none' },
    is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
  }, { sequelize, modelName: 'LoanProvider', tableName: 'loan_providers', timestamps: true, underscored: true });
  return LoanProvider;
};
