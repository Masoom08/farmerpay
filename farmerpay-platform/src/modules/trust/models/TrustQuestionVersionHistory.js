const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class TrustQuestionVersionHistory extends Model {
    static associate(models) {
      TrustQuestionVersionHistory.belongsTo(models.TrustQuestion, { foreignKey: 'question_id', as: 'question' });
    }
  }
  TrustQuestionVersionHistory.init({
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    question_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'trust_questions', key: 'id' } },
    version_number: { type: DataTypes.INTEGER, allowNull: false },
    question_text_old: { type: DataTypes.STRING(500), allowNull: true },
    question_text_new: { type: DataTypes.STRING(500), allowNull: true },
    changed_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    changed_by: { type: DataTypes.INTEGER, allowNull: true },
    change_reason: { type: DataTypes.TEXT, allowNull: true },
    is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
  }, { sequelize, modelName: 'TrustQuestionVersionHistory', tableName: 'trust_question_version_history', timestamps: true, underscored: true });
  return TrustQuestionVersionHistory;
};
