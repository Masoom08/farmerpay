/**
 * PopWorkbandPestSusceptibility
 * Pest risk profile per crop growth stage. Engine matches the workband's
 * pest list against active regional pest alerts to fire stage-specific
 * pest advisories.
 */

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class PopWorkbandPestSusceptibility extends Model {
    static associate(models) {
      PopWorkbandPestSusceptibility.belongsTo(models.PopWorkband, { foreignKey: 'pop_workband_id', as: 'workband' });
    }
  }

  PopWorkbandPestSusceptibility.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      pop_workband_id: { type: DataTypes.INTEGER, allowNull: false },
      pest_code: { type: DataTypes.STRING(40), allowNull: false },
      pest_name_en: { type: DataTypes.STRING(120), allowNull: true },
      pest_name_hi: { type: DataTypes.STRING(120), allowNull: true },
      susceptibility_level: {
        type: DataTypes.ENUM('low', 'medium', 'high', 'very_high'),
        allowNull: false, defaultValue: 'medium',
      },
      triggered_when_regional_severity_at_least: {
        type: DataTypes.ENUM('low', 'medium', 'high'),
        allowNull: false, defaultValue: 'medium',
      },
      advisory_template_en: { type: DataTypes.TEXT, allowNull: true },
      advisory_template_hi: { type: DataTypes.TEXT, allowNull: true },
      recommended_action_en: { type: DataTypes.TEXT, allowNull: true },
      icon: { type: DataTypes.STRING(8), allowNull: true },
      is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    },
    {
      sequelize,
      modelName: 'PopWorkbandPestSusceptibility',
      tableName: 'pop_workband_pest_susceptibilities',
      timestamps: true,
      underscored: true,
      indexes: [{ fields: ['pop_workband_id', 'pest_code'] }],
    }
  );

  return PopWorkbandPestSusceptibility;
};
