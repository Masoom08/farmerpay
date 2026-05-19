/**
 * TrustQuestion Model
 * Questions within a scoring section with conditional logic and dependencies.
 */
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class TrustQuestion extends Model {
    static associate(models) {
      TrustQuestion.belongsTo(models.TrustSection, { foreignKey: 'section_id', as: 'section' });
      TrustQuestion.belongsTo(models.TrustQuestion, { foreignKey: 'depends_on_question_id', as: 'dependsOn' });
      TrustQuestion.hasMany(models.TrustQuestionChoice, { foreignKey: 'question_id', as: 'choices' });
      TrustQuestion.hasMany(models.TrustQuestionCondition, { foreignKey: 'question_id', as: 'conditions' });
      TrustQuestion.hasMany(models.TrustTextInputScoringRange, { foreignKey: 'question_id', as: 'scoringRanges' });
      TrustQuestion.hasMany(models.TrustResponse, { foreignKey: 'question_id', as: 'responses' });
    }
  }
  TrustQuestion.init({
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    question_uuid: { type: DataTypes.STRING(36), allowNull: false, unique: true },
    section_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'trust_sections', key: 'id' } },
    question_text: { type: DataTypes.STRING(500), allowNull: false },
    question_type: { type: DataTypes.ENUM('yes_no', 'numeric_input', 'multiple_choice', 'text_input'), allowNull: false },
    required_answer_type: { type: DataTypes.ENUM('boolean', 'number', 'choice', 'text'), allowNull: false },
    min_value: { type: DataTypes.INTEGER, allowNull: true },
    max_value: { type: DataTypes.INTEGER, allowNull: true },
    unit_of_measurement: { type: DataTypes.STRING(50), allowNull: true },
    conditional_logic: { type: DataTypes.JSON, allowNull: true, comment: 'Show/hide conditions based on previous answers' },
    depends_on_question_id: { type: DataTypes.INTEGER, allowNull: true, references: { model: 'trust_questions', key: 'id' } },
    is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
  }, {
    sequelize, modelName: 'TrustQuestion', tableName: 'trust_questions',
    timestamps: true, underscored: true,
    indexes: [{ fields: ['section_id'] }],
  });
  return TrustQuestion;
};
