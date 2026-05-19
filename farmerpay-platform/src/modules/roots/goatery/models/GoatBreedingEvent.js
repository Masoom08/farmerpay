/**
 * GoatBreedingEvent Model — Breeding service, kidding, and reproduction tracking.
 */
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class GoatBreedingEvent extends Model {
    static associate(models) {
      GoatBreedingEvent.belongsTo(models.GoatAnimal, { foreignKey: 'doe_id', as: 'doe' });
    }
  }

  GoatBreedingEvent.init({
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    uuid: { type: DataTypes.STRING(36), allowNull: false, unique: true },
    doe_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'goat_animals', key: 'id' } },
    buck_id: { type: DataTypes.INTEGER, allowNull: true },
    service_date: { type: DataTypes.DATEONLY, allowNull: false },
    service_type: { type: DataTypes.ENUM('NATURAL', 'AI'), allowNull: false },
    expected_kidding_date: { type: DataTypes.DATEONLY, allowNull: true },
    actual_kidding_date: { type: DataTypes.DATEONLY, allowNull: true },
    kid_count: { type: DataTypes.INTEGER, allowNull: true },
    kid_details: { type: DataTypes.JSON, allowNull: true },
    complications: { type: DataTypes.TEXT, allowNull: true },
    cost: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
    status: { type: DataTypes.ENUM('SERVICED', 'CONFIRMED', 'KIDDED', 'FAILED'), defaultValue: 'SERVICED' },
    is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
  }, {
    sequelize, modelName: 'GoatBreedingEvent', tableName: 'goat_breeding_events',
    timestamps: true, underscored: true,
    indexes: [{ fields: ['doe_id', 'status'] }],
  });

  return GoatBreedingEvent;
};
