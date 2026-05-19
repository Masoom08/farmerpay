'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('farmer_borrowing_sources', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      borrowing_uuid: { type: Sequelize.STRING(36), allowNull: false, unique: true },
      farmer_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'users', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE' },
      source_category: { type: Sequelize.ENUM('formal', 'informal'), allowNull: false },
      source_type: { type: Sequelize.ENUM('public_sector_bank', 'private_bank', 'rrb', 'cooperative_bank', 'sfb', 'nbfc', 'pacs', 'fpo', 'shg', 'mfi', 'family_friends', 'money_lender', 'adathiya', 'input_seller_credit', 'landlord', 'other'), allowNull: false },
      source_name: { type: Sequelize.STRING(150), allowNull: true },
      bank_account_id: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'farmer_bank_accounts', key: 'id' } },
      branch_name: { type: Sequelize.STRING(100), allowNull: true },
      pacs_code: { type: Sequelize.STRING(30), allowNull: true },
      member_id: { type: Sequelize.STRING(50), allowNull: true },
      group_name: { type: Sequelize.STRING(100), allowNull: true },
      loan_type: { type: Sequelize.ENUM('kcc_crop', 'kcc_allied', 'kcc_consumption', 'crop_loan', 'dairy_loan', 'livestock_loan', 'fisheries_loan', 'horticulture_loan', 'animal_husbandry', 'farm_mechanization', 'irrigation', 'land_development', 'agri_processing', 'warehouse_receipt', 'input_loan', 'agri_infrastructure', 'agri_gold', 'kcc_gold', 'allied_gold', 'consumption_gold', 'gold_general', 'jlg', 'shg_group_loan', 'mudra_shishu', 'mudra_kishore', 'mudra_tarun', 'personal', 'other'), allowNull: true },
      scheme_name: { type: Sequelize.STRING(100), allowNull: true },
      sanction_amount: { type: Sequelize.DECIMAL(12, 2), allowNull: true },
      borrowed_amount: { type: Sequelize.DECIMAL(12, 2), allowNull: true },
      outstanding_amount: { type: Sequelize.DECIMAL(12, 2), allowNull: true },
      interest_rate_pct: { type: Sequelize.DECIMAL(5, 2), allowNull: true },
      interest_period: { type: Sequelize.ENUM('monthly', 'yearly', 'flat', 'none'), allowNull: true },
      repayment_type: { type: Sequelize.ENUM('emi', 'bullet', 'flexi'), allowNull: true },
      borrowed_date: { type: Sequelize.DATEONLY, allowNull: true },
      due_date: { type: Sequelize.DATEONLY, allowNull: true },
      lender_name: { type: Sequelize.STRING(100), allowNull: true },
      lender_mobile: { type: Sequelize.STRING(13), allowNull: true },
      collateral_type: { type: Sequelize.ENUM('none', 'harvest_promise', 'gold', 'land', 'crop_standing', 'other'), allowNull: true },
      gold_weight_grams: { type: Sequelize.DECIMAL(8, 2), allowNull: true },
      gold_purity_carat: { type: Sequelize.ENUM('24k', '22k', '20k', '18k'), allowNull: true },
      repayment_status: { type: Sequelize.ENUM('active', 'partially_paid', 'fully_paid', 'overdue', 'restructured'), defaultValue: 'active' },
      last_updated_by_farmer: { type: Sequelize.DATE, allowNull: true },
      is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP') },
    });
    await queryInterface.addIndex('farmer_borrowing_sources', ['farmer_id', 'source_category'], { name: 'idx_fbs_farmer_cat' });
    await queryInterface.addIndex('farmer_borrowing_sources', ['farmer_id', 'source_type'], { name: 'idx_fbs_farmer_type' });
    await queryInterface.addIndex('farmer_borrowing_sources', ['farmer_id', 'repayment_status'], { name: 'idx_fbs_farmer_status' });
  },
  async down(queryInterface) { await queryInterface.dropTable('farmer_borrowing_sources'); },
};
