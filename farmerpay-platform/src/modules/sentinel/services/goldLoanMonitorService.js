/**
 * Gold Loan Monitor Service
 * Collateral appraisal, LTV monitoring, income adequacy, and PSL compliance.
 */

const { Op } = require('sequelize');
const { generateUUID } = require('../../../shared/utils/uuidHelper');
const logger = require('../../../shared/utils/logger');

let db;
const getDb = () => {
  if (!db) db = require('../../../shared/models');
  return db;
};

// IBJA (India Bullion and Jewellers Association) daily spot prices drive gold
// loan LTV. These values MUST come from a signed external feed (IBJA API, MCX,
// or a ledger ingested by the pulse daily job) — tampering with them lets an
// attacker either force margin calls on healthy loans or hide genuine LTV
// breaches. Until the external feed is wired, we fail closed: prices come
// from env vars or a dedicated DB row, and the service throws if neither is
// configured rather than returning a stale hardcoded value.
const IBJA_MAX_SANE_PRICE = 20000; // ₹/g — sanity bound; 24K has never exceeded this
const IBJA_MIN_SANE_PRICE = 2000;  // ₹/g — sanity bound

const getIbjaPrice = () => {
  const today = new Date().toISOString().split('T')[0];
  const p22 = parseFloat(process.env.IBJA_PRICE_22K || '');
  const p24 = parseFloat(process.env.IBJA_PRICE_24K || '');
  const asOf = process.env.IBJA_PRICE_AS_OF || today;

  if (!p22 || !p24) {
    const err = new Error(
      'IBJA gold prices not configured. Set IBJA_PRICE_22K and IBJA_PRICE_24K from the signed daily feed before running LTV computations.'
    );
    err.statusCode = 503;
    err.errorCode = 'GOLD_PRICE_UNAVAILABLE';
    throw err;
  }
  if (p22 < IBJA_MIN_SANE_PRICE || p22 > IBJA_MAX_SANE_PRICE
      || p24 < IBJA_MIN_SANE_PRICE || p24 > IBJA_MAX_SANE_PRICE) {
    const err = new Error('IBJA gold price outside sane bounds — refusing to use for LTV');
    err.statusCode = 503;
    err.errorCode = 'GOLD_PRICE_OUT_OF_RANGE';
    logger.error(`Refusing gold price: 22K=${p22} 24K=${p24}`);
    throw err;
  }
  // Stale-price guard: reject prices older than 2 calendar days. Daily
  // feed should refresh at least every business day.
  const asOfDate = new Date(asOf);
  const ageDays = (Date.now() - asOfDate.getTime()) / (1000 * 60 * 60 * 24);
  if (Number.isNaN(ageDays) || ageDays > 2) {
    const err = new Error(`IBJA gold price is stale (${asOf}); refresh required`);
    err.statusCode = 503;
    err.errorCode = 'GOLD_PRICE_STALE';
    throw err;
  }
  return { pricePerGram22K: p22, pricePerGram24K: p24, date: asOf };
};

const calculateLtvCap = (loanAmount) => {
  if (loanAmount <= 250000) return 0.85;
  if (loanAmount <= 500000) return 0.80;
  return 0.75;
};

/**
 * Appraises gold collateral for a loan application.
 * Creates GoldLoanCollateral records, enforces 1 kg aggregate limit, computes LTV.
 * @param {Object} params
 * @param {number} params.loanApplicationId
 * @param {Array} params.ornaments - [{description, grossWeight, stoneDeduction, purityCarat, ownershipProofType}]
 * @returns {Promise<Object>}
 */
const appraiseGoldCollateral = async ({ loanApplicationId, ornaments }) => {
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

  if (!ornaments || ornaments.length === 0) {
    const err = new Error('At least one ornament is required for appraisal');
    err.statusCode = 400;
    err.errorCode = 'GOLD_002';
    throw err;
  }

  const { pricePerGram24K } = getIbjaPrice();
  let totalGoldValue = 0;
  let totalWeight = 0;
  const collateralIds = [];

  for (const ornament of ornaments) {
    const netWeight = ornament.grossWeight - (ornament.stoneDeduction || 0);
    if (netWeight <= 0) {
      const err = new Error(`Invalid net weight for ornament: ${ornament.description}`);
      err.statusCode = 400;
      err.errorCode = 'GOLD_003';
      throw err;
    }

    totalWeight += netWeight;
    const purityFactor = ornament.purityCarat / 24;
    const appraisedValue = parseFloat((netWeight * purityFactor * pricePerGram24K).toFixed(2));
    totalGoldValue += appraisedValue;

    const record = await GoldLoanCollateral.create({
      collateral_uuid: generateUUID(),
      application_id: loanApplicationId,
      ornament_description: ornament.description,
      gross_weight_grams: ornament.grossWeight,
      stone_deduction_grams: ornament.stoneDeduction || 0,
      net_weight_grams: netWeight,
      purity_carat: ornament.purityCarat,
      purity_factor: parseFloat(purityFactor.toFixed(4)),
      ibja_price_per_gram: pricePerGram24K,
      appraised_value: appraisedValue,
      ownership_proof_type: ornament.ownershipProofType || null,
      appraisal_date: new Date(),
    });

    collateralIds.push(record.id);
  }

  // Enforce 1 kg aggregate limit (1000 grams)
  if (totalWeight > 1000) {
    logger.warn(`Gold weight ${totalWeight}g exceeds 1kg limit for application ${loanApplicationId}`);
    const err = new Error('Total gold weight exceeds 1 kg aggregate limit');
    err.statusCode = 400;
    err.errorCode = 'GOLD_004';
    throw err;
  }

  const loanAmount = parseFloat(application.loan_amount_requested || application.loan_amount_approved || 0);
  const ltvCap = calculateLtvCap(loanAmount);
  const ltvAtSanction = totalGoldValue > 0 ? parseFloat((loanAmount / totalGoldValue).toFixed(4)) : 0;
  const ltvCompliant = ltvAtSanction <= ltvCap;

  logger.info(`Gold collateral appraised for application ${loanApplicationId}: value=${totalGoldValue}, LTV=${ltvAtSanction}`);

  return {
    totalGoldValue,
    totalWeight: parseFloat(totalWeight.toFixed(2)),
    ltvAtSanction,
    ltvCompliant,
    collateralIds,
  };
};

/**
 * Monitors LTV for a gold loan by recalculating with latest IBJA prices.
 * Creates GoldLoanLtvMonitor record if breach detected.
 * @param {number} loanApplicationId
 * @returns {Promise<Object>}
 */
const monitorLtv = async (loanApplicationId) => {
  const { LoanApplication, GoldLoanCollateral, GoldLoanLtvMonitor } = getDb();

  const application = await LoanApplication.findOne({
    where: { id: loanApplicationId, is_active: true },
  });
  if (!application) {
    const err = new Error('Loan application not found');
    err.statusCode = 404;
    err.errorCode = 'RES_001';
    throw err;
  }

  const collaterals = await GoldLoanCollateral.findAll({
    where: { application_id: loanApplicationId, is_active: true },
  });

  if (!collaterals || collaterals.length === 0) {
    const err = new Error('No gold collateral found for this application');
    err.statusCode = 404;
    err.errorCode = 'GOLD_005';
    throw err;
  }

  const { pricePerGram24K } = getIbjaPrice();

  // Recalculate current value with latest IBJA price
  let currentTotalValue = 0;
  for (const c of collaterals) {
    const currentValue = parseFloat(c.net_weight_grams) * parseFloat(c.purity_factor) * pricePerGram24K;
    currentTotalValue += currentValue;
  }
  currentTotalValue = parseFloat(currentTotalValue.toFixed(2));

  const loanAmount = parseFloat(
    application.total_outstanding || application.loan_amount_approved || application.loan_amount_requested || 0
  );
  const applicableCap = calculateLtvCap(loanAmount);
  const currentLtv = currentTotalValue > 0
    ? parseFloat((loanAmount / currentTotalValue).toFixed(4))
    : 0;
  const breach = currentLtv > applicableCap;
  const marginCallAmount = breach
    ? parseFloat(((currentLtv - applicableCap) * currentTotalValue).toFixed(2))
    : 0;

  // Create monitoring record
  await GoldLoanLtvMonitor.create({
    monitor_uuid: generateUUID(),
    application_id: loanApplicationId,
    monitor_date: new Date(),
    current_gold_value: currentTotalValue,
    current_ltv: currentLtv,
    applicable_ltv_cap: applicableCap,
    ltv_breach: breach,
    margin_call_amount: marginCallAmount,
    ibja_price_used: pricePerGram24K,
  });

  if (breach) {
    logger.warn(`LTV breach for application ${loanApplicationId}: currentLTV=${currentLtv}, cap=${applicableCap}`);
  } else {
    logger.info(`LTV monitor: application ${loanApplicationId} within cap (${currentLtv} <= ${applicableCap})`);
  }

  return {
    currentLtv,
    applicableCap,
    breach,
    marginCallAmount,
  };
};

/**
 * Assesses income adequacy for a farmer across 6 income streams.
 * Computes Loan Instalment Ratio (LIR) and Effective Income Ratio (EIR).
 * @param {number} farmerId
 * @returns {Promise<Object>}
 */
const assessIncomeAdequacy = async (farmerId) => {
  const { IncomeAdequacyAssessment, LoanApplication } = getDb();

  // Estimate / fetch 6 income streams
  // In production these would come from linked data sources
  const incomeStreams = {
    crop_income: 120000,
    dairy_income: 36000,
    allied_income: 18000,
    non_farm_income: 24000,
    govt_transfer_income: 12000,
    other_income: 6000,
  };

  const totalAnnualIncome = Object.values(incomeStreams).reduce((sum, v) => sum + v, 0);
  const monthlyIncome = parseFloat((totalAnnualIncome / 12).toFixed(2));

  // Get total loan obligations for this farmer
  const activeLoans = await LoanApplication.findAll({
    where: {
      farmer_id: farmerId,
      is_active: true,
      application_status: { [Op.in]: ['disbursed', 'approved', 'active'] },
    },
    attributes: ['monthly_emi_amount', 'loan_amount_approved'],
  });

  const totalMonthlyObligations = activeLoans.reduce(
    (sum, l) => sum + parseFloat(l.monthly_emi_amount || 0),
    0
  );

  // LIR = total monthly loan obligations / monthly income
  const lir = monthlyIncome > 0
    ? parseFloat((totalMonthlyObligations / monthlyIncome).toFixed(4))
    : 0;

  // EIR = (monthly income - monthly obligations) / monthly income
  const eir = monthlyIncome > 0
    ? parseFloat(((monthlyIncome - totalMonthlyObligations) / monthlyIncome).toFixed(4))
    : 0;

  // Determine adequacy status
  let status;
  if (lir <= 0.30 && eir >= 0.50) {
    status = 'strong';
  } else if (lir <= 0.50 && eir >= 0.30) {
    status = 'adequate';
  } else if (lir <= 0.65 && eir >= 0.15) {
    status = 'marginal';
  } else {
    status = 'inadequate';
  }

  // Persist assessment
  const assessment = await IncomeAdequacyAssessment.create({
    assessment_uuid: generateUUID(),
    farmer_id: farmerId,
    assessment_date: new Date(),
    crop_income: incomeStreams.crop_income,
    dairy_income: incomeStreams.dairy_income,
    allied_income: incomeStreams.allied_income,
    non_farm_income: incomeStreams.non_farm_income,
    govt_transfer_income: incomeStreams.govt_transfer_income,
    other_income: incomeStreams.other_income,
    total_annual_income: totalAnnualIncome,
    monthly_income: monthlyIncome,
    total_monthly_obligations: totalMonthlyObligations,
    loan_instalment_ratio: lir,
    effective_income_ratio: eir,
    adequacy_status: status,
  });

  logger.info(`Income adequacy assessed for farmer ${farmerId}: status=${status}, LIR=${lir}, EIR=${eir}`);

  return {
    farmerId,
    incomeStreams,
    totalAnnualIncome,
    monthlyIncome,
    totalMonthlyObligations,
    lir,
    eir,
    status,
    assessmentId: assessment.id,
  };
};

/**
 * Checks PSL (Priority Sector Lending) compliance for a loan application.
 * Verifies classification and end-use evidence.
 * @param {number} loanApplicationId
 * @returns {Promise<Object>}
 */
const checkPslCompliance = async (loanApplicationId) => {
  const { LoanApplication, PslComplianceTracker } = getDb();

  const application = await LoanApplication.findOne({
    where: { id: loanApplicationId, is_active: true },
  });
  if (!application) {
    const err = new Error('Loan application not found');
    err.statusCode = 404;
    err.errorCode = 'RES_001';
    throw err;
  }

  const pslClassification = application.psl_classification || null;
  const endUsePurpose = application.end_use_purpose || null;
  const endUseEvidence = application.end_use_evidence_uploaded || false;

  const isClassified = !!pslClassification;
  const hasEndUse = !!endUsePurpose;
  const hasEvidence = !!endUseEvidence;
  const compliant = isClassified && hasEndUse && hasEvidence;

  const tracker = await PslComplianceTracker.create({
    tracker_uuid: generateUUID(),
    application_id: loanApplicationId,
    check_date: new Date(),
    psl_classification: pslClassification,
    end_use_purpose: endUsePurpose,
    end_use_evidence_present: hasEvidence,
    is_classified: isClassified,
    is_compliant: compliant,
    non_compliance_reasons: !compliant
      ? [
          !isClassified && 'Missing PSL classification',
          !hasEndUse && 'Missing end-use purpose declaration',
          !hasEvidence && 'Missing end-use evidence document',
        ].filter(Boolean)
      : [],
  });

  logger.info(`PSL compliance checked for application ${loanApplicationId}: compliant=${compliant}`);

  return {
    applicationId: loanApplicationId,
    pslClassification,
    endUsePurpose,
    endUseEvidencePresent: hasEvidence,
    compliant,
    trackerId: tracker.id,
  };
};

module.exports = {
  appraiseGoldCollateral,
  monitorLtv,
  assessIncomeAdequacy,
  checkPslCompliance,
};
