/**
 * SageFeedback Model
 * Farmer feedback on advisories: rating, helpfulness, action success.
 */

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class SageFeedback extends Model {
    static associate(models) {
      SageFeedback.belongsTo(models.SageAdvisory, { foreignKey: 'advisory_id', as: 'advisory' });
      SageFeedback.belongsTo(models.User, { foreignKey: 'farmer_id', as: 'farmer' });
    }
  }

  SageFeedback.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      feedback_uuid: { type: DataTypes.STRING(36), allowNull: false, unique: true },
      advisory_id: {
        type: DataTypes.INTEGER, allowNull: true,
        references: { model: 'sage_advisories', key: 'id' },
      },
      farmer_id: {
        type: DataTypes.INTEGER, allowNull: false,
        references: { model: 'users', key: 'id' },
      },
      feedback_rating: { type: DataTypes.INTEGER, allowNull: true },
      feedback_text: { type: DataTypes.TEXT, allowNull: true },
      feedback_date: { type: DataTypes.DATEONLY, allowNull: true },
      was_advice_helpful: { type: DataTypes.BOOLEAN, allowNull: true },
      did_action_succeed: { type: DataTypes.BOOLEAN, allowNull: true },
      is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
    },
    {
      sequelize, modelName: 'SageFeedback', tableName: 'sage_feedback',
      timestamps: true, underscored: true,
      indexes: [
        { fields: ['feedback_uuid'], unique: true },
        { fields: ['advisory_id'] },
        { fields: ['farmer_id'] },
      ],
    }
  );

  return SageFeedback;
};
