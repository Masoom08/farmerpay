const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class TrustQuestionChoice extends Model {
    static associate(models) {
      TrustQuestionChoice.belongsTo(models.TrustQuestion, { foreignKey: 'question_id', as: 'question' });
    }
  }
  TrustQuestionChoice.init({
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    question_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'trust_questions', key: 'id' } },
    choice_text: { type: DataTypes.STRING(200), allowNull: false },
    choice_value: { type: DataTypes.STRING(50), allowNull: true },
    choice_order: { type: DataTypes.INTEGER, defaultValue: 0 },
    points_awarded: { type: DataTypes.INTEGER, defaultValue: 0 },
    is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
  }, { sequelize, modelName: 'TrustQuestionChoice', tableName: 'trust_question_choices', timestamps: true, underscored: true });
  return TrustQuestionChoice;
};
