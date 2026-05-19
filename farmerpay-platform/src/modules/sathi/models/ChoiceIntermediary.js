/**
 * ChoiceIntermediary Model
 * CRP/intermediary profiles with area of operation, performance, and rating tracking.
 */

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class ChoiceIntermediary extends Model {
    static associate(models) {
      ChoiceIntermediary.belongsTo(models.User, {
        foreignKey: 'intermediary_user_id',
        as: 'user',
      });
      ChoiceIntermediary.hasMany(models.ChoiceAssignment, {
        foreignKey: 'choice_id',
        sourceKey: 'choice_id',
        as: 'assignments',
      });
      ChoiceIntermediary.hasMany(models.ChoiceInteractionLog, {
        foreignKey: 'choice_id',
        sourceKey: 'choice_id',
        as: 'interactionLogs',
      });
      ChoiceIntermediary.hasMany(models.ChoiceRating, {
        foreignKey: 'choice_id',
        sourceKey: 'choice_id',
        as: 'ratings',
      });
      ChoiceIntermediary.hasMany(models.ChoiceBadge, {
        foreignKey: 'choice_id',
        sourceKey: 'choice_id',
        as: 'badges',
      });
      ChoiceIntermediary.hasMany(models.ChoicePerformanceKpi, {
        foreignKey: 'choice_id',
        sourceKey: 'choice_id',
        as: 'performanceKpis',
      });
    }
  }

  ChoiceIntermediary.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      choice_id: {
        type: DataTypes.STRING(36),
        allowNull: false,
        unique: true,
      },
      intermediary_user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' },
      },
      intermediary_name: { type: DataTypes.STRING(150), allowNull: false },
      intermediary_code: { type: DataTypes.STRING(50), allowNull: true },
      intermediary_phone: { type: DataTypes.STRING(13), allowNull: true },
      intermediary_address: { type: DataTypes.STRING(255), allowNull: true },
      intermediary_type: {
        type: DataTypes.ENUM('crp', 'field_agent', 'village_facilitator', 'cooperative_representative'),
        allowNull: false,
      },
      lgd_state_id: { type: DataTypes.INTEGER, allowNull: true },
      lgd_district_id: { type: DataTypes.INTEGER, allowNull: true },
      lgd_block_id: { type: DataTypes.INTEGER, allowNull: true },
      area_of_operation: { type: DataTypes.STRING(100), allowNull: true },
      farmers_managed: { type: DataTypes.INTEGER, allowNull: true, defaultValue: 0 },
      performance_rating: { type: DataTypes.DECIMAL(3, 1), allowNull: true },
      total_tasks_completed: { type: DataTypes.INTEGER, allowNull: true, defaultValue: 0 },
      is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
    },
    {
      sequelize,
      modelName: 'ChoiceIntermediary',
      tableName: 'choice_intermediaries',
      timestamps: true,
      underscored: true,
      indexes: [
        { fields: ['choice_id'], unique: true },
        { fields: ['intermediary_user_id'] },
        { fields: ['intermediary_type'] },
      ],
    }
  );

  return ChoiceIntermediary;
};
