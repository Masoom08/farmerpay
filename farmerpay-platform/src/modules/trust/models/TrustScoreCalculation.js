const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class TrustScoreCalculation extends Model {
    static associate(models) {
      TrustScoreCalculation.belongsTo(models.User, { foreignKey: 'farmer_id', as: 'farmer' });
      TrustScoreCalculation.belongsTo(models.TrustSection, { foreignKey: 'section_id', as: 'section' });
    }
  }
  TrustScoreCalculation.init({
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    calculation_uuid: { type: DataTypes.STRING(36), allowNull: false, unique: true },
    farmer_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'users', key: 'id' } },
    section_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'trust_sections', key: 'id' } },
    raw_points: { type: DataTypes.INTEGER, defaultValue: 0 },
    max_possible_points: { type: DataTypes.INTEGER, defaultValue: 0 },
    normalized_score: { type: DataTypes.INTEGER, defaultValue: 0, comment: '0-100 scale' },
    contribution_to_total: { type: DataTypes.DECIMAL(5, 2), defaultValue: 0, comment: 'Weighted contribution to total score' },
    calculated_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    calculation_basis: { type: DataTypes.STRING(200), allowNull: true },
    is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
  }, {
    sequelize, modelName: 'TrustScoreCalculation', tableName: 'trust_score_calculations',
    timestamps: true, underscored: true,
    indexes: [{ fields: ['farmer_id', 'calculated_at'] }],
  });
  return TrustScoreCalculation;
};
