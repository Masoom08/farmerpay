/**
 * TrustDecision Model
 * Banker SANCTION / RECONSIDER / REJECT decisions.
 * Distinct from TrustScoreAppeal (farmer-initiated).
 */
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class TrustDecision extends Model {
    static associate(models) {
      TrustDecision.belongsTo(models.TrustScoreHistory, { foreignKey: 'score_history_id', as: 'scoreHistory' });
      TrustDecision.belongsTo(models.User, { foreignKey: 'banker_id', as: 'banker' });
    }
  }
  TrustDecision.init({
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    decision_uuid: { type: DataTypes.STRING(36), allowNull: false, unique: true },
    score_history_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'trust_score_history', key: 'id' } },
    banker_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'users', key: 'id' } },
    decision: { type: DataTypes.ENUM('SANCTION', 'RECONSIDER', 'REJECT'), allowNull: false },
    reason_code: {
      type: DataTypes.ENUM('BELOW_THRESHOLD', 'ADVERSE_CIBIL', 'FIELD_PENDING', 'POLICY_EXCEPTION', 'OTHER'),
      allowNull: true,
    },
    reason_text: { type: DataTypes.TEXT, allowNull: true },
    cibil_acknowledged: { type: DataTypes.BOOLEAN, defaultValue: false },
    decision_hash: {
      // SHA-256 over (decision_uuid|score_history_id|banker_id|decision|reason_code|reason_text|created_at).
      // Lets any downstream auditor verify the row hasn't been mutated
      // post-insert by a DB admin or compromised operator account.
      type: DataTypes.STRING(64), allowNull: true,
    },
  }, {
    sequelize, modelName: 'TrustDecision', tableName: 'trust_decisions',
    timestamps: true, underscored: true,
    updatedAt: false, // Decisions are immutable records
    indexes: [
      {
        fields: ['score_history_id', 'banker_id'],
        unique: true,
        name: 'uq_decision_snapshot_banker',
      },
    ],
  });
  return TrustDecision;
};
