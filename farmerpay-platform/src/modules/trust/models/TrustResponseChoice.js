const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class TrustResponseChoice extends Model {
    static associate(models) {
      TrustResponseChoice.belongsTo(models.TrustResponse, { foreignKey: 'trust_response_id', as: 'response' });
      TrustResponseChoice.belongsTo(models.TrustQuestionChoice, { foreignKey: 'choice_id', as: 'choice' });
    }
  }
  TrustResponseChoice.init({
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    trust_response_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'trust_responses', key: 'id' } },
    choice_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'trust_question_choices', key: 'id' } },
    is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
  }, { sequelize, modelName: 'TrustResponseChoice', tableName: 'trust_response_choices', timestamps: true, underscored: true });
  return TrustResponseChoice;
};
