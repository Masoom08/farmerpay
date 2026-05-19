const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class TrustTextInputScoringRange extends Model {
    static associate(models) {
      TrustTextInputScoringRange.belongsTo(models.TrustQuestion, { foreignKey: 'question_id', as: 'question' });
    }
  }
  TrustTextInputScoringRange.init({
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    question_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'trust_questions', key: 'id' } },
    input_min: { type: DataTypes.DECIMAL(15, 4), allowNull: true },
    input_max: { type: DataTypes.DECIMAL(15, 4), allowNull: true },
    points_awarded: { type: DataTypes.INTEGER, defaultValue: 0 },
    description: { type: DataTypes.STRING(200), allowNull: true },
    is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
  }, { sequelize, modelName: 'TrustTextInputScoringRange', tableName: 'trust_text_input_scoring_ranges', timestamps: true, underscored: true });
  return TrustTextInputScoringRange;
};
