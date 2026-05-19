/**
 * TrustSection Model
 * Defines the scoring sections (Personal, Farm, Financial, Repayment, Collateral, Network).
 * TRUST v2 adds pillar_code (P1..P6) mapping.
 */
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class TrustSection extends Model {
    static associate(models) {
      TrustSection.hasMany(models.TrustQuestion, { foreignKey: 'section_id', as: 'questions' });
      TrustSection.hasMany(models.TrustSectionProgress, { foreignKey: 'section_id', as: 'progress' });
      TrustSection.hasMany(models.TrustScoreCalculation, { foreignKey: 'section_id', as: 'calculations' });
    }
  }
  TrustSection.init({
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    section_uuid: { type: DataTypes.STRING(36), allowNull: false, unique: true },
    section_code: { type: DataTypes.STRING(50), allowNull: false, unique: true },
    section_name: { type: DataTypes.STRING(100), allowNull: false },
    section_description: { type: DataTypes.TEXT, allowNull: true },
    section_order: { type: DataTypes.INTEGER, allowNull: false },
    weight_in_total_score: { type: DataTypes.DECIMAL(5, 2), allowNull: false, comment: 'Percentage weight (e.g. 25.00)' },
    max_points: { type: DataTypes.INTEGER, allowNull: false },
    // TRUST v2: pillar code mapping
    pillar_code: {
      type: DataTypes.ENUM('P1', 'P2', 'P3', 'P4', 'P5', 'P6'),
      allowNull: true,
      unique: true,
      comment: 'TRUST v2 pillar code (P1=Personal, P2=Farm, P3=Financial, P4=Repayment, P5=Collateral, P6=Network)',
    },
    is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
  }, {
    sequelize, modelName: 'TrustSection', tableName: 'trust_sections',
    timestamps: true, underscored: true,
  });
  return TrustSection;
};
