/**
 * ChoicePerformanceKpi Model
 * Monthly KPI tracking for CRP/intermediaries: completion rate, quality, satisfaction.
 */

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class ChoicePerformanceKpi extends Model {
    static associate(models) {
      ChoicePerformanceKpi.belongsTo(models.ChoiceIntermediary, {
        foreignKey: 'choice_id',
        targetKey: 'choice_id',
        as: 'intermediary',
      });
    }
  }

  ChoicePerformanceKpi.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      kpi_id: {
        type: DataTypes.STRING(36),
        allowNull: false,
        unique: true,
      },
      choice_id: {
        type: DataTypes.STRING(36),
        allowNull: false,
      },
      kpi_month: { type: DataTypes.INTEGER, allowNull: false },
      kpi_year: { type: DataTypes.INTEGER, allowNull: false },
      tasks_assigned: { type: DataTypes.INTEGER, allowNull: true, defaultValue: 0 },
      tasks_completed: { type: DataTypes.INTEGER, allowNull: true, defaultValue: 0 },
      tasks_rejected: { type: DataTypes.INTEGER, allowNull: true, defaultValue: 0 },
      completion_rate_percent: { type: DataTypes.DECIMAL(5, 2), allowNull: true },
      average_task_duration_hours: { type: DataTypes.INTEGER, allowNull: true },
      quality_rating: { type: DataTypes.DECIMAL(3, 1), allowNull: true },
      farmers_satisfaction_score: { type: DataTypes.DECIMAL(3, 1), allowNull: true },
      is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
    },
    {
      sequelize,
      modelName: 'ChoicePerformanceKpi',
      tableName: 'choice_performance_kpis',
      timestamps: true,
      underscored: true,
      indexes: [
        { fields: ['kpi_id'], unique: true },
        { fields: ['choice_id'] },
        { fields: ['kpi_month', 'kpi_year'] },
      ],
    }
  );

  return ChoicePerformanceKpi;
};
