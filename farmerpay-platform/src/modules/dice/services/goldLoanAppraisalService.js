/**
 * Gold Loan Appraisal Service
 * IBJA price lookup, gold valuation, LTV cap calculation, and pre-disburse checklist.
 */

const logger = require('../../../shared/utils/logger');

let db;
const getDb = () => {
  if (!db) db = require('../../../shared/models');
  return db;
};

/**
 * Returns current IBJA gold price per gram for 22K and 24K.
 * In production this would call an external IBJA API; here we return indicative rates.
 * @returns {{ pricePerGram22K: number, pricePerGram24K: number, date: string }}
 */
const getIbjaPrice = () => {
  const today = new Date().toISOString().split('T')[0];
  return {
    pricePerGram22K: 6500,
    pricePerGram24K: 7100,
    date: today,
  };
};

/**
 * Calculates gold collateral value based on weight, purity, and current IBJA price.
 * @param {Object} params
 * @param {number} params.grossWeightGrams - Gross weight of ornament in grams
 * @param {number} params.stoneDeductionGrams - Weight of stones / impurities to deduct
 * @param {number} params.purityCarat - Purity in carats (e.g. 22, 24)
 * @returns {{ netWeight: number, purityFactor: number, ibjaPrice: number, totalValue: number }}
 */
const calculateGoldValue = ({ grossWeightGrams, stoneDeductionGrams, purityCarat }) => {
  const netWeight = grossWeightGrams - (stoneDeductionGrams || 0);
  if (netWeight <= 0) {
    const err = new Error('Net weight must be positive after stone deduction');
    err.statusCode = 400;
    err.errorCode = 'GOLD_001';
    throw err;
  }

  const purityFactor = purityCarat / 24;
  const { pricePerGram24K } = getIbjaPrice();
  const totalValue = parseFloat((netWeight * purityFactor * pricePerGram24K).toFixed(2));

  logger.info(`Gold value calculated: netWeight=${netWeight}g, purity=${purityCarat}K, value=${totalValue}`);

  return {
    netWeight,
    purityFactor: parseFloat(purityFactor.toFixed(4)),
    ibjaPrice: pricePerGram24K,
    totalValue,
  };
};

/**
 * Returns the applicable LTV (Loan-to-Value) cap based on loan amount slab.
 * RBI guideline-aligned slabs for gold loans.
 * @param {number} loanAmount - Requested / sanctioned loan amount
 * @returns {number} LTV cap as a decimal (e.g. 0.85 for 85%)
 */
const calculateLtvCap = (loanAmount) => {
  if (loanAmount <= 250000) return 0.85;
  if (loanAmount <= 500000) return 0.80;
  return 0.75;
};

/**
 * Generates pre-disbursement checklist for a gold loan application.
 * Each item carries a status (pending / verified / failed) and a required flag.
 * @param {number} loanApplicationId
 * @returns {Promise<Array<{ item: string, status: string, required: boolean }>>}
 */
const preDisburseChecklist = async (loanApplicationId) => {
  const { LoanApplication, GoldLoanCollateral } = getDb();

  const application = await LoanApplication.findOne({
    where: { id: loanApplicationId, is_active: true },
  });
  if (!application) {
    const err = new Error('Loan application not found');
    err.statusCode = 404;
    err.errorCode = 'RES_001';
    throw err;
  }

  // Check for existing collateral records
  const collaterals = await GoldLoanCollateral.findAll({
    where: { application_id: loanApplicationId, is_active: true },
  }).catch(() => []);

  const hasCollateral = collaterals && collaterals.length > 0;
  const totalGoldValue = hasCollateral
    ? collaterals.reduce((sum, c) => sum + parseFloat(c.appraised_value || 0), 0)
    : 0;

  const loanAmount = parseFloat(application.loan_amount_requested || application.loan_amount_approved || 0);
  const ltvCap = calculateLtvCap(loanAmount);
  const currentLtv = totalGoldValue > 0 ? loanAmount / totalGoldValue : 0;
  const ltvWithinCap = totalGoldValue > 0 && currentLtv <= ltvCap;

  const checklist = [
    {
      item: 'KYC verified',
      status: application.kyc_status === 'verified' ? 'verified' : 'pending',
      required: true,
    },
    {
      item: 'Gold appraised',
      status: hasCollateral ? 'verified' : 'pending',
      required: true,
    },
    {
      item: 'Ownership proof uploaded',
      status: hasCollateral && collaterals.every((c) => c.ownership_proof_type)
        ? 'verified'
        : 'pending',
      required: true,
    },
    {
      item: 'LTV within cap',
      status: ltvWithinCap ? 'verified' : 'pending',
      required: true,
    },
    {
      item: 'Income adequate',
      status: application.income_assessment_status === 'adequate' ||
              application.income_assessment_status === 'strong'
        ? 'verified'
        : 'pending',
      required: true,
    },
    {
      item: 'PSL classified',
      status: application.psl_classification ? 'verified' : 'pending',
      required: true,
    },
    {
      item: 'End-use declared',
      status: application.end_use_purpose ? 'verified' : 'pending',
      required: true,
    },
  ];

  logger.info(`Pre-disburse checklist generated for application ${loanApplicationId}`);
  return checklist;
};

module.exports = {
  getIbjaPrice,
  calculateGoldValue,
  calculateLtvCap,
  preDisburseChecklist,
};
