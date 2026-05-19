'use strict';
module.exports = {
  async up(queryInterface) {
    const now = new Date();
    await queryInterface.bulkInsert('loan_provider_types', [
      { provider_type_code: 'bank', provider_type_name: 'Bank', description: 'Commercial and nationalized banks', is_active: true, created_at: now, updated_at: now },
      { provider_type_code: 'microfinance', provider_type_name: 'Microfinance Institution', description: 'MFIs and NBFCs', is_active: true, created_at: now, updated_at: now },
      { provider_type_code: 'cooperative', provider_type_name: 'Cooperative Society', description: 'Agricultural cooperative banks', is_active: true, created_at: now, updated_at: now },
      { provider_type_code: 'government_scheme', provider_type_name: 'Government Scheme', description: 'Government-backed loan schemes (KCC, PM-KISAN)', is_active: true, created_at: now, updated_at: now },
      { provider_type_code: 'private_lender', provider_type_name: 'Private Lender', description: 'Registered private lending institutions', is_active: true, created_at: now, updated_at: now },
    ]);

    await queryInterface.bulkInsert('loan_categories', [
      { category_code: 'term_loan', category_name: 'Term Loan', category_order: 1, is_active: true, created_at: now, updated_at: now },
      { category_code: 'working_capital', category_name: 'Working Capital', category_order: 2, is_active: true, created_at: now, updated_at: now },
      { category_code: 'equipment_finance', category_name: 'Equipment Finance', category_order: 3, is_active: true, created_at: now, updated_at: now },
      { category_code: 'input_credit', category_name: 'Input Credit', category_order: 4, is_active: true, created_at: now, updated_at: now },
    ]);

    await queryInterface.bulkInsert('scale_of_finances', [
      { sof_code: 'marginal_farmers', sof_name: 'Marginal Farmers', min_land_size_hectares: 0, max_land_size_hectares: 1.0000, avg_investment_amount: 25000, recommended_loan_amount: 50000, is_active: true, created_at: now, updated_at: now },
      { sof_code: 'small_farmers', sof_name: 'Small Farmers', min_land_size_hectares: 1.0001, max_land_size_hectares: 2.0000, avg_investment_amount: 75000, recommended_loan_amount: 150000, is_active: true, created_at: now, updated_at: now },
      { sof_code: 'medium_farmers', sof_name: 'Medium Farmers', min_land_size_hectares: 2.0001, max_land_size_hectares: 10.0000, avg_investment_amount: 200000, recommended_loan_amount: 500000, is_active: true, created_at: now, updated_at: now },
      { sof_code: 'large_farmers', sof_name: 'Large Farmers', min_land_size_hectares: 10.0001, max_land_size_hectares: 9999.0000, avg_investment_amount: 500000, recommended_loan_amount: 1500000, is_active: true, created_at: now, updated_at: now },
    ]);
  },
  async down(queryInterface) {
    await queryInterface.bulkDelete('scale_of_finances', null, {});
    await queryInterface.bulkDelete('loan_categories', null, {});
    await queryInterface.bulkDelete('loan_provider_types', null, {});
  },
};
