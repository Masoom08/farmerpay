/**
 * PoultryPopTemplate Model — Week-by-week performance benchmarks for poultry PoP.
 */
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class PoultryPopTemplate extends Model {
    static associate() {}
  }

  PoultryPopTemplate.init({
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    uuid: { type: DataTypes.STRING(36), allowNull: false, unique: true },
    bird_type: { type: DataTypes.ENUM('BROILER', 'LAYER'), allowNull: false },
    breed: { type: DataTypes.STRING(100), allowNull: true },
    week_number: { type: DataTypes.INTEGER, allowNull: false },
    expected_feed_g_per_bird: { type: DataTypes.INTEGER, allowNull: true },
    expected_weight_g: { type: DataTypes.INTEGER, allowNull: true },
    expected_egg_pct: { type: DataTypes.DECIMAL(5, 2), allowNull: true },
    expected_mortality_pct: { type: DataTypes.DECIMAL(5, 2), allowNull: true },
    vaccination_due: { type: DataTypes.STRING(200), allowNull: true },
    notes: { type: DataTypes.TEXT, allowNull: true },
    is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
  }, {
    sequelize, modelName: 'PoultryPopTemplate', tableName: 'poultry_pop_templates',
    timestamps: true, underscored: true,
    indexes: [{ fields: ['bird_type', 'week_number'] }],
  });

  return PoultryPopTemplate;
};
