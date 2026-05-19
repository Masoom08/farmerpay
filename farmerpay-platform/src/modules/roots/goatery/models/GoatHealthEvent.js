/**
 * GoatHealthEvent Model — Vaccination, deworming, disease, and treatment records.
 */
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class GoatHealthEvent extends Model {
    static associate(models) {
      GoatHealthEvent.belongsTo(models.GoatHerd, { foreignKey: 'herd_id', as: 'herd' });
      GoatHealthEvent.belongsTo(models.GoatAnimal, { foreignKey: 'animal_id', as: 'animal' });
    }
  }

  GoatHealthEvent.init({
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    uuid: { type: DataTypes.STRING(36), allowNull: false, unique: true },
    animal_id: { type: DataTypes.INTEGER, allowNull: true, references: { model: 'goat_animals', key: 'id' } },
    herd_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'goat_herds', key: 'id' } },
    event_date: { type: DataTypes.DATEONLY, allowNull: false },
    event_type: { type: DataTypes.ENUM('VACCINATION', 'DEWORMING', 'DISEASE', 'TREATMENT', 'INJURY'), allowNull: false },
    vaccine_name: { type: DataTypes.STRING(100), allowNull: true },
    disease_name: { type: DataTypes.STRING(100), allowNull: true },
    medicine_name: { type: DataTypes.STRING(100), allowNull: true },
    vet_name: { type: DataTypes.STRING(200), allowNull: true },
    cost: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
    animals_affected: { type: DataTypes.INTEGER, allowNull: true },
    notes: { type: DataTypes.TEXT, allowNull: true },
    is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
  }, {
    sequelize, modelName: 'GoatHealthEvent', tableName: 'goat_health_events',
    timestamps: true, underscored: true,
    indexes: [{ fields: ['herd_id', 'event_type'] }],
  });

  return GoatHealthEvent;
};
