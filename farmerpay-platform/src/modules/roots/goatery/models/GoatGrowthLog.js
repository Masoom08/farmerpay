/**
 * GoatGrowthLog Model — Weight and body condition tracking for individual animals.
 */
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class GoatGrowthLog extends Model {
    static associate(models) {
      GoatGrowthLog.belongsTo(models.GoatAnimal, { foreignKey: 'animal_id', as: 'animal' });
    }
  }

  GoatGrowthLog.init({
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    uuid: { type: DataTypes.STRING(36), allowNull: false, unique: true },
    animal_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'goat_animals', key: 'id' } },
    log_date: { type: DataTypes.DATEONLY, allowNull: false },
    weight_kg: { type: DataTypes.DECIMAL(6, 2), allowNull: true },
    body_condition_score: { type: DataTypes.INTEGER, allowNull: true, comment: 'Score from 1 to 5' },
    notes: { type: DataTypes.TEXT, allowNull: true },
    photo_url: { type: DataTypes.STRING(500), allowNull: true },
    is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
  }, {
    sequelize, modelName: 'GoatGrowthLog', tableName: 'goat_growth_logs',
    timestamps: true, underscored: true,
    indexes: [{ fields: ['animal_id', 'log_date'] }],
  });

  return GoatGrowthLog;
};
