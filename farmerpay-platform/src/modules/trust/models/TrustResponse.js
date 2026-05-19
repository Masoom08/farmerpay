const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class TrustResponse extends Model {
    static associate(models) {
      TrustResponse.belongsTo(models.User, { foreignKey: 'farmer_id', as: 'farmer' });
      TrustResponse.belongsTo(models.TrustQuestion, { foreignKey: 'question_id', as: 'question' });
      TrustResponse.hasMany(models.TrustResponseChoice, { foreignKey: 'trust_response_id', as: 'choiceResponses' });
      TrustResponse.hasOne(models.TrustResponseNumeric, { foreignKey: 'trust_response_id', as: 'numericResponse' });
    }
  }
  TrustResponse.init({
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    response_uuid: { type: DataTypes.STRING(36), allowNull: false, unique: true },
    farmer_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'users', key: 'id' } },
    question_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'trust_questions', key: 'id' } },
    response_timestamp: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
  }, {
    sequelize, modelName: 'TrustResponse', tableName: 'trust_responses',
    timestamps: true, underscored: true,
    indexes: [
      { unique: true, fields: ['farmer_id', 'question_id'], name: 'idx_farmer_question_unique' },
      { fields: ['farmer_id'] },
    ],
  });
  return TrustResponse;
};
