/**
 * GoatPopTemplate Model — Package of Practices reference data for goat management.
 */
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class GoatPopTemplate extends Model {
    static associate(models) {
      // No associations — standalone reference table
    }
  }

  GoatPopTemplate.init({
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    uuid: { type: DataTypes.STRING(36), allowNull: false, unique: true },
    breed: { type: DataTypes.STRING(100), allowNull: false },
    sex: { type: DataTypes.ENUM('MALE', 'FEMALE'), allowNull: false },
    age_months_start: { type: DataTypes.INTEGER, allowNull: false },
    age_months_end: { type: DataTypes.INTEGER, allowNull: false },
    expected_weight_kg: { type: DataTypes.DECIMAL(6, 2), allowNull: true },
    daily_feed_requirement_kg: { type: DataTypes.DECIMAL(4, 2), allowNull: true },
    vaccination_schedule: { type: DataTypes.JSON, allowNull: true },
    deworming_interval_days: { type: DataTypes.INTEGER, allowNull: true },
    expected_kidding_rate: { type: DataTypes.DECIMAL(3, 2), allowNull: true },
    notes: { type: DataTypes.TEXT, allowNull: true },
    is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
  }, {
    sequelize, modelName: 'GoatPopTemplate', tableName: 'goat_pop_templates',
    timestamps: true, underscored: true,
    indexes: [{ fields: ['breed', 'sex', 'age_months_start'] }],
  });

  return GoatPopTemplate;
};
