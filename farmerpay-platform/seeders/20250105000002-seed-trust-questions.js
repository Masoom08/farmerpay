'use strict';

/**
 * Seed Trust Questions & Choices
 *
 * 60 questions across 6 sections with point-bearing choices.
 * Section IDs are assumed to be 1–6 matching the order in
 * 20250105000001-seed-trust-sections.js.
 *
 * UUID format: TQ-001 … TQ-060
 */

module.exports = {
  async up(queryInterface) {
    const now = new Date();

    // ── Helper: look up section IDs by code ──
    const [sectionRows] = await queryInterface.sequelize.query(
      `SELECT id, section_code FROM trust_sections WHERE section_code IN (
        'PERSONAL_PROFILE', 'FARM_DETAILS', 'FINANCIAL_LITERACY',
        'REPAYMENT_CAPACITY', 'COLLATERAL_ASSETS', 'NETWORK_REFERENCES'
      )`
    );
    const sec = {};
    sectionRows.forEach((r) => { sec[r.section_code] = r.id; });

    // ────────────────────────────────────────────────────────────────
    // Questions definition
    // ────────────────────────────────────────────────────────────────
    const questions = [
      // ── SECTION 1: PERSONAL_PROFILE (10 questions) ──────────────
      { uuid: 'TQ-001', section: 'PERSONAL_PROFILE', text: 'What is your age group?', type: 'multiple_choice', answerType: 'choice', choices: [
        { text: '18-25', value: '18-25', order: 1, points: 15 },
        { text: '26-40', value: '26-40', order: 2, points: 25 },
        { text: '41-55', value: '41-55', order: 3, points: 20 },
        { text: '56+', value: '56+', order: 4, points: 10 },
      ]},
      { uuid: 'TQ-002', section: 'PERSONAL_PROFILE', text: 'What is your education level?', type: 'multiple_choice', answerType: 'choice', choices: [
        { text: 'No formal education', value: 'no_formal', order: 1, points: 5 },
        { text: 'Primary school', value: 'primary', order: 2, points: 10 },
        { text: 'Secondary school', value: 'secondary', order: 3, points: 15 },
        { text: 'Graduate or above', value: 'graduate_plus', order: 4, points: 20 },
      ]},
      { uuid: 'TQ-003', section: 'PERSONAL_PROFILE', text: 'How many family members?', type: 'numeric_input', answerType: 'number', min: 1, max: 20, unit: 'persons' },
      { uuid: 'TQ-004', section: 'PERSONAL_PROFILE', text: 'How many earning members in family?', type: 'numeric_input', answerType: 'number', min: 0, max: 15, unit: 'persons' },
      { uuid: 'TQ-005', section: 'PERSONAL_PROFILE', text: 'Is your family farming for how many years?', type: 'multiple_choice', answerType: 'choice', choices: [
        { text: 'Less than 5 years', value: 'lt_5', order: 1, points: 5 },
        { text: '5-15 years', value: '5_15', order: 2, points: 15 },
        { text: '15-30 years', value: '15_30', order: 3, points: 20 },
        { text: 'More than 30 years', value: 'gt_30', order: 4, points: 25 },
      ]},
      { uuid: 'TQ-006', section: 'PERSONAL_PROFILE', text: 'Do you have Aadhaar card?', type: 'yes_no', answerType: 'boolean', choices: [
        { text: 'Yes', value: 'yes', order: 1, points: 15 },
        { text: 'No', value: 'no', order: 2, points: 0 },
      ]},
      { uuid: 'TQ-007', section: 'PERSONAL_PROFILE', text: 'Do you have ration card (BPL/APL)?', type: 'yes_no', answerType: 'boolean', choices: [
        { text: 'Yes', value: 'yes', order: 1, points: 10 },
        { text: 'No', value: 'no', order: 2, points: 0 },
      ]},
      { uuid: 'TQ-008', section: 'PERSONAL_PROFILE', text: 'Are you a woman farmer?', type: 'yes_no', answerType: 'boolean', choices: [
        { text: 'Yes', value: 'yes', order: 1, points: 10 },
        { text: 'No', value: 'no', order: 2, points: 5 },
      ]},
      { uuid: 'TQ-009', section: 'PERSONAL_PROFILE', text: 'Do you belong to SC/ST/OBC?', type: 'multiple_choice', answerType: 'choice', choices: [
        { text: 'General', value: 'general', order: 1, points: 5 },
        { text: 'OBC', value: 'obc', order: 2, points: 8 },
        { text: 'SC/ST', value: 'sc_st', order: 3, points: 10 },
      ]},
      { uuid: 'TQ-010', section: 'PERSONAL_PROFILE', text: 'Marital status?', type: 'multiple_choice', answerType: 'choice', choices: [
        { text: 'Married', value: 'married', order: 1, points: 10 },
        { text: 'Single', value: 'single', order: 2, points: 5 },
        { text: 'Widowed', value: 'widowed', order: 3, points: 8 },
      ]},

      // ── SECTION 2: FARM_DETAILS (12 questions) ──────────────────
      { uuid: 'TQ-011', section: 'FARM_DETAILS', text: 'Total land holding (acres)?', type: 'numeric_input', answerType: 'number', min: 0, max: 500, unit: 'acres' },
      { uuid: 'TQ-012', section: 'FARM_DETAILS', text: 'Land ownership type?', type: 'multiple_choice', answerType: 'choice', choices: [
        { text: 'Owned', value: 'owned', order: 1, points: 30 },
        { text: 'Leased', value: 'leased', order: 2, points: 15 },
        { text: 'Shared / Joint', value: 'shared', order: 3, points: 10 },
        { text: 'Landless', value: 'landless', order: 4, points: 0 },
      ]},
      { uuid: 'TQ-013', section: 'FARM_DETAILS', text: 'Do you have land title deed (patta)?', type: 'yes_no', answerType: 'boolean', choices: [
        { text: 'Yes', value: 'yes', order: 1, points: 20 },
        { text: 'No', value: 'no', order: 2, points: 0 },
      ]},
      { uuid: 'TQ-014', section: 'FARM_DETAILS', text: 'Irrigated area (%)?', type: 'multiple_choice', answerType: 'choice', choices: [
        { text: '100%', value: '100', order: 1, points: 25 },
        { text: '50-99%', value: '50_99', order: 2, points: 20 },
        { text: '25-49%', value: '25_49', order: 3, points: 10 },
        { text: 'Less than 25% / Rainfed', value: 'lt_25', order: 4, points: 5 },
      ]},
      { uuid: 'TQ-015', section: 'FARM_DETAILS', text: 'Primary crop type?', type: 'multiple_choice', answerType: 'choice', choices: [
        { text: 'Food grain', value: 'food_grain', order: 1, points: 15 },
        { text: 'Cash crop', value: 'cash_crop', order: 2, points: 20 },
        { text: 'Vegetables', value: 'vegetables', order: 3, points: 15 },
        { text: 'Horticulture', value: 'horticulture', order: 4, points: 20 },
      ]},
      { uuid: 'TQ-016', section: 'FARM_DETAILS', text: 'How many crop seasons per year?', type: 'multiple_choice', answerType: 'choice', choices: [
        { text: '1 season', value: '1', order: 1, points: 5 },
        { text: '2 seasons', value: '2', order: 2, points: 15 },
        { text: '3 seasons', value: '3', order: 3, points: 20 },
      ]},
      { uuid: 'TQ-017', section: 'FARM_DETAILS', text: 'Do you practice crop rotation?', type: 'yes_no', answerType: 'boolean', choices: [
        { text: 'Yes', value: 'yes', order: 1, points: 10 },
        { text: 'No', value: 'no', order: 2, points: 0 },
      ]},
      { uuid: 'TQ-018', section: 'FARM_DETAILS', text: 'Allied activities?', type: 'multiple_choice', answerType: 'choice', choices: [
        { text: 'None', value: 'none', order: 1, points: 0 },
        { text: 'Dairy', value: 'dairy', order: 2, points: 10 },
        { text: 'Fishery', value: 'fishery', order: 3, points: 10 },
        { text: 'Poultry', value: 'poultry', order: 4, points: 8 },
        { text: 'Multiple activities', value: 'multiple', order: 5, points: 15 },
      ]},
      { uuid: 'TQ-019', section: 'FARM_DETAILS', text: 'Do you have bore well / tube well?', type: 'yes_no', answerType: 'boolean', choices: [
        { text: 'Yes', value: 'yes', order: 1, points: 15 },
        { text: 'No', value: 'no', order: 2, points: 0 },
      ]},
      { uuid: 'TQ-020', section: 'FARM_DETAILS', text: 'Distance to nearest mandi (km)?', type: 'multiple_choice', answerType: 'choice', choices: [
        { text: 'Less than 5 km', value: 'lt_5', order: 1, points: 15 },
        { text: '5-15 km', value: '5_15', order: 2, points: 10 },
        { text: '15-30 km', value: '15_30', order: 3, points: 5 },
        { text: 'More than 30 km', value: 'gt_30', order: 4, points: 2 },
      ]},
      { uuid: 'TQ-021', section: 'FARM_DETAILS', text: 'Soil health card available?', type: 'yes_no', answerType: 'boolean', choices: [
        { text: 'Yes', value: 'yes', order: 1, points: 10 },
        { text: 'No', value: 'no', order: 2, points: 0 },
      ]},
      { uuid: 'TQ-022', section: 'FARM_DETAILS', text: 'Do you use tractor/machinery?', type: 'yes_no', answerType: 'boolean', choices: [
        { text: 'Yes', value: 'yes', order: 1, points: 10 },
        { text: 'No', value: 'no', order: 2, points: 0 },
      ]},

      // ── SECTION 3: FINANCIAL_LITERACY (10 questions) ────────────
      { uuid: 'TQ-023', section: 'FINANCIAL_LITERACY', text: 'Do you have a bank account?', type: 'yes_no', answerType: 'boolean', choices: [
        { text: 'Yes', value: 'yes', order: 1, points: 20 },
        { text: 'No', value: 'no', order: 2, points: 0 },
      ]},
      { uuid: 'TQ-024', section: 'FINANCIAL_LITERACY', text: 'Type of bank account?', type: 'multiple_choice', answerType: 'choice', choices: [
        { text: 'Savings account', value: 'savings', order: 1, points: 10 },
        { text: 'Jan Dhan account', value: 'jan_dhan', order: 2, points: 8 },
        { text: 'Current account', value: 'current', order: 3, points: 15 },
        { text: 'None', value: 'none', order: 4, points: 0 },
      ]},
      { uuid: 'TQ-025', section: 'FINANCIAL_LITERACY', text: 'Do you use UPI/mobile banking?', type: 'yes_no', answerType: 'boolean', choices: [
        { text: 'Yes', value: 'yes', order: 1, points: 15 },
        { text: 'No', value: 'no', order: 2, points: 0 },
      ]},
      { uuid: 'TQ-026', section: 'FINANCIAL_LITERACY', text: 'Do you have crop insurance (PMFBY)?', type: 'yes_no', answerType: 'boolean', choices: [
        { text: 'Yes', value: 'yes', order: 1, points: 15 },
        { text: 'No', value: 'no', order: 2, points: 0 },
      ]},
      { uuid: 'TQ-027', section: 'FINANCIAL_LITERACY', text: 'Do you save regularly?', type: 'multiple_choice', answerType: 'choice', choices: [
        { text: 'Monthly', value: 'monthly', order: 1, points: 20 },
        { text: 'Quarterly', value: 'quarterly', order: 2, points: 10 },
        { text: 'Occasionally', value: 'occasionally', order: 3, points: 5 },
        { text: 'Never', value: 'never', order: 4, points: 0 },
      ]},
      { uuid: 'TQ-028', section: 'FINANCIAL_LITERACY', text: 'Are you part of any SHG (Self Help Group)?', type: 'yes_no', answerType: 'boolean', choices: [
        { text: 'Yes', value: 'yes', order: 1, points: 15 },
        { text: 'No', value: 'no', order: 2, points: 0 },
      ]},
      { uuid: 'TQ-029', section: 'FINANCIAL_LITERACY', text: 'Do you use smartphone?', type: 'yes_no', answerType: 'boolean', choices: [
        { text: 'Yes', value: 'yes', order: 1, points: 10 },
        { text: 'No', value: 'no', order: 2, points: 5 },
      ]},
      { uuid: 'TQ-030', section: 'FINANCIAL_LITERACY', text: 'Do you have KCC (Kisan Credit Card)?', type: 'yes_no', answerType: 'boolean', choices: [
        { text: 'Yes', value: 'yes', order: 1, points: 15 },
        { text: 'No', value: 'no', order: 2, points: 0 },
      ]},
      { uuid: 'TQ-031', section: 'FINANCIAL_LITERACY', text: 'Have you used eNAM or online trading platform?', type: 'yes_no', answerType: 'boolean', choices: [
        { text: 'Yes', value: 'yes', order: 1, points: 10 },
        { text: 'No', value: 'no', order: 2, points: 0 },
      ]},
      { uuid: 'TQ-032', section: 'FINANCIAL_LITERACY', text: 'Do you maintain farm records/diary?', type: 'yes_no', answerType: 'boolean', choices: [
        { text: 'Yes', value: 'yes', order: 1, points: 15 },
        { text: 'No', value: 'no', order: 2, points: 0 },
      ]},

      // ── SECTION 4: REPAYMENT_CAPACITY (12 questions) ────────────
      { uuid: 'TQ-033', section: 'REPAYMENT_CAPACITY', text: 'Total annual household income (Rs)?', type: 'multiple_choice', answerType: 'choice', choices: [
        { text: 'Less than 1 Lakh', value: 'lt_1l', order: 1, points: 5 },
        { text: '1-3 Lakhs', value: '1_3l', order: 2, points: 15 },
        { text: '3-5 Lakhs', value: '3_5l', order: 3, points: 25 },
        { text: '5-10 Lakhs', value: '5_10l', order: 4, points: 35 },
        { text: 'More than 10 Lakhs', value: 'gt_10l', order: 5, points: 40 },
      ]},
      { uuid: 'TQ-034', section: 'REPAYMENT_CAPACITY', text: 'Number of income sources?', type: 'multiple_choice', answerType: 'choice', choices: [
        { text: '1 source', value: '1', order: 1, points: 10 },
        { text: '2 sources', value: '2', order: 2, points: 20 },
        { text: '3 sources', value: '3', order: 3, points: 25 },
        { text: '4 or more sources', value: '4_plus', order: 4, points: 30 },
      ]},
      { uuid: 'TQ-035', section: 'REPAYMENT_CAPACITY', text: 'Have you taken loan before?', type: 'yes_no', answerType: 'boolean', choices: [
        { text: 'Yes', value: 'yes', order: 1, points: 10 },
        { text: 'No', value: 'no', order: 2, points: 5 },
      ]},
      { uuid: 'TQ-036', section: 'REPAYMENT_CAPACITY', text: 'Previous loan repayment history?', type: 'multiple_choice', answerType: 'choice', choices: [
        { text: 'Always on time', value: 'always_on_time', order: 1, points: 40 },
        { text: 'Mostly on time', value: 'mostly_on_time', order: 2, points: 25 },
        { text: 'Sometimes late', value: 'sometimes_late', order: 3, points: 10 },
        { text: 'Defaulted', value: 'defaulted', order: 4, points: 0 },
        { text: 'No history', value: 'no_history', order: 5, points: 15 },
      ]},
      { uuid: 'TQ-037', section: 'REPAYMENT_CAPACITY', text: 'Monthly expenses (Rs)?', type: 'numeric_input', answerType: 'number', min: 0, max: 200000, unit: 'rupees' },
      { uuid: 'TQ-038', section: 'REPAYMENT_CAPACITY', text: 'Do you have existing loans?', type: 'multiple_choice', answerType: 'choice', choices: [
        { text: 'None', value: 'none', order: 1, points: 20 },
        { text: '1 loan', value: '1', order: 2, points: 15 },
        { text: '2 loans', value: '2', order: 3, points: 10 },
        { text: '3 or more loans', value: '3_plus', order: 4, points: 5 },
      ]},
      { uuid: 'TQ-039', section: 'REPAYMENT_CAPACITY', text: 'Government benefit schemes enrolled?', type: 'multiple_choice', answerType: 'choice', choices: [
        { text: 'PM-KISAN', value: 'pm_kisan', order: 1, points: 10 },
        { text: 'MNREGA', value: 'mnrega', order: 2, points: 8 },
        { text: 'Both PM-KISAN and MNREGA', value: 'both', order: 3, points: 15 },
        { text: 'Other schemes', value: 'other', order: 4, points: 5 },
        { text: 'None', value: 'none', order: 5, points: 0 },
      ]},
      { uuid: 'TQ-040', section: 'REPAYMENT_CAPACITY', text: 'Annual farm input cost (Rs)?', type: 'numeric_input', answerType: 'number', min: 0, max: 500000, unit: 'rupees' },
      { uuid: 'TQ-041', section: 'REPAYMENT_CAPACITY', text: 'Average crop yield vs district average?', type: 'multiple_choice', answerType: 'choice', choices: [
        { text: 'Above average', value: 'above', order: 1, points: 25 },
        { text: 'Average', value: 'average', order: 2, points: 15 },
        { text: 'Below average', value: 'below', order: 3, points: 5 },
      ]},
      { uuid: 'TQ-042', section: 'REPAYMENT_CAPACITY', text: 'Do you sell at MSP or contract farming?', type: 'multiple_choice', answerType: 'choice', choices: [
        { text: 'MSP procurement', value: 'msp', order: 1, points: 20 },
        { text: 'Contract farming', value: 'contract', order: 2, points: 25 },
        { text: 'Open market', value: 'open_market', order: 3, points: 10 },
        { text: 'Local trader', value: 'local_trader', order: 4, points: 5 },
      ]},
      { uuid: 'TQ-043', section: 'REPAYMENT_CAPACITY', text: 'How many years at current residence?', type: 'multiple_choice', answerType: 'choice', choices: [
        { text: 'Less than 2 years', value: 'lt_2', order: 1, points: 5 },
        { text: '2-5 years', value: '2_5', order: 2, points: 10 },
        { text: '5-15 years', value: '5_15', order: 3, points: 15 },
        { text: 'More than 15 years', value: 'gt_15', order: 4, points: 20 },
      ]},
      { uuid: 'TQ-044', section: 'REPAYMENT_CAPACITY', text: 'Do you have any non-farm income?', type: 'yes_no', answerType: 'boolean', choices: [
        { text: 'Yes', value: 'yes', order: 1, points: 15 },
        { text: 'No', value: 'no', order: 2, points: 0 },
      ]},

      // ── SECTION 5: COLLATERAL_ASSETS (8 questions) ──────────────
      { uuid: 'TQ-045', section: 'COLLATERAL_ASSETS', text: 'Gold ornaments value (approximate Rs)?', type: 'multiple_choice', answerType: 'choice', choices: [
        { text: 'None', value: 'none', order: 1, points: 0 },
        { text: 'Less than 50,000', value: 'lt_50k', order: 2, points: 10 },
        { text: '50,000 - 2 Lakhs', value: '50k_2l', order: 3, points: 20 },
        { text: '2 Lakhs - 5 Lakhs', value: '2l_5l', order: 4, points: 30 },
        { text: 'More than 5 Lakhs', value: 'gt_5l', order: 5, points: 35 },
      ]},
      { uuid: 'TQ-046', section: 'COLLATERAL_ASSETS', text: 'Do you own two-wheeler/vehicle?', type: 'multiple_choice', answerType: 'choice', choices: [
        { text: 'None', value: 'none', order: 1, points: 0 },
        { text: 'Two-wheeler', value: 'two_wheeler', order: 2, points: 10 },
        { text: 'Tractor', value: 'tractor', order: 3, points: 20 },
        { text: 'Car / Truck', value: 'car_truck', order: 4, points: 15 },
      ]},
      { uuid: 'TQ-047', section: 'COLLATERAL_ASSETS', text: 'Livestock count?', type: 'multiple_choice', answerType: 'choice', choices: [
        { text: 'None', value: 'none', order: 1, points: 0 },
        { text: '1-3', value: '1_3', order: 2, points: 10 },
        { text: '4-10', value: '4_10', order: 3, points: 20 },
        { text: 'More than 10', value: 'gt_10', order: 4, points: 25 },
      ]},
      { uuid: 'TQ-048', section: 'COLLATERAL_ASSETS', text: 'Do you have stored produce (warehouse)?', type: 'yes_no', answerType: 'boolean', choices: [
        { text: 'Yes', value: 'yes', order: 1, points: 15 },
        { text: 'No', value: 'no', order: 2, points: 0 },
      ]},
      { uuid: 'TQ-049', section: 'COLLATERAL_ASSETS', text: 'Pucca house?', type: 'yes_no', answerType: 'boolean', choices: [
        { text: 'Yes', value: 'yes', order: 1, points: 15 },
        { text: 'No (kutcha)', value: 'no', order: 2, points: 5 },
      ]},
      { uuid: 'TQ-050', section: 'COLLATERAL_ASSETS', text: 'Farm equipment owned?', type: 'multiple_choice', answerType: 'choice', choices: [
        { text: 'None', value: 'none', order: 1, points: 0 },
        { text: 'Basic tools', value: 'basic', order: 2, points: 5 },
        { text: 'Pump set', value: 'pump_set', order: 3, points: 10 },
        { text: 'Tractor', value: 'tractor', order: 4, points: 20 },
        { text: 'Multiple equipment', value: 'multiple', order: 5, points: 25 },
      ]},
      { uuid: 'TQ-051', section: 'COLLATERAL_ASSETS', text: 'Do you have any fixed deposits?', type: 'yes_no', answerType: 'boolean', choices: [
        { text: 'Yes', value: 'yes', order: 1, points: 15 },
        { text: 'No', value: 'no', order: 2, points: 0 },
      ]},
      { uuid: 'TQ-052', section: 'COLLATERAL_ASSETS', text: 'Do you have life insurance?', type: 'yes_no', answerType: 'boolean', choices: [
        { text: 'Yes', value: 'yes', order: 1, points: 10 },
        { text: 'No', value: 'no', order: 2, points: 0 },
      ]},

      // ── SECTION 6: NETWORK_REFERENCES (8 questions) ─────────────
      { uuid: 'TQ-053', section: 'NETWORK_REFERENCES', text: 'Are you member of FPO/cooperative?', type: 'yes_no', answerType: 'boolean', choices: [
        { text: 'Yes', value: 'yes', order: 1, points: 15 },
        { text: 'No', value: 'no', order: 2, points: 0 },
      ]},
      { uuid: 'TQ-054', section: 'NETWORK_REFERENCES', text: 'Do you have a reference from village panchayat?', type: 'yes_no', answerType: 'boolean', choices: [
        { text: 'Yes', value: 'yes', order: 1, points: 15 },
        { text: 'No', value: 'no', order: 2, points: 0 },
      ]},
      { uuid: 'TQ-055', section: 'NETWORK_REFERENCES', text: 'Have you been recommended by existing borrower?', type: 'yes_no', answerType: 'boolean', choices: [
        { text: 'Yes', value: 'yes', order: 1, points: 10 },
        { text: 'No', value: 'no', order: 2, points: 0 },
      ]},
      { uuid: 'TQ-056', section: 'NETWORK_REFERENCES', text: 'Years of relationship with local bank branch?', type: 'multiple_choice', answerType: 'choice', choices: [
        { text: 'Less than 1 year', value: 'lt_1', order: 1, points: 3 },
        { text: '1-5 years', value: '1_5', order: 2, points: 8 },
        { text: '5-10 years', value: '5_10', order: 3, points: 12 },
        { text: 'More than 10 years', value: 'gt_10', order: 4, points: 15 },
      ]},
      { uuid: 'TQ-057', section: 'NETWORK_REFERENCES', text: 'Are you known to the local SATHI/agent?', type: 'yes_no', answerType: 'boolean', choices: [
        { text: 'Yes', value: 'yes', order: 1, points: 10 },
        { text: 'No', value: 'no', order: 2, points: 0 },
      ]},
      { uuid: 'TQ-058', section: 'NETWORK_REFERENCES', text: 'Participation in village community activities?', type: 'multiple_choice', answerType: 'choice', choices: [
        { text: 'Active', value: 'active', order: 1, points: 10 },
        { text: 'Sometimes', value: 'sometimes', order: 2, points: 5 },
        { text: 'Never', value: 'never', order: 3, points: 0 },
      ]},
      { uuid: 'TQ-059', section: 'NETWORK_REFERENCES', text: 'Mobile number active for how many years?', type: 'multiple_choice', answerType: 'choice', choices: [
        { text: 'Less than 1 year', value: 'lt_1', order: 1, points: 2 },
        { text: '1-3 years', value: '1_3', order: 2, points: 5 },
        { text: '3-5 years', value: '3_5', order: 3, points: 8 },
        { text: 'More than 5 years', value: 'gt_5', order: 4, points: 10 },
      ]},
      { uuid: 'TQ-060', section: 'NETWORK_REFERENCES', text: 'Number of contacts who also use FarmerPay?', type: 'multiple_choice', answerType: 'choice', choices: [
        { text: '0', value: '0', order: 1, points: 0 },
        { text: '1-3', value: '1_3', order: 2, points: 5 },
        { text: '4-10', value: '4_10', order: 3, points: 10 },
        { text: 'More than 10', value: 'gt_10', order: 4, points: 15 },
      ]},
    ];

    // ────────────────────────────────────────────────────────────────
    // INSERT questions
    // ────────────────────────────────────────────────────────────────
    const questionRows = questions.map((q) => ({
      question_uuid: q.uuid,
      section_id: sec[q.section],
      question_text: q.text,
      question_type: q.type,
      required_answer_type: q.answerType,
      min_value: q.min != null ? q.min : null,
      max_value: q.max != null ? q.max : null,
      unit_of_measurement: q.unit || null,
      is_active: true,
      created_at: now,
      updated_at: now,
    }));

    await queryInterface.bulkInsert('trust_questions', questionRows);

    // ────────────────────────────────────────────────────────────────
    // Fetch back auto-generated IDs by question_uuid
    // ────────────────────────────────────────────────────────────────
    const [insertedQuestions] = await queryInterface.sequelize.query(
      `SELECT id, question_uuid FROM trust_questions WHERE question_uuid IN (${questions.map((q) => `'${q.uuid}'`).join(',')})`
    );
    const qIdMap = {};
    insertedQuestions.forEach((r) => { qIdMap[r.question_uuid] = r.id; });

    // ────────────────────────────────────────────────────────────────
    // INSERT choices
    // ────────────────────────────────────────────────────────────────
    const choiceRows = [];
    for (const q of questions) {
      if (!q.choices || q.choices.length === 0) continue;
      const questionId = qIdMap[q.uuid];
      if (!questionId) continue;

      for (const c of q.choices) {
        choiceRows.push({
          question_id: questionId,
          choice_text: c.text,
          choice_value: c.value,
          choice_order: c.order,
          points_awarded: c.points,
          is_active: true,
          created_at: now,
          updated_at: now,
        });
      }
    }

    if (choiceRows.length > 0) {
      await queryInterface.bulkInsert('trust_question_choices', choiceRows);
    }
  },

  async down(queryInterface) {
    // Delete choices first (FK), then questions
    const uuids = [];
    for (let i = 1; i <= 60; i++) {
      uuids.push(`'TQ-${String(i).padStart(3, '0')}'`);
    }

    await queryInterface.sequelize.query(
      `DELETE FROM trust_question_choices WHERE question_id IN (
        SELECT id FROM trust_questions WHERE question_uuid IN (${uuids.join(',')})
      )`
    );
    await queryInterface.sequelize.query(
      `DELETE FROM trust_questions WHERE question_uuid IN (${uuids.join(',')})`
    );
  },
};
