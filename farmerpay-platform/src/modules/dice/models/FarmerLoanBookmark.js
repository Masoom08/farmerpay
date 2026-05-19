const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class FarmerLoanBookmark extends Model {
    static associate(models) {
      FarmerLoanBookmark.belongsTo(models.User, { foreignKey: 'farmer_id', as: 'farmer' });
      FarmerLoanBookmark.belongsTo(models.LoanProduct, { foreignKey: 'product_id', as: 'product' });
    }
  }
  FarmerLoanBookmark.init({
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    farmer_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'users', key: 'id' } },
    product_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'loan_products', key: 'id' } },
    bookmarked_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    bookmark_notes: { type: DataTypes.STRING(500), allowNull: true },
    is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
  }, { sequelize, modelName: 'FarmerLoanBookmark', tableName: 'farmer_loan_bookmarks', timestamps: true, underscored: true,
    indexes: [{ unique: true, fields: ['farmer_id', 'product_id'], name: 'idx_farmer_product_bookmark' }] });
  return FarmerLoanBookmark;
};
