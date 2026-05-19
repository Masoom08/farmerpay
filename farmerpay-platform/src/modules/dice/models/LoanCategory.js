const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class LoanCategory extends Model {
    static associate(models) {
      LoanCategory.hasMany(models.LoanSubcategory, { foreignKey: 'category_id', as: 'subcategories' });
      LoanCategory.hasMany(models.LoanProduct, { foreignKey: 'category_id', as: 'products' });
    }
  }
  LoanCategory.init({
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    category_code: { type: DataTypes.STRING(50), allowNull: false, unique: true },
    category_name: { type: DataTypes.STRING(100), allowNull: false },
    category_order: { type: DataTypes.INTEGER, defaultValue: 0 },
    is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
  }, { sequelize, modelName: 'LoanCategory', tableName: 'loan_categories', timestamps: true, underscored: true });
  return LoanCategory;
};
