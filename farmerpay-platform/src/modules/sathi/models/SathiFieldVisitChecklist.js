/**
 * SathiFieldVisitChecklist Model
 * Checklist items for field visit verifications. Links to verification via UUID.
 */

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class SathiFieldVisitChecklist extends Model {
    static associate(models) {
      SathiFieldVisitChecklist.belongsTo(models.SathiFieldVerification, {
        foreignKey: 'verification_uuid',
        targetKey: 'verification_uuid',
        as: 'verification',
      });
    }
  }

  SathiFieldVisitChecklist.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      visit_id: { type: DataTypes.INTEGER, allowNull: true },
      verification_uuid: {
        type: DataTypes.STRING(36),
        allowNull: false,
      },
      checklist_item_text: { type: DataTypes.STRING(255), allowNull: false },
      is_checked: { type: DataTypes.BOOLEAN, defaultValue: false },
      checked_at: { type: DataTypes.DATE, allowNull: true },
      is_required: { type: DataTypes.BOOLEAN, defaultValue: false },
      is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
    },
    {
      sequelize,
      modelName: 'SathiFieldVisitChecklist',
      tableName: 'sathi_field_visit_checklists',
      timestamps: true,
      underscored: true,
      indexes: [
        { fields: ['verification_uuid'] },
      ],
    }
  );

  return SathiFieldVisitChecklist;
};
