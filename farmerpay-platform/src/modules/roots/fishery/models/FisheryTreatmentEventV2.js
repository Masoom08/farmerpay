/**
 * FisheryTreatmentEventV2 Model
 * Pond disease/health treatment (analogous to dairy vet treatment).
 * Service layer auto-creates a HEALTH_TREATMENT cost event on save.
 */

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class FisheryTreatmentEventV2 extends Model {
    static associate(models) {
      FisheryTreatmentEventV2.belongsTo(models.User, { foreignKey: 'farmer_id', as: 'farmer' });
    }
  }

  FisheryTreatmentEventV2.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      event_uuid: { type: DataTypes.STRING(36), allowNull: false, unique: true },
      farmer_id: { type: DataTypes.INTEGER, allowNull: false },
      pond_id: { type: DataTypes.STRING(36), allowNull: true },
      treatment_date: { type: DataTypes.DATEONLY, allowNull: false },
      condition: { type: DataTypes.STRING(200), allowNull: true },
      treatment_type: {
        type: DataTypes.ENUM(
          'DISEASE_TREATMENT', 'PROPHYLACTIC', 'WATER_TREATMENT',
          'PROBIOTIC', 'ANTIBIOTIC', 'PARASITE', 'NUTRITIONAL', 'OTHER',
        ),
        allowNull: false,
        defaultValue: 'OTHER',
      },
      affected_species: { type: DataTypes.STRING(80), allowNull: true },
      mortality_before_pct: { type: DataTypes.DECIMAL(5, 2), allowNull: true },
      mortality_after_pct: { type: DataTypes.DECIMAL(5, 2), allowNull: true },
      vet_name: { type: DataTypes.STRING(120), allowNull: true },
      vet_type: {
        type: DataTypes.ENUM('GOVT', 'PRIVATE', 'PARAVET', 'SELF'),
        allowNull: true,
      },
      medicine_cost: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
      vet_fee: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
      other_cost: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
      cost_formal: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
      cost_informal: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
      payment_mode: {
        type: DataTypes.ENUM('CASH', 'UPI', 'BANK', 'CREDIT', 'NONE'),
        allowNull: true,
      },
      outcome: {
        type: DataTypes.ENUM('RECOVERED', 'IMPROVING', 'NO_CHANGE', 'WORSENED', 'TOTAL_LOSS'),
        allowNull: true,
      },
      notes: { type: DataTypes.TEXT, allowNull: true },
      cost_event_uuid: { type: DataTypes.STRING(36), allowNull: true },
    },
    {
      sequelize,
      modelName: 'FisheryTreatmentEventV2',
      tableName: 'fishery_treatment_events',
      timestamps: true,
      underscored: true,
    },
  );

  return FisheryTreatmentEventV2;
};
