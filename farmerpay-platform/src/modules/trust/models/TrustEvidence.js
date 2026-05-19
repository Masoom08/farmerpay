/**
 * TrustEvidence Model
 * External-source evidence rows (AA, CIBIL, ROOTS, POP, PMFBY).
 * For SATHI / FARMER_DECLARED / AGENT_VERIFIED, use trust_responses.
 */
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class TrustEvidence extends Model {
    static associate(models) {
      TrustEvidence.belongsTo(models.User, { foreignKey: 'farmer_id', as: 'farmer' });
      TrustEvidence.belongsTo(models.TrustScoreHistory, { foreignKey: 'score_history_id', as: 'scoreHistory' });
    }
  }
  TrustEvidence.init({
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    evidence_uuid: { type: DataTypes.STRING(36), allowNull: false, unique: true },
    farmer_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'users', key: 'id' } },
    score_history_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'trust_score_history', key: 'id' } },
    pillar_code: { type: DataTypes.ENUM('P1', 'P2', 'P3', 'P4', 'P5', 'P6'), allowNull: false },
    feature_code: { type: DataTypes.STRING(64), allowNull: false },
    band: { type: DataTypes.TINYINT, allowNull: false, comment: '1..5 band level' },
    band_label: { type: DataTypes.STRING(80), allowNull: true },
    source: {
      type: DataTypes.ENUM('AA', 'CIBIL', 'ROOTS', 'POP', 'PMFBY'),
      allowNull: false, comment: 'External source only',
    },
    fetched_at: { type: DataTypes.DATE, allowNull: false },
    raw_ref: { type: DataTypes.STRING(255), allowNull: true, comment: 'External system reference ID' },
    confidence: { type: DataTypes.ENUM('HIGH', 'MEDIUM', 'LOW'), defaultValue: 'HIGH' },
    is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
  }, {
    sequelize, modelName: 'TrustEvidence', tableName: 'trust_evidence',
    timestamps: true, underscored: true,
    indexes: [
      { fields: ['score_history_id'], name: 'idx_evidence_score_history' },
      { fields: ['farmer_id', 'source', 'fetched_at'], name: 'idx_evidence_farmer_source' },
    ],
  });
  return TrustEvidence;
};
