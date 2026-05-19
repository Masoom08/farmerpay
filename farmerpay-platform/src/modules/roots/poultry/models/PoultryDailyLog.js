/**
 * PoultryDailyLog Model — Daily production and health metrics per flock.
 */
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class PoultryDailyLog extends Model {
    static associate(models) {
      PoultryDailyLog.belongsTo(models.PoultryFlock, { foreignKey: 'flock_id', as: 'flock' });
    }
  }

  PoultryDailyLog.init({
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    uuid: { type: DataTypes.STRING(36), allowNull: false, unique: true },
    flock_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'poultry_flocks', key: 'id' } },
    log_date: { type: DataTypes.DATEONLY, allowNull: false },
    mortality_count: { type: DataTypes.INTEGER, defaultValue: 0 },
    feed_consumed_kg: { type: DataTypes.DECIMAL(8, 2), allowNull: true },
    water_consumed_liters: { type: DataTypes.DECIMAL(8, 2), allowNull: true },
    egg_count: { type: DataTypes.INTEGER, allowNull: true },
    sample_weight_g: { type: DataTypes.INTEGER, allowNull: true },
    temperature_high: { type: DataTypes.DECIMAL(4, 1), allowNull: true },
    temperature_low: { type: DataTypes.DECIMAL(4, 1), allowNull: true },
    humidity_pct: { type: DataTypes.INTEGER, allowNull: true },
    disease_observed: { type: DataTypes.BOOLEAN, defaultValue: false },
    disease_notes: { type: DataTypes.TEXT, allowNull: true },
    photo_url: { type: DataTypes.STRING(500), allowNull: true },
    is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
  }, {
    sequelize, modelName: 'PoultryDailyLog', tableName: 'poultry_daily_logs',
    timestamps: true, underscored: true,
    indexes: [{ fields: ['flock_id', 'log_date'], unique: true }],
  });

  return PoultryDailyLog;
};
