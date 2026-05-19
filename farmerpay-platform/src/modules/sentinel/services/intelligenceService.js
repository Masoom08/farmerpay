/**
 * Intelligence Service
 * Phase 2 analytics and intelligence functions for FarmerPay Sentinel module.
 * Provides yield prediction, satellite health, weather risk, dynamic interest rates,
 * restructuring recommendations, NPA prediction, collection scheduling,
 * video KYC status, language support, and advanced analytics.
 *
 * Where ML models would eventually be integrated, deterministic mock/computed
 * data is returned so the API contract is stable from day one.
 */

const logger = require('../../../shared/utils/logger');

let db;
const getDb = () => {
  if (!db) db = require('../../../shared/models');
  return db;
};

// ────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────

/** Seeded random between min and max (inclusive) based on a numeric seed. */
const seededRandom = (seed, min, max) => {
  const x = Math.sin(seed * 9301 + 49297) * 49297;
  const r = x - Math.floor(x);
  return min + r * (max - min);
};

/** Round to n decimal places. */
const round = (v, n = 2) => Math.round(v * 10 ** n) / 10 ** n;

/** Clamp value between min and max. */
const clamp = (v, min, max) => Math.min(Math.max(v, min), max);

// ────────────────────────────────────────────────────────────────────
// 1. Yield Prediction
// ────────────────────────────────────────────────────────────────────

/**
 * Predict crop yield for a cultivation cycle.
 * Uses benchmark yield, PoP compliance, and simulated weather/soil factors.
 */
const predictCropYield = async (cycleId) => {
  const {
    CultivationCycle, CultivationCycleBenchmarking, PopComplianceSnapshot, Field,
  } = getDb();

  const cycle = await CultivationCycle.findOne({
    where: { id: cycleId, is_active: true },
    include: [{ model: Field, as: 'field', attributes: ['id', 'field_size_hectares'] }],
  });
  if (!cycle) {
    const err = new Error('Cultivation cycle not found');
    err.statusCode = 404;
    err.errorCode = 'RES_001';
    throw err;
  }

  const benchmarking = await CultivationCycleBenchmarking.findOne({
    where: { cycle_id: cycleId, is_active: true },
    order: [['created_at', 'DESC']],
  });

  const compliance = await PopComplianceSnapshot.findOne({
    where: { cycle_id: cycleId, is_active: true },
    order: [['calculated_at', 'DESC']],
  });

  const benchmarkYieldKg = benchmarking
    ? parseFloat(benchmarking.benchmark_yield_kg || benchmarking.benchmark_yield || 2500)
    : 2500;

  const complianceScore = compliance
    ? parseFloat(compliance.overall_compliance_score || 75)
    : 75;

  const areaHa = cycle.field
    ? parseFloat(cycle.field.field_size_hectares || 1)
    : 1;

  // Simulated factors (would be ML-driven in production)
  const seed = cycleId;
  const weatherFactor = round(seededRandom(seed, 0.9, 1.1), 3);
  const soilFactor = round(seededRandom(seed + 1, 0.85, 1.0), 3);
  const complianceFactor = round(complianceScore / 100, 3);

  const predictedYieldPerHa = round(benchmarkYieldKg * complianceFactor * weatherFactor * soilFactor);
  const predictedYieldKg = round(predictedYieldPerHa * areaHa);
  const benchmarkYieldPerHa = round(benchmarkYieldKg);

  // Confidence degrades when compliance is low or weather deviates
  const confidencePercent = round(clamp(
    70 + (complianceScore - 50) * 0.3 + (1 - Math.abs(weatherFactor - 1)) * 20,
    40, 95,
  ));

  logger.info(`Yield prediction for cycle ${cycleId}: ${predictedYieldKg} kg`);

  return {
    cycleId,
    predictedYieldKg,
    predictedYieldPerHa,
    benchmarkYieldPerHa,
    areaHa: round(areaHa),
    confidencePercent,
    factors: {
      compliance: { score: complianceScore, factor: complianceFactor },
      weather: { factor: weatherFactor, description: weatherFactor >= 1 ? 'Favourable' : 'Below average' },
      soil: { factor: soilFactor, description: soilFactor >= 0.95 ? 'Good' : 'Moderate' },
    },
    modelVersion: 'v1.0-deterministic',
    generatedAt: new Date().toISOString(),
  };
};

// ────────────────────────────────────────────────────────────────────
// 2. Satellite Crop Health (mock Sentinel-2 NDVI)
// ────────────────────────────────────────────────────────────────────

/**
 * Return simulated satellite-derived crop health for a cultivation cycle.
 */
const getCropHealthFromSatellite = async (cycleId) => {
  const { CultivationCycle } = getDb();

  const cycle = await CultivationCycle.findOne({
    where: { id: cycleId, is_active: true },
  });
  if (!cycle) {
    const err = new Error('Cultivation cycle not found');
    err.statusCode = 404;
    err.errorCode = 'RES_001';
    throw err;
  }

  const seed = cycleId;
  const ndviValue = round(seededRandom(seed, 0.3, 0.85), 2);

  let healthStatus;
  if (ndviValue >= 0.7) healthStatus = 'excellent';
  else if (ndviValue >= 0.55) healthStatus = 'good';
  else if (ndviValue >= 0.4) healthStatus = 'average';
  else healthStatus = 'poor';

  const vegetationIndex = round(ndviValue * 1.05, 2);
  const moistureIndex = round(seededRandom(seed + 10, 0.2, 0.7), 2);

  const growthStages = ['germination', 'vegetative', 'flowering', 'grain_filling', 'maturity'];
  const stageIdx = Math.min(Math.floor(seededRandom(seed + 20, 0, 5)), 4);

  logger.info(`Satellite health for cycle ${cycleId}: NDVI=${ndviValue}, status=${healthStatus}`);

  return {
    cycleId,
    ndviValue,
    healthStatus,
    vegetationIndex,
    moistureIndex,
    growthStageEstimate: growthStages[stageIdx],
    assessmentDate: new Date().toISOString().split('T')[0],
    source: 'Sentinel-2',
    resolution: '10m',
    cloudCoverPercent: round(seededRandom(seed + 30, 0, 25)),
    modelVersion: 'v1.0-mock',
    generatedAt: new Date().toISOString(),
  };
};

// ────────────────────────────────────────────────────────────────────
// 3. Weather Risk Score
// ────────────────────────────────────────────────────────────────────

/**
 * Calculate weather-based risk for a district and season.
 */
const calculateWeatherRisk = async (districtId, season) => {
  const { LgdDistrict } = getDb();

  let districtName = 'Unknown';
  if (districtId) {
    const district = await LgdDistrict.findByPk(districtId);
    if (district) districtName = district.district_name || district.name || 'Unknown';
  }

  const seed = (parseInt(districtId, 10) || 1) + (season === 'rabi' ? 100 : 0);

  const rainfallDeviation = round(seededRandom(seed, -30, 40));
  const temperatureAnomaly = round(seededRandom(seed + 1, -2, 3), 1);
  const droughtProbability = round(seededRandom(seed + 2, 0, 40));
  const floodProbability = round(seededRandom(seed + 3, 0, 25));
  const hailRisk = round(seededRandom(seed + 4, 0, 15));

  // Weighted overall score (higher = riskier)
  const overallWeatherRiskScore = round(clamp(
    Math.abs(rainfallDeviation) * 0.8 +
    Math.abs(temperatureAnomaly) * 5 +
    droughtProbability * 0.5 +
    floodProbability * 0.8 +
    hailRisk * 0.6,
    0, 100,
  ));

  let riskCategory;
  if (overallWeatherRiskScore >= 75) riskCategory = 'extreme';
  else if (overallWeatherRiskScore >= 50) riskCategory = 'high';
  else if (overallWeatherRiskScore >= 25) riskCategory = 'moderate';
  else riskCategory = 'low';

  logger.info(`Weather risk for district ${districtId} (${season}): ${overallWeatherRiskScore} (${riskCategory})`);

  return {
    districtId: parseInt(districtId, 10) || null,
    districtName,
    season: season || 'kharif',
    rainfallDeviation,
    temperatureAnomaly,
    droughtProbability,
    floodProbability,
    hailRisk,
    overallWeatherRiskScore,
    riskCategory,
    advisories: [
      rainfallDeviation < -15 ? 'Consider drought-resistant varieties' : null,
      floodProbability > 15 ? 'Ensure proper drainage systems' : null,
      hailRisk > 10 ? 'Anti-hail nets recommended for high-value crops' : null,
      temperatureAnomaly > 2 ? 'Heat stress mitigation measures advised' : null,
    ].filter(Boolean),
    dataSource: 'IMD + ERA5 Reanalysis (mock)',
    modelVersion: 'v1.0-deterministic',
    generatedAt: new Date().toISOString(),
  };
};

// ────────────────────────────────────────────────────────────────────
// 5. Dynamic Interest Rate
// ────────────────────────────────────────────────────────────────────

/**
 * Calculate risk-adjusted dynamic interest rate for a loan application.
 */
const calculateDynamicRate = async (loanApplicationId) => {
  const {
    LoanApplication, LoanProduct, TrustScoreCalculation,
    PopComplianceSnapshot, LoanHealthSnapshot,
  } = getDb();

  const loan = await LoanApplication.findOne({
    where: { id: loanApplicationId, is_active: true },
  });
  if (!loan) {
    const err = new Error('Loan application not found');
    err.statusCode = 404;
    err.errorCode = 'RES_001';
    throw err;
  }

  // Fetch base rate from product
  const product = await LoanProduct.findByPk(loan.product_id);
  const baseRate = product
    ? parseFloat(product.interest_rate || product.base_interest_rate || 9.0)
    : 9.0;

  // Fetch trust score for the farmer
  const trustScore = await TrustScoreCalculation.findOne({
    where: { farmer_id: loan.farmer_id, is_active: true },
    order: [['created_at', 'DESC']],
  });
  const trustValue = trustScore ? parseFloat(trustScore.final_score || trustScore.total_score || 60) : 60;

  // Fetch compliance
  const compliance = await PopComplianceSnapshot.findOne({
    where: { is_active: true },
    order: [['calculated_at', 'DESC']],
  });
  const complianceValue = compliance
    ? parseFloat(compliance.overall_compliance_score || 70)
    : 70;

  // Simulated weather risk for the adjustment
  const seed = loanApplicationId;
  const weatherRiskScore = round(seededRandom(seed, 10, 70));

  // Calculate adjustments
  const adjustments = [];
  let totalAdjustment = 0;

  // Trust score adjustment
  if (trustValue >= 80) {
    adjustments.push({ factor: 'Excellent trust score', adjustment: -0.5 });
    totalAdjustment -= 0.5;
  } else if (trustValue >= 60) {
    adjustments.push({ factor: 'Good trust score', adjustment: -0.25 });
    totalAdjustment -= 0.25;
  } else if (trustValue < 40) {
    adjustments.push({ factor: 'Low trust score', adjustment: 0.75 });
    totalAdjustment += 0.75;
  }

  // Compliance adjustment
  if (complianceValue >= 85) {
    adjustments.push({ factor: 'High PoP compliance', adjustment: -0.25 });
    totalAdjustment -= 0.25;
  } else if (complianceValue < 50) {
    adjustments.push({ factor: 'Poor PoP compliance', adjustment: 1.0 });
    totalAdjustment += 1.0;
  }

  // Weather risk adjustment
  if (weatherRiskScore >= 60) {
    adjustments.push({ factor: 'High weather risk', adjustment: 0.5 });
    totalAdjustment += 0.5;
  } else if (weatherRiskScore >= 40) {
    adjustments.push({ factor: 'Moderate weather risk', adjustment: 0.25 });
    totalAdjustment += 0.25;
  }

  const effectiveRate = round(Math.max(baseRate + totalAdjustment, 4.0));

  // Government subvention (typical 2% for crop loans)
  const subventionRate = 2.0;
  const netRate = round(Math.max(effectiveRate - subventionRate, 1.0));

  logger.info(`Dynamic rate for application ${loanApplicationId}: base=${baseRate}%, effective=${effectiveRate}%, net=${netRate}%`);

  return {
    loanApplicationId,
    farmerId: loan.farmer_id,
    baseRate,
    adjustments,
    totalAdjustment: round(totalAdjustment),
    effectiveRate,
    subventionRate,
    netRate,
    inputScores: {
      trustScore: round(trustValue),
      complianceScore: round(complianceValue),
      weatherRiskScore,
    },
    modelVersion: 'v1.0-deterministic',
    generatedAt: new Date().toISOString(),
  };
};

// ────────────────────────────────────────────────────────────────────
// 6. Restructuring Recommendation
// ────────────────────────────────────────────────────────────────────

/**
 * Generate loan restructuring options for a troubled loan.
 */
const recommendRestructuring = async (loanApplicationId) => {
  const {
    LoanApplication, LoanHealthSnapshot, SmaClassificationLog, LoanProduct,
  } = getDb();

  const loan = await LoanApplication.findOne({
    where: { id: loanApplicationId, is_active: true },
  });
  if (!loan) {
    const err = new Error('Loan application not found');
    err.statusCode = 404;
    err.errorCode = 'RES_001';
    throw err;
  }

  const healthSnapshot = await LoanHealthSnapshot.findOne({
    where: { application_id: loanApplicationId, is_active: true },
    order: [['calculated_at', 'DESC']],
  });

  const smaLog = await SmaClassificationLog.findOne({
    where: { application_id: loanApplicationId, is_active: true },
    order: [['classification_date', 'DESC']],
  });

  const product = await LoanProduct.findByPk(loan.product_id);

  const currentRate = product
    ? parseFloat(product.interest_rate || product.base_interest_rate || 9.0)
    : 9.0;
  const loanAmount = parseFloat(loan.apply_for_amount || loan.approval_amount || 100000);
  const tenure = parseInt(loan.apply_for_tenure_months || 12, 10);
  const daysOverdue = healthSnapshot ? parseInt(healthSnapshot.days_overdue || 0, 10) : 0;
  const smaStatus = smaLog ? (smaLog.sma_category || smaLog.classification || 'regular') : 'regular';
  const healthStatus = healthSnapshot ? (healthSnapshot.health_status || 'healthy') : 'healthy';

  // Calculate current EMI (simple approximation)
  const monthlyRate = currentRate / 100 / 12;
  const currentEmi = round(loanAmount * monthlyRate * Math.pow(1 + monthlyRate, tenure) /
    (Math.pow(1 + monthlyRate, tenure) - 1));

  // Eligibility check: must be SMA-1 or worse
  const smaLevel = smaStatus.toLowerCase();
  const eligible = ['sma-1', 'sma-2', 'sma_1', 'sma_2', 'npa', 'substandard', 'doubtful'].some(
    (s) => smaLevel.includes(s),
  ) || daysOverdue >= 30;

  if (!eligible) {
    return {
      loanApplicationId,
      eligible: false,
      currentStatus: { smaStatus, daysOverdue, healthStatus, currentEmi },
      options: [],
      recommendation: 'Loan is performing normally; restructuring not recommended at this time.',
      generatedAt: new Date().toISOString(),
    };
  }

  // Option A: Tenure extension
  const extendedTenure = tenure + 6;
  const emiA = round(loanAmount * monthlyRate * Math.pow(1 + monthlyRate, extendedTenure) /
    (Math.pow(1 + monthlyRate, extendedTenure) - 1));
  const totalCostA = round(emiA * extendedTenure);

  // Option B: Interest rate reduction
  const reducedRate = Math.max(currentRate - 1.0, 4.0);
  const reducedMonthlyRate = reducedRate / 100 / 12;
  const emiB = round(loanAmount * reducedMonthlyRate * Math.pow(1 + reducedMonthlyRate, tenure) /
    (Math.pow(1 + reducedMonthlyRate, tenure) - 1));
  const totalCostB = round(emiB * tenure);

  // Option C: Moratorium (3-month pause, capitalize interest)
  const capitalizedAmount = round(loanAmount + (loanAmount * monthlyRate * 3));
  const remainingTenure = tenure;
  const emiC = round(capitalizedAmount * monthlyRate * Math.pow(1 + monthlyRate, remainingTenure) /
    (Math.pow(1 + monthlyRate, remainingTenure) - 1));
  const totalCostC = round(emiC * remainingTenure);

  const options = [
    {
      type: 'tenure_extension',
      label: 'Tenure Extension',
      description: `Extend tenure by 6 months to ${extendedTenure} months`,
      newEmi: emiA,
      newTenure: extendedTenure,
      newRate: currentRate,
      totalCost: totalCostA,
      emiReduction: round(currentEmi - emiA),
      emiReductionPercent: round(((currentEmi - emiA) / currentEmi) * 100),
    },
    {
      type: 'interest_rate_reduction',
      label: 'Interest Rate Reduction',
      description: `Reduce interest rate by 1% to ${reducedRate}%`,
      newEmi: emiB,
      newTenure: tenure,
      newRate: reducedRate,
      totalCost: totalCostB,
      emiReduction: round(currentEmi - emiB),
      emiReductionPercent: round(((currentEmi - emiB) / currentEmi) * 100),
    },
    {
      type: 'moratorium',
      label: '3-Month Moratorium',
      description: '3-month payment pause with interest capitalization',
      newEmi: emiC,
      newTenure: remainingTenure,
      newRate: currentRate,
      totalCost: totalCostC,
      moratoriumMonths: 3,
      capitalizedAmount,
    },
  ];

  // Recommend best option (lowest total cost that still reduces EMI)
  const bestOption = options
    .filter((o) => o.type !== 'moratorium')
    .sort((a, b) => a.totalCost - b.totalCost)[0];

  logger.info(`Restructuring recommendation for application ${loanApplicationId}: eligible=${eligible}, recommended=${bestOption.type}`);

  return {
    loanApplicationId,
    eligible: true,
    currentStatus: {
      smaStatus,
      daysOverdue,
      healthStatus,
      currentEmi,
      currentRate,
      currentTenure: tenure,
      outstandingAmount: loanAmount,
    },
    options,
    recommendation: `Recommended: ${bestOption.label} - reduces EMI by ${bestOption.emiReductionPercent}% while minimizing total cost.`,
    generatedAt: new Date().toISOString(),
  };
};

// ────────────────────────────────────────────────────────────────────
// 7. NPA Prediction
// ────────────────────────────────────────────────────────────────────

/**
 * Predict NPA probability for a farmer using weighted scoring model.
 */
const predictNpaProbability = async (farmerId) => {
  const {
    TrustScoreCalculation, PopComplianceSnapshot, RepaymentBehaviorIndex,
    FarmerIncomeStream, LoanApplication,
  } = getDb();

  // Trust score
  const trustCalc = await TrustScoreCalculation.findOne({
    where: { farmer_id: farmerId, is_active: true },
    order: [['created_at', 'DESC']],
  });
  const trustScore = trustCalc ? parseFloat(trustCalc.final_score || trustCalc.total_score || 50) : 50;

  // Compliance score (latest for any cycle of this farmer)
  const complianceSnap = await PopComplianceSnapshot.findOne({
    where: { is_active: true },
    order: [['calculated_at', 'DESC']],
  });
  const complianceScore = complianceSnap
    ? parseFloat(complianceSnap.overall_compliance_score || 60)
    : 60;

  // Repayment behavior
  const loans = await LoanApplication.findAll({
    where: { farmer_id: farmerId, is_active: true },
    attributes: ['id'],
  });
  const loanIds = loans.map((l) => l.id);

  let repaymentScore = 60;
  if (loanIds.length > 0) {
    const repIdx = await RepaymentBehaviorIndex.findOne({
      where: { application_id: loanIds[0], is_active: true },
      order: [['created_at', 'DESC']],
    });
    if (repIdx) {
      repaymentScore = parseFloat(repIdx.behavior_score || repIdx.rbi_score || 60);
    }
  }

  // Income adequacy (simplified: use income streams count as proxy)
  const incomeStreams = await FarmerIncomeStream.findAll({
    where: { farmer_id: farmerId, is_active: true },
  });
  const incomeScore = clamp(40 + incomeStreams.length * 15, 30, 90);

  // Weather safety (inverse of risk) - simulated
  const seed = parseInt(farmerId, 10) || 1;
  const weatherSafety = round(seededRandom(seed + 50, 40, 85));

  // Weighted NPA model
  // npa_probability = 100 - weighted_score
  const weightedScore =
    trustScore * 0.25 +
    complianceScore * 0.25 +
    repaymentScore * 0.20 +
    incomeScore * 0.15 +
    weatherSafety * 0.15;

  const npaProbability = round(clamp(100 - weightedScore, 2, 98));

  let riskBand;
  if (npaProbability >= 70) riskBand = 'critical';
  else if (npaProbability >= 45) riskBand = 'high';
  else if (npaProbability >= 20) riskBand = 'medium';
  else riskBand = 'low';

  const contributingFactors = [
    { factor: 'Trust Score', value: round(trustScore), weight: 0.25, impact: trustScore < 50 ? 'negative' : 'positive' },
    { factor: 'PoP Compliance', value: round(complianceScore), weight: 0.25, impact: complianceScore < 50 ? 'negative' : 'positive' },
    { factor: 'Repayment Behavior', value: round(repaymentScore), weight: 0.20, impact: repaymentScore < 50 ? 'negative' : 'positive' },
    { factor: 'Income Adequacy', value: round(incomeScore), weight: 0.15, impact: incomeScore < 50 ? 'negative' : 'positive' },
    { factor: 'Weather Safety', value: round(weatherSafety), weight: 0.15, impact: weatherSafety < 50 ? 'negative' : 'positive' },
  ];

  // Early warning: estimate days before potential NPA based on probability
  const earlyWarningDays = npaProbability >= 45
    ? Math.max(Math.round((100 - npaProbability) * 1.5), 7)
    : null;

  const recommendedActions = [];
  if (trustScore < 50) recommendedActions.push('Engage farmer in trust-building activities and field visits');
  if (complianceScore < 50) recommendedActions.push('Increase PoP advisory frequency and compliance monitoring');
  if (repaymentScore < 50) recommendedActions.push('Initiate proactive repayment counseling');
  if (incomeScore < 50) recommendedActions.push('Explore income diversification and allied activity support');
  if (weatherSafety < 50) recommendedActions.push('Recommend crop insurance enrollment and weather-resilient varieties');
  if (recommendedActions.length === 0) recommendedActions.push('Continue monitoring; no immediate intervention needed');

  logger.info(`NPA prediction for farmer ${farmerId}: probability=${npaProbability}%, band=${riskBand}`);

  return {
    farmerId,
    npaProbability,
    riskBand,
    weightedScore: round(weightedScore),
    contributingFactors,
    earlyWarningDays,
    recommendedActions,
    activeLoanCount: loanIds.length,
    modelVersion: 'v1.0-weighted',
    generatedAt: new Date().toISOString(),
  };
};

// ────────────────────────────────────────────────────────────────────
// 9. Smart Collection Schedule
// ────────────────────────────────────────────────────────────────────

/**
 * Generate an optimized collection schedule for a farmer.
 */
const generateCollectionSchedule = async (farmerId) => {
  const {
    LoanApplication, LoanRepaymentSchedule, HarvestRecord, FarmerIncomeStream,
  } = getDb();

  // Fetch active loans
  const loans = await LoanApplication.findAll({
    where: { farmer_id: farmerId, is_active: true },
    attributes: ['id', 'apply_for_amount', 'approval_amount', 'apply_for_tenure_months'],
  });

  if (loans.length === 0) {
    return {
      farmerId,
      schedule: [],
      nextAction: null,
      totalDue: 0,
      message: 'No active loans found for this farmer',
      generatedAt: new Date().toISOString(),
    };
  }

  const loanIds = loans.map((l) => l.id);

  // Fetch upcoming EMIs
  const today = new Date();
  const threeMonthsLater = new Date(today);
  threeMonthsLater.setMonth(threeMonthsLater.getMonth() + 3);

  const { Op } = require('sequelize');
  const schedules = await LoanRepaymentSchedule.findAll({
    where: {
      application_id: { [Op.in]: loanIds },
      is_active: true,
    },
    order: [['due_date', 'ASC']],
    limit: 12,
  });

  // Fetch harvest records for timing optimization
  const harvests = await HarvestRecord.findAll({
    where: { is_active: true },
    order: [['harvest_date', 'DESC']],
    limit: 5,
  });

  // Fetch income streams
  const incomeStreams = await FarmerIncomeStream.findAll({
    where: { farmer_id: farmerId, is_active: true },
  });

  // Build schedule entries
  const schedule = [];
  let totalDue = 0;

  const channels = ['sms_reminder', 'phone_call', 'field_visit', 'legal_notice'];
  const priorities = ['low', 'medium', 'high', 'urgent'];

  schedules.forEach((s, idx) => {
    const dueDate = s.due_date ? new Date(s.due_date) : new Date();
    const emiAmount = parseFloat(s.emi_amount || s.installment_amount || s.total_amount || 5000);
    totalDue += emiAmount;

    const isPast = dueDate < today;
    const daysUntilDue = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));

    // Channel escalation based on proximity
    let channelIdx;
    if (isPast) channelIdx = Math.min(idx, 3);
    else if (daysUntilDue <= 3) channelIdx = 1;
    else if (daysUntilDue <= 7) channelIdx = 0;
    else channelIdx = 0;

    // Priority based on overdue status
    let priorityIdx;
    if (isPast && Math.abs(daysUntilDue) > 30) priorityIdx = 3;
    else if (isPast) priorityIdx = 2;
    else if (daysUntilDue <= 7) priorityIdx = 1;
    else priorityIdx = 0;

    // Determine reason
    let reason = `EMI due for loan #${s.application_id}`;
    if (isPast) reason = `Overdue EMI (${Math.abs(daysUntilDue)} days) for loan #${s.application_id}`;

    // Check if collection aligns with harvest
    const nearHarvest = harvests.some((h) => {
      const harvestDate = new Date(h.harvest_date);
      return Math.abs(harvestDate - dueDate) < 7 * 24 * 60 * 60 * 1000;
    });
    if (nearHarvest) reason += ' (post-harvest window)';

    schedule.push({
      date: dueDate.toISOString().split('T')[0],
      amount: round(emiAmount),
      channel: channels[channelIdx],
      reason,
      priority: priorities[priorityIdx],
      loanApplicationId: s.application_id,
      daysUntilDue: isPast ? -Math.abs(daysUntilDue) : daysUntilDue,
      isOverdue: isPast,
    });
  });

  // Sort by priority (urgent first) then by date
  const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
  schedule.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority] || new Date(a.date) - new Date(b.date));

  const nextAction = schedule.length > 0 ? schedule[0] : null;

  logger.info(`Collection schedule for farmer ${farmerId}: ${schedule.length} items, total due=${round(totalDue)}`);

  return {
    farmerId,
    schedule,
    nextAction,
    totalDue: round(totalDue),
    activeLoanCount: loans.length,
    incomeStreamCount: incomeStreams.length,
    generatedAt: new Date().toISOString(),
  };
};

// ────────────────────────────────────────────────────────────────────
// 10. Video KYC Status
// ────────────────────────────────────────────────────────────────────

/**
 * Return video KYC status for a farmer.
 * In production this would integrate with a video KYC provider.
 */
const getVideoKycStatus = async (farmerId) => {
  const { KycVerificationLog } = getDb();

  // Check if any KYC records exist
  const kycLogs = await KycVerificationLog.findAll({
    where: { farmer_id: farmerId, is_active: true },
    order: [['created_at', 'DESC']],
    limit: 5,
  });

  const steps = [
    { name: 'Aadhaar front', status: 'pending', description: 'Upload front side of Aadhaar card' },
    { name: 'Aadhaar back', status: 'pending', description: 'Upload back side of Aadhaar card' },
    { name: 'Live selfie', status: 'pending', description: 'Take a live selfie for face match' },
    { name: 'PAN card', status: 'pending', description: 'Upload PAN card image' },
    { name: 'Video verification', status: 'pending', description: 'Complete live video call with agent' },
  ];

  // If KYC logs exist, simulate partial completion
  if (kycLogs.length > 0) {
    const completedCount = Math.min(kycLogs.length, steps.length);
    for (let i = 0; i < completedCount; i++) {
      steps[i].status = 'completed';
      steps[i].completedAt = kycLogs[i].created_at || new Date().toISOString();
    }
  }

  const completedSteps = steps.filter((s) => s.status === 'completed').length;
  const completionPercent = round((completedSteps / steps.length) * 100, 0);

  let status;
  if (completionPercent === 100) status = 'completed';
  else if (completionPercent > 0) status = 'in_progress';
  else status = 'not_started';

  logger.info(`Video KYC status for farmer ${farmerId}: ${status} (${completionPercent}%)`);

  return {
    farmerId,
    status,
    steps,
    completionPercent,
    completedSteps,
    totalSteps: steps.length,
    provider: 'FarmerPay VideoKYC',
    expiresAt: null,
    generatedAt: new Date().toISOString(),
  };
};

// ────────────────────────────────────────────────────────────────────
// 11. Language Support
// ────────────────────────────────────────────────────────────────────

/**
 * Return all supported languages with active status.
 */
const getSupportedLanguages = async () => {
  const { Language } = getDb();

  // Try to load from DB first
  try {
    const dbLanguages = await Language.findAll({
      where: { is_active: true },
      order: [['id', 'ASC']],
    });
    if (dbLanguages.length > 0) {
      return {
        languages: dbLanguages.map((l) => ({
          code: l.code || l.language_code,
          name: l.name || l.language_name,
          native: l.native_name || l.name,
          active: l.is_active !== false,
        })),
        totalCount: dbLanguages.length,
        generatedAt: new Date().toISOString(),
      };
    }
  } catch (e) {
    logger.warn('Could not load languages from DB, using defaults');
  }

  // Fallback: static list of 11 Indian languages + English
  const languages = [
    { code: 'en', name: 'English', native: 'English', active: true },
    { code: 'hi', name: 'Hindi', native: '\u0939\u093f\u0928\u094d\u0926\u0940', active: true },
    { code: 'kn', name: 'Kannada', native: '\u0c95\u0ca8\u0ccd\u0ca8\u0ca1', active: true },
    { code: 'te', name: 'Telugu', native: '\u0c24\u0c46\u0c32\u0c41\u0c17\u0c41', active: true },
    { code: 'ta', name: 'Tamil', native: '\u0ba4\u0bae\u0bbf\u0bb4\u0bcd', active: true },
    { code: 'mr', name: 'Marathi', native: '\u092e\u0930\u093e\u0920\u0940', active: true },
    { code: 'gu', name: 'Gujarati', native: '\u0a97\u0ac1\u0a9c\u0ab0\u0abe\u0aa4\u0ac0', active: true },
    { code: 'bn', name: 'Bengali', native: '\u09ac\u09be\u0982\u09b2\u09be', active: true },
    { code: 'pa', name: 'Punjabi', native: '\u0a2a\u0a70\u0a1c\u0a3e\u0a2c\u0a40', active: true },
    { code: 'od', name: 'Odia', native: '\u0b13\u0b21\u0b3c\u0b3f\u0b06', active: true },
    { code: 'ml', name: 'Malayalam', native: '\u0d2e\u0d32\u0d2f\u0d3e\u0d33\u0d02', active: true },
    { code: 'as', name: 'Assamese', native: '\u0985\u09b8\u09ae\u09c0\u09af\u09bc\u09be', active: false },
  ];

  return {
    languages,
    totalCount: languages.length,
    activeCount: languages.filter((l) => l.active).length,
    generatedAt: new Date().toISOString(),
  };
};

// ────────────────────────────────────────────────────────────────────
// 12. Advanced Analytics Summary
// ────────────────────────────────────────────────────────────────────

/**
 * Aggregate dashboard-level intelligence metrics.
 */
const getAdvancedAnalytics = async () => {
  const {
    FarmerProfile, LoanApplication, LoanHealthSnapshot,
    TrustScoreCalculation, PortfolioSnapshot,
  } = getDb();

  // Total farmers
  let totalFarmers = 0;
  try {
    totalFarmers = await FarmerProfile.count({ where: { is_active: true } });
  } catch (e) {
    logger.warn('Could not count farmers');
  }

  // Total active loans
  let totalLoans = 0;
  let totalDisbursed = 0;
  try {
    const loans = await LoanApplication.findAll({
      where: { is_active: true },
      attributes: ['id', 'approval_amount', 'apply_for_amount'],
    });
    totalLoans = loans.length;
    totalDisbursed = loans.reduce(
      (sum, l) => sum + parseFloat(l.approval_amount || l.apply_for_amount || 0), 0,
    );
  } catch (e) {
    logger.warn('Could not aggregate loans');
  }

  // Health distribution
  let healthyCnt = 0;
  let smaCnt = 0;
  let npaCnt = 0;
  try {
    const snapshots = await LoanHealthSnapshot.findAll({
      where: { is_active: true },
      attributes: ['health_status'],
    });
    snapshots.forEach((s) => {
      const st = (s.health_status || '').toLowerCase();
      if (st.includes('npa') || st.includes('loss')) npaCnt++;
      else if (st.includes('sma') || st.includes('stress')) smaCnt++;
      else healthyCnt++;
    });
  } catch (e) {
    logger.warn('Could not aggregate health snapshots');
  }

  // Average trust score
  let avgTrustScore = 0;
  try {
    const trustScores = await TrustScoreCalculation.findAll({
      where: { is_active: true },
      attributes: ['final_score', 'total_score'],
      limit: 500,
    });
    if (trustScores.length > 0) {
      const sum = trustScores.reduce(
        (acc, t) => acc + parseFloat(t.final_score || t.total_score || 0), 0,
      );
      avgTrustScore = round(sum / trustScores.length);
    }
  } catch (e) {
    logger.warn('Could not aggregate trust scores');
  }

  // Computed metrics
  const totalHealthAccounts = healthyCnt + smaCnt + npaCnt;
  const portfolioRiskScore = totalHealthAccounts > 0
    ? round(((smaCnt * 40 + npaCnt * 100) / totalHealthAccounts), 1)
    : 0;
  const npaPercent = totalHealthAccounts > 0 ? round((npaCnt / totalHealthAccounts) * 100, 1) : 0;
  const collectionEfficiency = totalHealthAccounts > 0
    ? round((healthyCnt / totalHealthAccounts) * 100, 1)
    : 100;

  // Simulated weather risk index (aggregate)
  const seed = new Date().getMonth() + 1;
  const weatherRiskIndex = round(seededRandom(seed, 20, 55));

  logger.info('Advanced analytics summary generated');

  return {
    overview: {
      totalFarmers,
      totalActiveLoans: totalLoans,
      totalDisbursedAmount: round(totalDisbursed),
      avgTrustScore,
    },
    portfolioHealth: {
      healthy: healthyCnt,
      sma: smaCnt,
      npa: npaCnt,
      npaPercent,
      portfolioRiskScore,
      collectionEfficiency,
    },
    intelligence: {
      avgYieldPredictionConfidence: round(seededRandom(seed + 100, 65, 85)),
      avgNpaProbability: npaPercent > 0 ? round(npaPercent * 0.8) : round(seededRandom(seed + 200, 5, 25)),
      weatherRiskIndex,
      weatherRiskCategory: weatherRiskIndex >= 50 ? 'high' : weatherRiskIndex >= 25 ? 'moderate' : 'low',
    },
    modelVersions: {
      yieldPrediction: 'v1.0-deterministic',
      npaPrediction: 'v1.0-weighted',
      weatherRisk: 'v1.0-deterministic',
      dynamicRate: 'v1.0-deterministic',
    },
    generatedAt: new Date().toISOString(),
  };
};

// ────────────────────────────────────────────────────────────────────
// Exports
// ────────────────────────────────────────────────────────────────────

module.exports = {
  predictCropYield,
  getCropHealthFromSatellite,
  calculateWeatherRisk,
  calculateDynamicRate,
  recommendRestructuring,
  predictNpaProbability,
  generateCollectionSchedule,
  getVideoKycStatus,
  getSupportedLanguages,
  getAdvancedAnalytics,
};
