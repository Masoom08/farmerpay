/**
 * FieldVisitLog Model
 * Records field visits by intermediaries to farmers.
 */

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class FieldVisitLog extends Model {
    static associate(models) {
      FieldVisitLog.belongsTo(models.Intermediary, {
        foreignKey: 'intermediary_id',
        as: 'intermediary',
      });
      FieldVisitLog.belongsTo(models.User, {
        foreignKey: 'farmer_id',
        as: 'farmer',
      });
    }
  }

  FieldVisitLog.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      visit_uuid: { type: DataTypes.STRING(36), allowNull: false, unique: true },
      intermediary_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'intermediaries', key: 'id' },
      },
      farmer_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' },
      },
      visit_date: { type: DataTypes.DATEONLY, allowNull: false },
      visit_type: {
        type: DataTypes.ENUM('onboarding', 'monitoring', 'collection', 'advisory', 'verification'),
        allowNull: false,
      },
      notes: { type: DataTypes.TEXT, allowNull: true },
      gps_latitude: { type: DataTypes.DECIMAL(10, 8), allowNull: true },
      gps_longitude: { type: DataTypes.DECIMAL(11, 8), allowNull: true },
      photo_count: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      visit_duration_minutes: { type: DataTypes.INTEGER, allowNull: true },
      farmer_signed_off: { type: DataTypes.BOOLEAN, defaultValue: false },
      is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
    },
    {
      sequelize,
      modelName: 'FieldVisitLog',
      tableName: 'field_visit_logs',
      timestamps: true,
      underscored: true,
      indexes: [
        { fields: ['visit_uuid'], unique: true },
        { fields: ['intermediary_id'] },
        { fields: ['farmer_id'] },
        { fields: ['visit_date'] },
      ],
    }
  );

  return FieldVisitLog;
};
