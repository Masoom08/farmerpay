/**
 * ChoiceRating Model
 * Farmer ratings and feedback for CRP/intermediaries.
 */

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class ChoiceRating extends Model {
    static associate(models) {
      ChoiceRating.belongsTo(models.ChoiceIntermediary, {
        foreignKey: 'choice_id',
        targetKey: 'choice_id',
        as: 'intermediary',
      });
      ChoiceRating.belongsTo(models.User, {
        foreignKey: 'farmer_id',
        as: 'farmer',
      });
    }
  }

  ChoiceRating.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      rating_id: {
        type: DataTypes.STRING(36),
        allowNull: false,
        unique: true,
      },
      choice_id: {
        type: DataTypes.STRING(36),
        allowNull: false,
      },
      farmer_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' },
      },
      rating_score: { type: DataTypes.INTEGER, allowNull: false },
      rating_feedback: { type: DataTypes.TEXT, allowNull: true },
      rated_on: { type: DataTypes.DATE, allowNull: true },
      is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
    },
    {
      sequelize,
      modelName: 'ChoiceRating',
      tableName: 'choice_ratings',
      timestamps: true,
      underscored: true,
      indexes: [
        { fields: ['rating_id'], unique: true },
        { fields: ['choice_id'] },
        { fields: ['farmer_id'] },
      ],
    }
  );

  return ChoiceRating;
};
