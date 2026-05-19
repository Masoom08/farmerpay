'use strict';

/**
 * AA V2 Seed Data — 5 farmers with realistic Indian agricultural financial profiles.
 * Populates: aa_consents, aa_bank_statement_summaries, aa_financial_analyses, aa_transactions.
 */

const { v4: uuidv4 } = require('uuid');

const now = new Date();
const ts = (daysAgo = 0) => new Date(now.getTime() - daysAgo * 86400000);

module.exports = {
  async up(queryInterface) {
    // ── Consents (5 farmers — IDs 1-5 assumed to exist) ──────────

    const consents = [
      { id: 1, consent_uuid: uuidv4(), farmer_id: 1, aa_provider: 'setu', consent_status: 'approved', consent_purpose: 'Agricultural credit assessment', data_from: ts(365), data_to: ts(0), consent_handle: `setu-${uuidv4().slice(0, 8)}`, approved_at: ts(30), expires_at: ts(-335), last_fetch_at: ts(1), fetch_count: 3, is_active: true },
      { id: 2, consent_uuid: uuidv4(), farmer_id: 2, aa_provider: 'setu', consent_status: 'approved', consent_purpose: 'Agricultural credit assessment', data_from: ts(365), data_to: ts(0), consent_handle: `setu-${uuidv4().slice(0, 8)}`, approved_at: ts(15), expires_at: ts(-350), last_fetch_at: ts(2), fetch_count: 2, is_active: true },
      { id: 3, consent_uuid: uuidv4(), farmer_id: 3, aa_provider: 'finvu', consent_status: 'approved', consent_purpose: 'Loan servicing', data_from: ts(365), data_to: ts(0), consent_handle: `finvu-${uuidv4().slice(0, 8)}`, approved_at: ts(45), expires_at: ts(-320), last_fetch_at: ts(5), fetch_count: 1, is_active: true },
      { id: 4, consent_uuid: uuidv4(), farmer_id: 4, aa_provider: 'setu', consent_status: 'expired', consent_purpose: 'Agricultural credit assessment', data_from: ts(500), data_to: ts(135), consent_handle: `setu-${uuidv4().slice(0, 8)}`, approved_at: ts(400), expires_at: ts(35), last_fetch_at: ts(140), fetch_count: 1, is_active: false },
      { id: 5, consent_uuid: uuidv4(), farmer_id: 5, aa_provider: 'setu', consent_status: 'revoked', consent_purpose: 'Agricultural credit assessment', data_from: ts(365), data_to: ts(60), consent_handle: `setu-${uuidv4().slice(0, 8)}`, approved_at: ts(300), expires_at: ts(-65), last_fetch_at: ts(90), fetch_count: 2, is_active: false },
    ].map(c => ({ ...c, created_at: ts(60), updated_at: now }));

    await queryInterface.bulkInsert('aa_consents', consents);

    // ── Bank Statement Summaries ─────────────────────────────────

    const summaries = [
      // Farmer 1: Kharif paddy, Maharashtra, PM-KISAN, score ~72
      { summary_uuid: uuidv4(), farmer_id: 1, consent_id: 1, bank_name: 'State Bank of India', account_type: 'savings', period_months: 12, avg_monthly_credit: 28000, avg_monthly_debit: 18000, avg_monthly_balance: 45000, min_balance: 5000, max_balance: 120000, salary_dbt_credits: 3, govt_subsidy_credits: 5, upi_transaction_count: 25, avg_upi_value: 1200, bounce_count: 1, emi_debit_count: 12, cash_withdrawal_ratio: 18.5, is_active: true },
      // Farmer 2: Dairy AMUL DCS, Gujarat, regular monthly, score ~81
      { summary_uuid: uuidv4(), farmer_id: 2, consent_id: 2, bank_name: 'Bank of Baroda', account_type: 'savings', period_months: 12, avg_monthly_credit: 35000, avg_monthly_debit: 22000, avg_monthly_balance: 65000, min_balance: 20000, max_balance: 95000, salary_dbt_credits: 0, govt_subsidy_credits: 4, upi_transaction_count: 40, avg_upi_value: 800, bounce_count: 0, emi_debit_count: 12, cash_withdrawal_ratio: 10.2, is_active: true },
      // Farmer 3: Mixed + MGNREGA, MP, some bounces, score ~55
      { summary_uuid: uuidv4(), farmer_id: 3, consent_id: 3, bank_name: 'Central Bank of India', account_type: 'savings', period_months: 12, avg_monthly_credit: 15000, avg_monthly_debit: 13500, avg_monthly_balance: 12000, min_balance: 500, max_balance: 35000, salary_dbt_credits: 6, govt_subsidy_credits: 8, upi_transaction_count: 10, avg_upi_value: 500, bounce_count: 3, emi_debit_count: 8, cash_withdrawal_ratio: 30.0, is_active: true },
      // Farmer 4: Fishery, coastal AP, seasonal, score ~48
      { summary_uuid: uuidv4(), farmer_id: 4, consent_id: 4, bank_name: 'Andhra Bank', account_type: 'savings', period_months: 12, avg_monthly_credit: 22000, avg_monthly_debit: 20000, avg_monthly_balance: 8000, min_balance: 200, max_balance: 60000, salary_dbt_credits: 0, govt_subsidy_credits: 2, upi_transaction_count: 8, avg_upi_value: 600, bounce_count: 4, emi_debit_count: 6, cash_withdrawal_ratio: 35.0, is_active: true },
      // Farmer 5: Horticulture + SHG, Karnataka, diverse, score ~76
      { summary_uuid: uuidv4(), farmer_id: 5, consent_id: 5, bank_name: 'Canara Bank', account_type: 'savings', period_months: 12, avg_monthly_credit: 32000, avg_monthly_debit: 21000, avg_monthly_balance: 55000, min_balance: 15000, max_balance: 90000, salary_dbt_credits: 2, govt_subsidy_credits: 6, upi_transaction_count: 35, avg_upi_value: 950, bounce_count: 0, emi_debit_count: 10, cash_withdrawal_ratio: 12.0, is_active: true },
    ].map(s => ({ ...s, created_at: ts(30), updated_at: now }));

    await queryInterface.bulkInsert('aa_bank_statement_summaries', summaries);

    // ── Financial Analyses ───────────────────────────────────────

    const analyses = [
      { farmer_id: 1, consent_id: 1, analysis_type: 'full', health_score: 72, health_grade: 'B', analysis_mode: 'raw_transactions', transaction_count: 145, period_from: ts(365), period_to: ts(0) },
      { farmer_id: 2, consent_id: 2, analysis_type: 'full', health_score: 81, health_grade: 'A', analysis_mode: 'raw_transactions', transaction_count: 210, period_from: ts(365), period_to: ts(0) },
      { farmer_id: 3, consent_id: 3, analysis_type: 'full', health_score: 55, health_grade: 'C', analysis_mode: 'raw_transactions', transaction_count: 98, period_from: ts(365), period_to: ts(0) },
      { farmer_id: 4, consent_id: 4, analysis_type: 'summary_only', health_score: 48, health_grade: 'D', analysis_mode: 'summary_fallback', transaction_count: 0, period_from: ts(500), period_to: ts(135) },
      { farmer_id: 5, consent_id: 5, analysis_type: 'full', health_score: 76, health_grade: 'B', analysis_mode: 'raw_transactions', transaction_count: 178, period_from: ts(365), period_to: ts(60) },
    ].map(a => ({
      analysis_uuid: uuidv4(),
      ...a,
      score_components: JSON.stringify({ cashFlowStability: { score: a.health_score - 5 }, balanceAdequacy: { score: a.health_score }, incomeDiversity: { score: a.health_score + 3 }, debtDiscipline: { score: a.health_score + 8 }, govtTransferAccess: { score: Math.min(100, a.health_score + 10) }, digitalAdoption: { score: a.health_score - 10 } }),
      income_summary: JSON.stringify({ totalIncome: a.health_score * 4000, farmIncome: a.health_score * 2500 }),
      expense_summary: JSON.stringify({ totalExpense: a.health_score * 2800 }),
      seasonality_data: null,
      risk_flags: JSON.stringify(a.health_score < 50 ? [{ type: 'HIGH_BOUNCE_RATE', severity: 'high', detail: 'Multiple bounces detected' }] : []),
      bridge_data: JSON.stringify({ trust: {}, drishti: {}, sentinel: {}, dice: {}, sathi: {} }),
      is_latest: true,
      is_active: true,
      created_at: ts(5),
      updated_at: now,
    }));

    await queryInterface.bulkInsert('aa_financial_analyses', analyses);

    // ── Transactions (20 per farmer = 100 total) ─────────────────

    const txns = [];
    const narrations = {
      credit: [
        ['APMC MANDI PADDY SALE', 'farm_sale', 85000], ['FCI PROCUREMENT MSP', 'farm_sale', 45000],
        ['PM-KISAN DBT SAMMAN', 'govt_transfer', 2000], ['MGNREGA WAGE', 'govt_transfer', 5000],
        ['AMUL DCS MILK PAYMENT', 'dairy_livestock', 18000], ['NEFT-SALARY EMPLOYER', 'wage_salary', 25000],
        ['SHG SELF HELP DIVIDEND', 'shg_income', 3000], ['FISH MARKET SHRIMP', 'fishery', 12000],
        ['UPI/FAMILY P2P', 'remittance', 5000], ['ENAM SOYBEAN SALE', 'farm_sale', 40000],
      ],
      debit: [
        ['NACH KCC EMI SBI', 'emi_repayment', 8000], ['IFFCO FERTILIZER', 'farm_input', 12000],
        ['BAYER PESTICIDE', 'farm_input', 5000], ['LPG INDANE GAS', 'household', 900],
        ['ELECTRICITY MSEDCL', 'household', 1200], ['SCHOOL FEES TUITION', 'education', 5000],
        ['ATM CASH WITHDRAWAL', 'cash_withdrawal', 5000], ['GROCERY KIRANA', 'household', 3500],
        ['HOSPITAL MEDICAL', 'health', 3000], ['CATTLE FEED PURCHASE', 'farm_input', 8000],
      ],
    };

    for (let farmerId = 1; farmerId <= 5; farmerId++) {
      for (let i = 0; i < 20; i++) {
        const isCredit = i < 10;
        const pool = isCredit ? narrations.credit : narrations.debit;
        const [narration, category, baseAmount] = pool[i % pool.length];
        const amount = baseAmount + Math.floor(Math.random() * 1000);
        const daysAgo = Math.floor(Math.random() * 330) + 1;

        txns.push({
          transaction_uuid: uuidv4(),
          farmer_id: farmerId,
          consent_id: Math.min(farmerId, 5),
          summary_id: null,
          txn_date: ts(daysAgo).toISOString().split('T')[0],
          txn_type: isCredit ? 'credit' : 'debit',
          amount,
          balance_after: 10000 + Math.floor(Math.random() * 50000),
          narration,
          reference: `REF${Date.now()}${i}`,
          mode: isCredit ? 'NEFT' : (i % 3 === 0 ? 'UPI' : 'NACH'),
          income_category: isCredit ? category : null,
          expense_category: isCredit ? null : category,
          classification_confidence: 0.75 + Math.random() * 0.2,
          is_active: true,
          created_at: ts(daysAgo),
          updated_at: now,
        });
      }
    }

    await queryInterface.bulkInsert('aa_transactions', txns);
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('aa_transactions', { farmer_id: [1, 2, 3, 4, 5] }, {});
    await queryInterface.bulkDelete('aa_financial_analyses', { farmer_id: [1, 2, 3, 4, 5] }, {});
    await queryInterface.bulkDelete('aa_bank_statement_summaries', { farmer_id: [1, 2, 3, 4, 5] }, {});
    await queryInterface.bulkDelete('aa_consents', { farmer_id: [1, 2, 3, 4, 5] }, {});
  },
};
