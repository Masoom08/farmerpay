const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class TrustScoreAppeal extends Model {
    static associate(models) {
      TrustScoreAppeal.belongsTo(models.User, { foreignKey: 'farmer_id', as: 'farmer' });
    }
  }
  TrustScoreAppeal.init({
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    appeal_uuid: { type: DataTypes.STRING(36), allowNull: false, unique: true },
    farmer_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'users', key: 'id' } },
    appeal_against_score: { type: DataTypes.INTEGER, allowNull: true },
    appeal_reason: { type: DataTypes.TEXT, allowNull: false },
    appeal_submitted_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    reviewed_by_admin: { type: DataTypes.INTEGER, allowNull: true },
    appeal_status: { type: DataTypes.ENUM('pending', 'approved', 'rejected', 'under_review'), defaultValue: 'pending' },
    appeal_decision_at: { type: DataTypes.DATE, allowNull: true },
    decision_notes: { type: DataTypes.TEXT, allowNull: true },
    is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
  }, { sequelize, modelName: 'TrustScoreAppeal', tableName: 'trust_score_appeals', timestamps: true, underscored: true });
  return TrustScoreAppeal;
};
