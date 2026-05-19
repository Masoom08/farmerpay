const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class TrustQuestionCondition extends Model {
    static associate(models) {
      TrustQuestionCondition.belongsTo(models.TrustQuestion, { foreignKey: 'question_id', as: 'question' });
    }
  }
  TrustQuestionCondition.init({
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    question_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'trust_questions', key: 'id' } },
    condition_type: { type: DataTypes.ENUM('equals', 'greater_than', 'less_than', 'between', 'contains'), allowNull: false },
    condition_value: { type: DataTypes.STRING(100), allowNull: true },
    resulting_points: { type: DataTypes.INTEGER, defaultValue: 0 },
    is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
  }, { sequelize, modelName: 'TrustQuestionCondition', tableName: 'trust_question_conditions', timestamps: true, underscored: true });
  return TrustQuestionCondition;
};
