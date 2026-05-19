const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class LoanSubcategory extends Model {
    static associate(models) { LoanSubcategory.belongsTo(models.LoanCategory, { foreignKey: 'category_id', as: 'category' }); }
  }
  LoanSubcategory.init({
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    category_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'loan_categories', key: 'id' } },
    subcategory_code: { type: DataTypes.STRING(50), allowNull: false },
    subcategory_name: { type: DataTypes.STRING(100), allowNull: false },
    is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
  }, { sequelize, modelName: 'LoanSubcategory', tableName: 'loan_subcategories', timestamps: true, underscored: true,
    indexes: [{ unique: true, fields: ['category_id', 'subcategory_code'], name: 'idx_cat_subcat_unique' }] });
  return LoanSubcategory;
};
