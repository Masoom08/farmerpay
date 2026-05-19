/**
 * GoldLoanCollateral Model
 * Gold ornament/collateral details per loan: weight, purity, IBJA valuation,
 * ownership proof, 1kg pledge limit tracking per RBI Master Directions.
 */

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class GoldLoanCollateral extends Model {
    static associate(models) {
      GoldLoanCollateral.belongsTo(models.LoanApplication, { foreignKey: 'application_id', as: 'application' });
    }
  }

  GoldLoanCollateral.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      collateral_uuid: { type: DataTypes.STRING(36), allowNull: false, unique: true },
      application_id: {
        type: DataTypes.INTEGER, allowNull: false,
        references: { model: 'loan_applications', key: 'id' },
      },
      // Ornament details
      ornament_description: { type: DataTypes.STRING(200), allowNull: true },
      ornament_count: { type: DataTypes.INTEGER, allowNull: true },
      gross_weight_grams: { type: DataTypes.DECIMAL(10, 3), allowNull: false },
      net_weight_grams: { type: DataTypes.DECIMAL(10, 3), allowNull: true },
      purity_carat: { type: DataTypes.DECIMAL(4, 1), allowNull: true, defaultValue: 22.0 },
      stone_deduction_grams: { type: DataTypes.DECIMAL(10, 3), allowNull: true, defaultValue: 0 },

      // Valuation (per RBI: standardized 22-carat, lower of prev day close or 30-day avg)
      ibja_price_per_gram: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
      ibja_30day_avg_per_gram: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
      valuation_price_used: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
      total_gold_value: { type: DataTypes.DECIMAL(15, 2), allowNull: true },
      valuation_date: { type: DataTypes.DATEONLY, allowNull: true },
      appraiser_name: { type: DataTypes.STRING(100), allowNull: true },
      borrower_present_at_valuation: { type: DataTypes.BOOLEAN, defaultValue: true },

      // Ownership
      ownership_proof_type: {
        type: DataTypes.ENUM('purchase_receipt', 'family_declaration', 'affidavit', 'inheritance_doc', 'other'),
        allowNull: true,
      },
      ownership_proof_document_id: { type: DataTypes.INTEGER, allowNull: true },

      // 1kg aggregate limit (RBI mandate)
      aggregate_pledge_weight_grams: { type: DataTypes.DECIMAL(10, 3), allowNull: true },
      within_1kg_limit: { type: DataTypes.BOOLEAN, defaultValue: true },

      // LTV at sanction
      ltv_at_sanction_pct: { type: DataTypes.DECIMAL(5, 2), allowNull: true },
      applicable_ltv_cap_pct: { type: DataTypes.DECIMAL(5, 2), allowNull: true },
      ltv_compliant: { type: DataTypes.BOOLEAN, defaultValue: true },

      // Vault tracking
      vault_location: { type: DataTypes.STRING(100), allowNull: true },
      vault_packet_id: { type: DataTypes.STRING(50), allowNull: true },
      gold_returned_date: { type: DataTypes.DATEONLY, allowNull: true },
      gold_return_within_7days: { type: DataTypes.BOOLEAN, allowNull: true },

      is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
    },
    {
      sequelize, modelName: 'GoldLoanCollateral', tableName: 'gold_loan_collaterals',
      timestamps: true, underscored: true,
      indexes: [
        { fields: ['collateral_uuid'], unique: true },
        { fields: ['application_id'] },
        { fields: ['ltv_compliant'] },
      ],
    }
  );

  return GoldLoanCollateral;
};
