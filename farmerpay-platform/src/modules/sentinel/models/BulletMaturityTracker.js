/**
 * BulletMaturityTracker Model
 * Tracks bullet/balloon payment maturity dates and collection probability.
 */

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class BulletMaturityTracker extends Model {
    static associate(models) {
      BulletMaturityTracker.belongsTo(models.LoanApplication, {
        foreignKey: 'application_id',
        as: 'application',
      });
    }
  }

  BulletMaturityTracker.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      tracker_uuid: { type: DataTypes.STRING(36), allowNull: false, unique: true },
      application_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'loan_applications', key: 'id' },
      },
      bullet_maturity_date: { type: DataTypes.DATEONLY, allowNull: false },
      bullet_amount: { type: DataTypes.DECIMAL(15, 2), allowNull: false },
      days_until_maturity: { type: DataTypes.INTEGER, allowNull: true },
      collection_probability_percent: { type: DataTypes.INTEGER, allowNull: true },
      contingency_plan_in_place: { type: DataTypes.BOOLEAN, defaultValue: false },
      contingency_plan_text: { type: DataTypes.TEXT, allowNull: true },
      is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
    },
    {
      sequelize,
      modelName: 'BulletMaturityTracker',
      tableName: 'bullet_maturity_trackers',
      timestamps: true,
      underscored: true,
      indexes: [
        { fields: ['tracker_uuid'], unique: true },
        { fields: ['application_id'] },
        { fields: ['bullet_maturity_date'] },
      ],
    }
  );

  return BulletMaturityTracker;
};
