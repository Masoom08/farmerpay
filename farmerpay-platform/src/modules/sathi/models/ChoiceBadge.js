/**
 * ChoiceBadge Model
 * Badges awarded to CRP/intermediaries for milestones and achievements.
 */

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class ChoiceBadge extends Model {
    static associate(models) {
      ChoiceBadge.belongsTo(models.ChoiceIntermediary, {
        foreignKey: 'choice_id',
        targetKey: 'choice_id',
        as: 'intermediary',
      });
    }
  }

  ChoiceBadge.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      badge_id: {
        type: DataTypes.STRING(36),
        allowNull: false,
        unique: true,
      },
      choice_id: {
        type: DataTypes.STRING(36),
        allowNull: false,
      },
      badge_name: { type: DataTypes.STRING(100), allowNull: false },
      badge_description: { type: DataTypes.TEXT, allowNull: true },
      badge_criteria: { type: DataTypes.JSON, allowNull: true },
      badge_awarded_at: { type: DataTypes.DATE, allowNull: true },
      badge_awarded_by: { type: DataTypes.INTEGER, allowNull: true },
      is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
    },
    {
      sequelize,
      modelName: 'ChoiceBadge',
      tableName: 'choice_badges',
      timestamps: true,
      underscored: true,
      indexes: [
        { fields: ['badge_id'], unique: true },
        { fields: ['choice_id'] },
      ],
    }
  );

  return ChoiceBadge;
};
