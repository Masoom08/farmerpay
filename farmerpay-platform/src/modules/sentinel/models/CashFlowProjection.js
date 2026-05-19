/**
 * CashFlowProjection Model
 * Monthly cash flow projections: income vs expenses vs EMI obligation.
 */

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class CashFlowProjection extends Model {
    static associate(models) {
      CashFlowProjection.belongsTo(models.LoanApplication, {
        foreignKey: 'application_id',
        as: 'application',
      });
    }
  }

  CashFlowProjection.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      projection_uuid: { type: DataTypes.STRING(36), allowNull: false, unique: true },
      application_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'loan_applications', key: 'id' },
      },
      projection_month: { type: DataTypes.INTEGER, allowNull: false },
      projection_year: { type: DataTypes.INTEGER, allowNull: false },
      projected_income: { type: DataTypes.DECIMAL(15, 2), allowNull: true },
      projected_expenses: { type: DataTypes.DECIMAL(15, 2), allowNull: true },
      projected_emi_obligation: { type: DataTypes.DECIMAL(15, 2), allowNull: true },
      projected_surplus_deficit: { type: DataTypes.DECIMAL(15, 2), allowNull: true },
      cash_flow_health: {
        type: DataTypes.ENUM('strong', 'adequate', 'tight', 'critical'),
        allowNull: true,
      },
      is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
    },
    {
      sequelize,
      modelName: 'CashFlowProjection',
      tableName: 'cash_flow_projections',
      timestamps: true,
      underscored: true,
      indexes: [
        { fields: ['projection_uuid'], unique: true },
        { fields: ['application_id'] },
        { fields: ['projection_month', 'projection_year'] },
      ],
    }
  );

  return CashFlowProjection;
};
