const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class TrustSectionProgress extends Model {
    static associate(models) {
      TrustSectionProgress.belongsTo(models.User, { foreignKey: 'farmer_id', as: 'farmer' });
      TrustSectionProgress.belongsTo(models.TrustSection, { foreignKey: 'section_id', as: 'section' });
    }
  }
  TrustSectionProgress.init({
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    farmer_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'users', key: 'id' } },
    section_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'trust_sections', key: 'id' } },
    responses_collected: { type: DataTypes.INTEGER, defaultValue: 0 },
    questions_in_section: { type: DataTypes.INTEGER, defaultValue: 0 },
    section_start_timestamp: { type: DataTypes.DATE, allowNull: true },
    section_complete_timestamp: { type: DataTypes.DATE, allowNull: true },
    section_status: { type: DataTypes.ENUM('not_started', 'in_progress', 'completed'), defaultValue: 'not_started' },
    is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
  }, {
    sequelize, modelName: 'TrustSectionProgress', tableName: 'trust_section_progress',
    timestamps: true, underscored: true,
    indexes: [{ unique: true, fields: ['farmer_id', 'section_id'], name: 'idx_farmer_section_unique' }],
  });
  return TrustSectionProgress;
};
