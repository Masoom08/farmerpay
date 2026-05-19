/**
 * GoatFeedLog Model — Daily feed and grazing records for a herd.
 */
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class GoatFeedLog extends Model {
    static associate(models) {
      GoatFeedLog.belongsTo(models.GoatHerd, { foreignKey: 'herd_id', as: 'herd' });
    }
  }

  GoatFeedLog.init({
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    uuid: { type: DataTypes.STRING(36), allowNull: false, unique: true },
    herd_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'goat_herds', key: 'id' } },
    log_date: { type: DataTypes.DATEONLY, allowNull: false },
    feed_type: { type: DataTypes.ENUM('GRAZING', 'DRY_FODDER', 'GREEN_FODDER', 'CONCENTRATE', 'MINERAL_MIX', 'OTHER'), allowNull: false },
    quantity_kg: { type: DataTypes.DECIMAL(8, 2), allowNull: true },
    grazing_hours: { type: DataTypes.DECIMAL(4, 1), allowNull: true },
    cost: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
    notes: { type: DataTypes.TEXT, allowNull: true },
    is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
  }, {
    sequelize, modelName: 'GoatFeedLog', tableName: 'goat_feed_logs',
    timestamps: true, underscored: true,
    indexes: [{ fields: ['herd_id', 'log_date'] }],
  });

  return GoatFeedLog;
};
