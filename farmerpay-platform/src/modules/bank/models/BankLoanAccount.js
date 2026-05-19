/**
 * BankLoanAccount Model
 * Bank loan accounts imported from a Finacle CSV or from a bank-supplied
 * Excel workbook (the May 2026 pilot). Originally built for gold loans;
 * now also supports KCC / crop / dairy / horticulture / livestock /
 * fisheries / animal husbandry / JLG / SHG loan types.
 *
 * The pilot uses the `district`, `cohort_tag`, and scheme columns to
 * slice the weekly NPA reduction report by (bank, district, cohort).
 * `bank_name` itself lives on the parent `bank_portfolio_imports` row,
 * reached via the `import` association.
 */

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class BankLoanAccount extends Model {
    static associate(models) {
      BankLoanAccount.belongsTo(models.BankPortfolioImport, { foreignKey: 'import_id', as: 'import' });
      BankLoanAccount.belongsTo(models.LoanApplication, { foreignKey: 'linked_application_id', as: 'application' });
      BankLoanAccount.belongsTo(models.User, { foreignKey: 'linked_farmer_id', as: 'farmer' });
      // Fix: bankPortfolioService.getLoanAccountDetail() eager-loads
      // `dataEntries` but the hasMany was never wired. Without this the
      // detail endpoint returns a 500 with SequelizeEagerLoadingError.
      BankLoanAccount.hasMany(models.BankDataEntry, { foreignKey: 'loan_account_id', as: 'dataEntries' });
    }
  }

  BankLoanAccount.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      account_uuid: { type: DataTypes.STRING(36), allowNull: false, unique: true },
      import_id: {
        type: DataTypes.INTEGER, allowNull: true,
        references: { model: 'bank_portfolio_imports', key: 'id' },
      },
      // Finacle fields
      finacle_account_number: { type: DataTypes.STRING(20), allowNull: false },
      finacle_cif_id: { type: DataTypes.STRING(20), allowNull: true },
      sol_id: { type: DataTypes.STRING(10), allowNull: true },
      borrower_name: { type: DataTypes.STRING(150), allowNull: true },
      borrower_pan: { type: DataTypes.STRING(10), allowNull: true },
      borrower_mobile: { type: DataTypes.STRING(13), allowNull: true },
      borrower_aadhaar_last4: { type: DataTypes.STRING(4), allowNull: true },

      // Loan details — enum covers Finacle gold-loan codes AND the pilot
      // non-gold codes (KCC / crop / dairy / horti / livestock etc)
      loan_type: {
        type: DataTypes.ENUM(
          'agri_gold', 'consumption_gold', 'kcc_gold', 'allied_gold',
          'kcc', 'crop_loan', 'dairy_loan', 'livestock_loan',
          'horticulture_loan', 'fisheries_loan', 'animal_husbandry_loan',
          'input_loan', 'jlg', 'shg'
        ),
        allowNull: true,
      },
      scheme_name: { type: DataTypes.STRING(100), allowNull: true },
      scheme_code: { type: DataTypes.STRING(50), allowNull: true },
      sanction_amount: { type: DataTypes.DECIMAL(15, 2), allowNull: true },
      sanction_date: { type: DataTypes.DATEONLY, allowNull: true },
      interest_rate: { type: DataTypes.DECIMAL(5, 3), allowNull: true },
      maturity_date: { type: DataTypes.DATEONLY, allowNull: true },
      repayment_type: { type: DataTypes.ENUM('emi', 'bullet'), allowNull: true },
      outstanding_amount: { type: DataTypes.DECIMAL(15, 2), allowNull: true },
      overdue_amount: { type: DataTypes.DECIMAL(15, 2), allowNull: true },
      days_past_due: { type: DataTypes.INTEGER, allowNull: true, defaultValue: 0 },

      // Gold collateral (from Finacle extract)
      gold_weight_grams: { type: DataTypes.DECIMAL(10, 3), allowNull: true },
      gold_purity_carat: { type: DataTypes.DECIMAL(4, 1), allowNull: true },
      gold_valuation_amount: { type: DataTypes.DECIMAL(15, 2), allowNull: true },
      gold_valuation_date: { type: DataTypes.DATEONLY, allowNull: true },
      ltv_at_sanction: { type: DataTypes.DECIMAL(5, 2), allowNull: true },

      // SMA/NPA from CBS
      sma_classification: {
        type: DataTypes.ENUM('standard', 'sma_0', 'sma_1', 'sma_2', 'npa'),
        defaultValue: 'standard',
      },
      psl_category: { type: DataTypes.STRING(50), allowNull: true },

      // Disbursement mode
      disbursement_mode: {
        type: DataTypes.ENUM('bank_transfer', 'upi', 'cheque', 'cash'), allowNull: true,
      },
      cash_disbursement_amount: { type: DataTypes.DECIMAL(15, 2), allowNull: true },

      // FarmerPay linkage
      linked_application_id: { type: DataTypes.INTEGER, allowNull: true },
      linked_farmer_id: { type: DataTypes.INTEGER, allowNull: true },
      linkage_status: {
        type: DataTypes.ENUM('unlinked', 'auto_matched', 'manually_linked', 'confirmed'),
        defaultValue: 'unlinked',
      },

      // Pilot geography + cohort — set from the Excel upload
      district: { type: DataTypes.STRING(100), allowNull: true },
      lgd_district_code: { type: DataTypes.STRING(10), allowNull: true },
      cohort_tag: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: 'unassigned',
      },
      cohort_assigned_at: { type: DataTypes.DATE, allowNull: true },

      // Data freshness
      data_as_of_date: { type: DataTypes.DATEONLY, allowNull: true },
      is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
    },
    {
      sequelize, modelName: 'BankLoanAccount', tableName: 'bank_loan_accounts',
      timestamps: true, underscored: true,
      indexes: [
        { fields: ['account_uuid'], unique: true },
        { fields: ['finacle_account_number'] },
        { fields: ['finacle_cif_id'] },
        { fields: ['borrower_pan'] },
        { fields: ['borrower_mobile'] },
        { fields: ['sma_classification'] },
        { fields: ['linkage_status'] },
        { fields: ['import_id'] },
        // Pilot composite indexes (see migration 20260415000001)
        { name: 'idx_bla_district_cohort_sma', fields: ['district', 'cohort_tag', 'sma_classification'] },
        { name: 'idx_bla_cohort_sma', fields: ['cohort_tag', 'sma_classification'] },
      ],
    }
  );

  return BankLoanAccount;
};
