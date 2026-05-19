const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class TrustResponseNumeric extends Model {
    static associate(models) {
      TrustResponseNumeric.belongsTo(models.TrustResponse, { foreignKey: 'trust_response_id', as: 'response' });
    }
  }
  TrustResponseNumeric.init({
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    trust_response_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'trust_responses', key: 'id' } },
    numeric_value: { type: DataTypes.DECIMAL(15, 4), allowNull: false },
    is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
  }, { sequelize, modelName: 'TrustResponseNumeric', tableName: 'trust_response_numeric', timestamps: true, underscored: true });
  return TrustResponseNumeric;
};
