/**
 * GoatHerd Model — Herd register for goatery operations.
 */
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class GoatHerd extends Model {
    static associate(models) {
      GoatHerd.belongsTo(models.User, { foreignKey: 'farmer_id', as: 'farmer' });
      GoatHerd.hasMany(models.GoatAnimal, { foreignKey: 'herd_id', as: 'animals' });
      GoatHerd.hasMany(models.GoatHealthEvent, { foreignKey: 'herd_id', as: 'healthEvents' });
      GoatHerd.hasMany(models.GoatFeedLog, { foreignKey: 'herd_id', as: 'feedLogs' });
      GoatHerd.hasMany(models.GoatCostEvent, { foreignKey: 'herd_id', as: 'costEvents' });
      GoatHerd.hasMany(models.GoatRevenueEvent, { foreignKey: 'herd_id', as: 'revenueEvents' });
    }
  }

  GoatHerd.init({
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    uuid: { type: DataTypes.STRING(36), allowNull: false, unique: true },
    farmer_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'users', key: 'id' } },
    herd_name: { type: DataTypes.STRING(100), allowNull: false },
    herd_type: { type: DataTypes.ENUM('STALL_FED', 'GRAZING', 'MIXED'), allowNull: false },
    primary_breed: { type: DataTypes.STRING(100), allowNull: true },
    location_village: { type: DataTypes.STRING(200), allowNull: true },
    farm_register_id: { type: DataTypes.INTEGER, allowNull: true },
    total_animals: { type: DataTypes.INTEGER, defaultValue: 0 },
    status: { type: DataTypes.ENUM('ACTIVE', 'INACTIVE'), defaultValue: 'ACTIVE' },
    is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
  }, {
    sequelize, modelName: 'GoatHerd', tableName: 'goat_herds',
    timestamps: true, underscored: true,
    indexes: [{ fields: ['farmer_id', 'status'] }],
  });

  return GoatHerd;
};
