'use strict';
const { v4: uuidv4 } = require('uuid');

module.exports = {
  async up(queryInterface) {
    const now = new Date();
    await queryInterface.bulkInsert('trust_sections', [
      { section_uuid: uuidv4(), section_code: 'PERSONAL_PROFILE', section_name: 'Personal Profile', section_description: 'Basic identity, education, family details', section_order: 1, weight_in_total_score: 15.00, max_points: 150, is_active: true, created_at: now, updated_at: now },
      { section_uuid: uuidv4(), section_code: 'FARM_DETAILS', section_name: 'Farm Details & Land', section_description: 'Land ownership, size, crop history, irrigation', section_order: 2, weight_in_total_score: 20.00, max_points: 200, is_active: true, created_at: now, updated_at: now },
      { section_uuid: uuidv4(), section_code: 'FINANCIAL_LITERACY', section_name: 'Financial Literacy', section_description: 'Banking habits, savings, insurance awareness', section_order: 3, weight_in_total_score: 15.00, max_points: 150, is_active: true, created_at: now, updated_at: now },
      { section_uuid: uuidv4(), section_code: 'REPAYMENT_CAPACITY', section_name: 'Repayment Capacity', section_description: 'Income, expenses, existing loans, repayment track record', section_order: 4, weight_in_total_score: 25.00, max_points: 250, is_active: true, created_at: now, updated_at: now },
      { section_uuid: uuidv4(), section_code: 'COLLATERAL_ASSETS', section_name: 'Collateral & Assets', section_description: 'Land, equipment, livestock, stored produce', section_order: 5, weight_in_total_score: 15.00, max_points: 150, is_active: true, created_at: now, updated_at: now },
      { section_uuid: uuidv4(), section_code: 'NETWORK_REFERENCES', section_name: 'Network & References', section_description: 'FPO membership, cooperative ties, community standing', section_order: 6, weight_in_total_score: 10.00, max_points: 100, is_active: true, created_at: now, updated_at: now },
    ]);
  },
  async down(queryInterface) {
    await queryInterface.bulkDelete('trust_sections', null, {});
  },
};
