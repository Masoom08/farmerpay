/**
 * PoultryFlock Model — Flock/batch register for poultry operations.
 */
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class PoultryFlock extends Model {
    static associate(models) {
      PoultryFlock.belongsTo(models.User, { foreignKey: 'farmer_id', as: 'farmer' });
      PoultryFlock.hasMany(models.PoultryDailyLog, { foreignKey: 'flock_id', as: 'dailyLogs' });
      PoultryFlock.hasMany(models.PoultryHealthEvent, { foreignKey: 'flock_id', as: 'healthEvents' });
      PoultryFlock.hasMany(models.PoultryCostEvent, { foreignKey: 'flock_id', as: 'costEvents' });
      PoultryFlock.hasMany(models.PoultryRevenueEvent, { foreignKey: 'flock_id', as: 'revenueEvents' });
      PoultryFlock.hasMany(models.PoultryBatchSummary, { foreignKey: 'flock_id', as: 'batchSummaries' });
    }
  }

  PoultryFlock.init({
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    uuid: { type: DataTypes.STRING(36), allowNull: false, unique: true },
    farmer_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'users', key: 'id' } },
    batch_name: { type: DataTypes.STRING(100), allowNull: false },
    bird_type: { type: DataTypes.ENUM('BROILER', 'LAYER', 'COUNTRY', 'DUCK', 'QUAIL'), allowNull: false },
    breed: { type: DataTypes.STRING(100), allowNull: true },
    placement_date: { type: DataTypes.DATEONLY, allowNull: false },
    initial_count: { type: DataTypes.INTEGER, allowNull: false },
    current_count: { type: DataTypes.INTEGER, allowNull: false },
    avg_initial_weight_g: { type: DataTypes.INTEGER, allowNull: true },
    status: { type: DataTypes.ENUM('ACTIVE', 'COMPLETED', 'TERMINATED'), defaultValue: 'ACTIVE' },
    completion_date: { type: DataTypes.DATEONLY, allowNull: true },
    shed_type: { type: DataTypes.STRING(50), allowNull: true },
    farm_register_id: { type: DataTypes.INTEGER, allowNull: true },
    notes: { type: DataTypes.TEXT, allowNull: true },
    is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
  }, {
    sequelize, modelName: 'PoultryFlock', tableName: 'poultry_flocks',
    timestamps: true, underscored: true,
    indexes: [{ fields: ['farmer_id', 'status'] }],
  });

  return PoultryFlock;
};
