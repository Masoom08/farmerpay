/**
 * DRISHTI Snapshot Builder
 *
 * Creates a frozen-in-time DrishtiFarmerSnapshot by reading (never writing)
 * cross-module data: FARMER, ROOTS (crop/dairy/fishery), DICE, TRUST,
 * SENTINEL, PULSE, SAGE, INSURANCE, and DRISHTI household tables.
 *
 * Design decisions:
 *  - Snapshot-then-compute: every engine runs against a snapshot, not live data.
 *  - Redis-cached (1h TTL): avoids rebuilding for back-to-back scenarios.
 *  - Graceful degradation: missing module data fills with nulls + data_gaps flag.
 *  - Read-only: DRISHTI never writes to other modules' tables.
 */

const { Op } = require('sequelize');
const logger = require('../../../shared/utils/logger');
const { generateUUID } = require('../../../shared/utils/uuidHelper');
const { getKey, setWithTTL, deleteKeys } = require('../../../config/redis');

const CACHE_TTL = 3600; // 1 hour
const CACHE_PREFIX = 'drishti:farmer_snapshot';

let db;
const getDb = () => { if (!db) db = require('../../../shared/models'); return db; };

// ─── Public API ─────────────────────────────────────────────────────

/**
 * Build or retrieve a cached snapshot for a farmer.
 * @param {number} farmerId - Internal user ID
 * @param {object} [options]
 * @param {boolean} [options.forceRefresh=false] - Bypass cache and rebuild
 * @returns {object} { snapshot, snapshotId, snapshotUuid, dataGaps }
 */
const buildSnapshot = async (farmerId, options = {}) => {
  const { forceRefresh = false } = options;
  const cacheKey = `${CACHE_PREFIX}:${farmerId}`;

  // 1. Check cache unless forced refresh
  if (!forceRefresh) {
    try {
      const cached = await getKey(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        logger.info(`DRISHTI: snapshot cache hit for farmer ${farmerId} (id=${parsed.snapshotId})`);
        return parsed;
      }
    } catch (cacheErr) {
      logger.warn(`DRISHTI: snapshot cache read failed for farmer ${farmerId}: ${cacheErr.message}`);
    }
  }

  // 2. Build from cross-module data
  logger.info(`DRISHTI: building fresh snapshot for farmer ${farmerId}`);
  const dataGaps = [];

  // Phase A: fetch farmer profile first (SAGE depends on district_id)
  const farmerData = await fetchFarmerData(farmerId, dataGaps);

  // Phase B: all other fetchers run in parallel
  const [
    rootsData,
    diceData,
    trustData,
    sentinelData,
    pulseData,
    sageData,
    insuranceData,
    householdData,
  ] = await Promise.all([
    fetchRootsData(farmerId, dataGaps),
    fetchDiceData(farmerId, dataGaps),
    fetchTrustData(farmerId, dataGaps),
    fetchSentinelData(farmerId, dataGaps),
    fetchPulseData(farmerId, dataGaps),
    fetchSageData(farmerId, farmerData, dataGaps),
    fetchInsuranceData(farmerId, dataGaps),
    fetchHouseholdData(farmerId, dataGaps),
  ]);

  // Phase C: AA financial intelligence overlay (optional, non-blocking)
  let aaData = null;
  let aaDataAvailable = false;
  let incomeVerificationSource = 'self_reported';

  try {
    const { getDrishtiInputs } = require('../../aa/services/aaCrossModuleBridge');
    aaData = await getDrishtiInputs(farmerId, { callerRole: 'system' });

    if (aaData) {
      aaDataAvailable = true;

      // Overlay AA-observed income onto self-reported household data
      if (aaData.householdIncome && aaData.householdIncome.totalMonthly > 0) {
        householdData.totalNonFarmMonthly = aaData.householdIncome.totalMonthly;
        householdData.wageLaborMonthly = aaData.householdIncome.nonFarmIncome || householdData.wageLaborMonthly;
        householdData.govtTransfersAnnual = (aaData.householdIncome.govtTransfers || 0) * 12 || householdData.govtTransfersAnnual;
        householdData.incomeDetails = {
          ...householdData.incomeDetails,
          aaVerified: true,
          aaCategories: aaData.householdIncome.byCategory || {},
        };
        incomeVerificationSource = 'account_aggregator';
      }

      // Overlay AA-observed expenses
      if (aaData.householdExpense && aaData.householdExpense.totalMonthly > 0) {
        householdData.totalHouseholdExpenseMonthly = aaData.householdExpense.totalMonthly;
        householdData.expenseDetails = {
          ...householdData.expenseDetails,
          aaVerified: true,
          aaCategories: aaData.householdExpense.byCategory || {},
        };
      }

      // If only partial data was overlaid, mark as mixed
      if (incomeVerificationSource === 'self_reported' && aaData.seasonality) {
        incomeVerificationSource = 'mixed';
      }

      logger.info(`DRISHTI: AA data overlaid for farmer ${farmerId} — source=${incomeVerificationSource}`);
    }
  } catch (aaErr) {
    // AA module is optional — graceful fallback to self-reported data
    logger.warn(`DRISHTI: AA data unavailable for farmer ${farmerId}: ${aaErr.message}`);
    dataGaps.push({ module: 'AA', reason: `AA data fetch failed: ${aaErr.message}` });
  }

  // 3. Persist snapshot
  const { DrishtiFarmerSnapshot } = getDb();
  const snapshotUuid = generateUUID();
  const today = new Date().toISOString().split('T')[0];

  const snapshot = await DrishtiFarmerSnapshot.create({
    snapshot_uuid: snapshotUuid,
    farmer_id: farmerId,
    snapshot_date: today,

    // FARMER
    total_farm_size_hectares: farmerData.totalFarmSizeHectares,
    land_ownership_type: farmerData.landOwnershipType,
    years_farming_experience: farmerData.yearsFarmingExperience,
    education_level: farmerData.educationLevel,
    family_size: farmerData.familySize,
    district_id: farmerData.districtId,
    block_id: farmerData.blockId,

    // ROOTS activities
    active_crop_cycles: rootsData.activeCropCycles,
    active_dairy_profile: rootsData.activeDairyProfile,
    active_fishery_profile: rootsData.activeFisheryProfile,
    horticulture_profile: rootsData.horticultureProfile,

    // ROOTS historical
    historical_crop_profitability: rootsData.historicalCropProfitability,
    historical_dairy_profitability: rootsData.historicalDairyProfitability,
    historical_fishery_profitability: rootsData.historicalFisheryProfitability,

    // DICE
    active_loans: diceData.activeLoans,
    total_outstanding: diceData.totalOutstanding,
    total_monthly_emi: diceData.totalMonthlyEmi,

    // TRUST
    trust_score: trustData.trustScore,
    trust_band: trustData.trustBand,

    // SENTINEL
    income_adequacy_status: sentinelData.incomeAdequacyStatus,
    loan_to_income_ratio: sentinelData.loanToIncomeRatio,
    risk_severity_band: sentinelData.riskSeverityBand,

    // PULSE
    relevant_commodity_prices: pulseData.commodityPrices,

    // SAGE
    weather_outlook: sageData.weatherOutlook,

    // INSURANCE
    active_insurance: insuranceData.activeInsurance,

    // HOUSEHOLD INCOME
    household_income_details: householdData.incomeDetails,
    spouse_shg_monthly: householdData.spouseShgMonthly,
    wage_labor_monthly: householdData.wageLaborMonthly,
    mgnrega_annual: householdData.mgnregaAnnual,
    pension_monthly: householdData.pensionMonthly,
    remittance_monthly: householdData.remittanceMonthly,
    petty_business_monthly: householdData.pettyBusinessMonthly,
    govt_transfers_annual: householdData.govtTransfersAnnual,
    rental_income_monthly: householdData.rentalIncomeMonthly,
    other_income_monthly: householdData.otherIncomeMonthly,
    total_non_farm_monthly: householdData.totalNonFarmMonthly,
    non_farm_income_streams: householdData.nonFarmIncomeStreams,

    // HOUSEHOLD EXPENSES
    household_expense_details: householdData.expenseDetails,
    food_groceries_monthly: householdData.foodGroceriesMonthly,
    education_monthly: householdData.educationMonthly,
    healthcare_monthly: householdData.healthcareMonthly,
    housing_monthly: householdData.housingMonthly,
    social_obligations_annual: householdData.socialObligationsAnnual,
    transportation_monthly: householdData.transportationMonthly,
    utilities_monthly: householdData.utilitiesMonthly,
    non_farm_loan_emi_monthly: householdData.nonFarmLoanEmiMonthly,
    total_household_expense_monthly: householdData.totalHouseholdExpenseMonthly,

    // HOUSEHOLD CONTEXT
    family_members_count: householdData.familyMembersCount,
    earning_members_count: householdData.earningMembersCount,
    dependents_count: householdData.dependentsCount,
    spouse_occupation: householdData.spouseOccupation,
    primary_non_farm_occupation: householdData.primaryNonFarmOccupation,

    // AA FINANCIAL INTELLIGENCE (V2)
    aa_data_available: aaDataAvailable,
    income_verification_source: incomeVerificationSource,
    aa_seasonality: aaData ? aaData.seasonality : null,
    aa_emi_capacity: aaData ? aaData.emiCapacity : null,
  });

  const result = {
    snapshotId: snapshot.id,
    snapshotUuid,
    snapshotDate: today,
    dataGaps,
  };

  // 4. Cache the result
  try {
    await setWithTTL(cacheKey, JSON.stringify(result), CACHE_TTL);
  } catch (cacheErr) {
    logger.warn(`DRISHTI: snapshot cache write failed for farmer ${farmerId}: ${cacheErr.message}`);
  }

  logger.info(`DRISHTI: snapshot created for farmer ${farmerId} — id=${snapshot.id}, gaps=${dataGaps.length}`);
  return result;
};

/**
 * Invalidate the cached snapshot for a farmer (call when underlying data changes).
 */
const invalidateSnapshot = async (farmerId) => {
  await deleteKeys([`${CACHE_PREFIX}:${farmerId}`]);
};

// ─── Cross-Module Data Fetchers (all read-only) ─────────────────────

/**
 * FARMER module: demographics, land, location.
 */
const fetchFarmerData = async (farmerId, dataGaps) => {
  const { FarmerProfile, FarmerAddress } = getDb();
  const result = {
    totalFarmSizeHectares: null,
    landOwnershipType: null,
    yearsFarmingExperience: null,
    educationLevel: null,
    familySize: null,
    districtId: null,
    blockId: null,
  };

  try {
    const profile = await FarmerProfile.findOne({
      where: { farmer_id: farmerId, is_active: true },
    });

    if (profile) {
      result.totalFarmSizeHectares = profile.total_farm_size_hectares;
      result.landOwnershipType = profile.land_ownership_type;
      result.yearsFarmingExperience = profile.years_farming_experience;
      result.educationLevel = profile.education_level;
      // family_size not a direct column on FarmerProfile — derive from household context
    } else {
      dataGaps.push({ module: 'FARMER', reason: 'No farmer profile found' });
    }

    // Primary address → district + block
    const address = await FarmerAddress.findOne({
      where: { farmer_id: farmerId, is_active: true, is_primary_address: true },
    });
    if (address) {
      result.districtId = address.lgd_district_id;
      result.blockId = address.lgd_block_id;
    } else {
      // Fallback: any active address
      const anyAddress = await FarmerAddress.findOne({
        where: { farmer_id: farmerId, is_active: true },
        order: [['created_at', 'DESC']],
      });
      if (anyAddress) {
        result.districtId = anyAddress.lgd_district_id;
        result.blockId = anyAddress.lgd_block_id;
      } else {
        dataGaps.push({ module: 'FARMER', reason: 'No address found — district/block unknown' });
      }
    }
  } catch (err) {
    logger.error(`DRISHTI: fetchFarmerData failed for farmer ${farmerId}: ${err.message}`);
    dataGaps.push({ module: 'FARMER', reason: `Query failed: ${err.message}` });
  }

  return result;
};

/**
 * ROOTS module: active crop cycles, dairy/fishery profiles, historical profitability.
 */
const fetchRootsData = async (farmerId, dataGaps) => {
  const {
    CultivationCycle, CultivationCycleProfitability,
    DairyHerdRegister, DairyAnimal, DairyProfitabilitySummary,
    FisheryPondRegister, FisheryIncomeSummary, FisheryExpenseSummary,
    FarmerActivitySubscription,
  } = getDb();

  const result = {
    activeCropCycles: null,
    activeDairyProfile: null,
    activeFisheryProfile: null,
    horticultureProfile: null,
    historicalCropProfitability: null,
    historicalDairyProfitability: null,
    historicalFisheryProfitability: null,
  };

  try {
    // ── Active crop cycles ──
    const cropCycles = await CultivationCycle.findAll({
      where: {
        farmer_id: farmerId,
        is_active: true,
        cycle_status: { [Op.notIn]: ['closed', 'post_harvest'] },
      },
      order: [['cycle_sowing_date', 'DESC']],
      limit: 10,
    });

    if (cropCycles.length > 0) {
      result.activeCropCycles = cropCycles.map(c => ({
        cycleId: c.id,
        cycleUuid: c.cycle_uuid,
        cropId: c.crop_id,
        varietyId: c.variety_id,
        season: c.cycle_season,
        year: c.cycle_year,
        status: c.cycle_status,
        sowingDate: c.cycle_sowing_date,
        expectedHarvestDate: c.cycle_expected_harvest_date,
      }));
    }

    // ── Historical crop profitability (last 3 seasons) ──
    const historicalCycles = await CultivationCycle.findAll({
      where: {
        farmer_id: farmerId,
        is_active: true,
        cycle_status: { [Op.in]: ['closed', 'post_harvest'] },
      },
      include: [{
        model: CultivationCycleProfitability,
        as: 'profitability',
        required: false,
      }],
      order: [['cycle_sowing_date', 'DESC']],
      limit: 9, // ~3 seasons × 3 crops max
    });

    if (historicalCycles.length > 0) {
      result.historicalCropProfitability = historicalCycles
        .filter(c => c.profitability)
        .map(c => ({
          season: c.cycle_season,
          year: c.cycle_year,
          cropId: c.crop_id,
          expectedProfit: parseFloat(c.profitability.expected_profit) || 0,
          actualProfit: parseFloat(c.profitability.actual_profit) || 0,
          isProfitable: c.profitability.is_profitable,
        }));
    }

    // ── Active dairy profile ──
    const herd = await DairyHerdRegister.findOne({
      where: { farmer_id: farmerId, is_active: true },
    });

    if (herd) {
      const animalCount = await DairyAnimal.count({
        where: { farmer_id: farmerId, is_active: true },
      });

      // Latest 12 months profitability
      const now = new Date();
      const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 12, 1);
      const dairyProfit = await DairyProfitabilitySummary.findAll({
        where: {
          herd_id: herd.id,
          is_active: true,
          [Op.or]: [
            { summary_year: { [Op.gt]: twelveMonthsAgo.getFullYear() } },
            {
              summary_year: twelveMonthsAgo.getFullYear(),
              summary_month: { [Op.gte]: twelveMonthsAgo.getMonth() + 1 },
            },
          ],
        },
        order: [['summary_year', 'DESC'], ['summary_month', 'DESC']],
      });

      result.activeDairyProfile = {
        herdId: herd.id,
        registerName: herd.register_name,
        animalCount,
      };

      if (dairyProfit.length > 0) {
        result.historicalDairyProfitability = dairyProfit.map(dp => ({
          month: dp.summary_month,
          year: dp.summary_year,
          totalIncome: parseFloat(dp.total_income) || 0,
          totalExpense: parseFloat(dp.total_expense) || 0,
          netProfit: parseFloat(dp.net_profit) || 0,
        }));
      }
    }

    // ── Active fishery profile ──
    const fishRegister = await FisheryPondRegister.findOne({
      where: { farmer_id: farmerId, is_active: true },
    });

    if (fishRegister) {
      result.activeFisheryProfile = {
        registerId: fishRegister.id,
        registerName: fishRegister.register_name,
        totalPondAreaHectares: parseFloat(fishRegister.total_pond_area_hectares) || 0,
      };

      // Historical fishery profitability (last 12 months)
      const now = new Date();
      const fishIncome = await FisheryIncomeSummary.findAll({
        where: {
          register_id: fishRegister.id,
          is_active: true,
          [Op.or]: [
            { income_year: { [Op.gt]: now.getFullYear() - 1 } },
            { income_year: now.getFullYear() - 1, income_month: { [Op.gte]: now.getMonth() + 1 } },
          ],
        },
        order: [['income_year', 'DESC'], ['income_month', 'DESC']],
      });

      const fishExpense = await FisheryExpenseSummary.findAll({
        where: {
          register_id: fishRegister.id,
          is_active: true,
          [Op.or]: [
            { expense_year: { [Op.gt]: now.getFullYear() - 1 } },
            { expense_year: now.getFullYear() - 1, expense_month: { [Op.gte]: now.getMonth() + 1 } },
          ],
        },
      });

      // Merge income + expense by month
      const expenseMap = {};
      fishExpense.forEach(e => {
        expenseMap[`${e.expense_year}-${e.expense_month}`] = parseFloat(e.total_expense) || 0;
      });

      if (fishIncome.length > 0) {
        result.historicalFisheryProfitability = fishIncome.map(fi => {
          const key = `${fi.income_year}-${fi.income_month}`;
          const totalIncome = parseFloat(fi.total_income) || 0;
          const totalExpense = expenseMap[key] || 0;
          return {
            month: fi.income_month,
            year: fi.income_year,
            totalIncome,
            totalExpense,
            netProfit: totalIncome - totalExpense,
          };
        });
      }
    }

    // ── Horticulture: check activity subscription ──
    const hortiSub = await FarmerActivitySubscription.findOne({
      where: { farmer_id: farmerId, activity_code: 'HORTI', status: 'ACTIVE' },
    });
    if (hortiSub) {
      result.horticultureProfile = { subscribed: true, tier: hortiSub.auto_derived_tier };
    }

  } catch (err) {
    logger.error(`DRISHTI: fetchRootsData failed for farmer ${farmerId}: ${err.message}`);
    dataGaps.push({ module: 'ROOTS', reason: `Query failed: ${err.message}` });
  }

  return result;
};

/**
 * DICE module: active loans, outstanding, EMIs.
 */
const fetchDiceData = async (farmerId, dataGaps) => {
  const { LoanApplication, LoanProduct, LoanRepaymentSchedule, LoanHealthSnapshot } = getDb();

  const result = {
    activeLoans: null,
    totalOutstanding: 0,
    totalMonthlyEmi: 0,
  };

  try {
    const activeStatuses = ['approved', 'disbursed', 'active'];
    const loans = await LoanApplication.findAll({
      where: {
        farmer_id: farmerId,
        is_active: true,
        application_status: { [Op.in]: activeStatuses },
      },
      include: [
        { model: LoanProduct, as: 'product', attributes: ['product_name', 'repayment_type'] },
      ],
    });

    if (loans.length > 0) {
      const loanDetails = [];

      for (const loan of loans) {
        // Latest health snapshot for outstanding balance
        const healthSnap = await LoanHealthSnapshot.findOne({
          where: { application_id: loan.id, is_active: true },
          order: [['snapshot_date', 'DESC']],
        });

        // Next pending EMI
        const nextSchedule = await LoanRepaymentSchedule.findOne({
          where: { application_id: loan.id, is_active: true, status: 'pending' },
          order: [['due_date', 'ASC']],
        });

        const outstanding = healthSnap
          ? parseFloat(healthSnap.total_outstanding) || 0
          : parseFloat(loan.approval_amount) || 0;
        const emiAmount = nextSchedule ? parseFloat(nextSchedule.due_amount) || 0 : 0;

        result.totalOutstanding += outstanding;
        result.totalMonthlyEmi += emiAmount;

        loanDetails.push({
          applicationId: loan.id,
          applicationUuid: loan.application_uuid,
          productName: loan.product ? loan.product.product_name : null,
          repaymentType: loan.product ? loan.product.repayment_type : null,
          approvalAmount: parseFloat(loan.approval_amount) || 0,
          interestRate: parseFloat(loan.approval_interest_rate) || 0,
          tenureMonths: loan.approval_tenure_months,
          outstanding,
          emiAmount,
          nextDueDate: nextSchedule ? nextSchedule.due_date : null,
          healthStatus: healthSnap ? healthSnap.health_status : 'good',
        });
      }

      result.activeLoans = loanDetails;
    }
  } catch (err) {
    logger.error(`DRISHTI: fetchDiceData failed for farmer ${farmerId}: ${err.message}`);
    dataGaps.push({ module: 'DICE', reason: `Query failed: ${err.message}` });
  }

  return result;
};

/**
 * TRUST module: latest credit score and band.
 */
const fetchTrustData = async (farmerId, dataGaps) => {
  const { TrustScoreHistory } = getDb();

  const result = { trustScore: null, trustBand: null };

  try {
    const latest = await TrustScoreHistory.findOne({
      where: { farmer_id: farmerId, is_active: true },
      order: [['calculated_at', 'DESC']],
    });

    if (latest) {
      result.trustScore = latest.total_trust_score;
      result.trustBand = latest.score_band;
    } else {
      dataGaps.push({ module: 'TRUST', reason: 'No trust score history found' });
    }
  } catch (err) {
    logger.error(`DRISHTI: fetchTrustData failed for farmer ${farmerId}: ${err.message}`);
    dataGaps.push({ module: 'TRUST', reason: `Query failed: ${err.message}` });
  }

  return result;
};

/**
 * SENTINEL module: income adequacy, risk band from loan health + RSS scores.
 * Uses only registered models: LoanHealthSnapshot, RssScoreHistory, FarmerIncomeStream.
 */
const fetchSentinelData = async (farmerId, dataGaps) => {
  const { RssScoreHistory, FarmerIncomeStream, LoanHealthSnapshot, LoanApplication } = getDb();

  const result = {
    incomeAdequacyStatus: null,
    loanToIncomeRatio: null,
    riskSeverityBand: null,
  };

  try {
    const farmerLoans = await LoanApplication.findAll({
      where: { farmer_id: farmerId, is_active: true },
      attributes: ['id'],
    });

    if (farmerLoans.length > 0) {
      const loanIds = farmerLoans.map(l => l.id);

      // Derive income adequacy from loan health + income streams
      const latestHealth = await LoanHealthSnapshot.findOne({
        where: { application_id: { [Op.in]: loanIds }, is_active: true },
        order: [['snapshot_date', 'DESC']],
      });

      const incomeStreams = await FarmerIncomeStream.findAll({
        where: { farmer_id: farmerId, is_active: true },
      });

      if (latestHealth && incomeStreams.length > 0) {
        const totalAnnualIncome = incomeStreams.reduce(
          (sum, s) => sum + (parseFloat(s.annual_income) || 0), 0
        );
        const totalOutstanding = parseFloat(latestHealth.total_outstanding) || 0;

        if (totalAnnualIncome > 0) {
          const ratio = totalOutstanding / totalAnnualIncome;
          result.loanToIncomeRatio = Math.round(ratio * 100) / 100;

          // Classify adequacy based on loan-to-income ratio
          if (ratio <= 0.3) result.incomeAdequacyStatus = 'strong';
          else if (ratio <= 0.5) result.incomeAdequacyStatus = 'adequate';
          else if (ratio <= 0.7) result.incomeAdequacyStatus = 'marginal';
          else result.incomeAdequacyStatus = 'inadequate';
        }
      }

      // RSS band (risk severity)
      const latestRss = await RssScoreHistory.findOne({
        where: { application_id: { [Op.in]: loanIds }, is_active: true },
        order: [['score_date', 'DESC']],
      });
      if (latestRss) {
        result.riskSeverityBand = latestRss.rss_band;
      }
    }
  } catch (err) {
    logger.error(`DRISHTI: fetchSentinelData failed for farmer ${farmerId}: ${err.message}`);
    dataGaps.push({ module: 'SENTINEL', reason: `Query failed: ${err.message}` });
  }

  return result;
};

/**
 * PULSE module: latest market prices for farmer's active crops.
 */
const fetchPulseData = async (farmerId, dataGaps) => {
  const { PulsePriceRecord, PulsePriceForecast, CultivationCycle } = getDb();

  const result = { commodityPrices: null };

  try {
    // Determine farmer's active commodity IDs from crop cycles
    const activeCycles = await CultivationCycle.findAll({
      where: {
        farmer_id: farmerId,
        is_active: true,
        cycle_status: { [Op.notIn]: ['closed'] },
      },
      attributes: ['crop_id'],
      group: ['crop_id'],
    });

    const cropIds = activeCycles.map(c => c.crop_id).filter(Boolean);
    if (cropIds.length === 0) return result;

    const prices = [];
    for (const commodityId of cropIds) {
      // Latest price record
      const latestPrice = await PulsePriceRecord.findOne({
        where: { commodity_id: commodityId, is_active: true, quality_flag: 'clean' },
        order: [['record_date', 'DESC']],
      });

      // Latest 30-day forecast
      const forecast = await PulsePriceForecast.findOne({
        where: { commodity_id: commodityId, horizon_days: 30, is_active: true },
        order: [['forecast_date', 'DESC']],
      });

      prices.push({
        commodityId,
        currentPrice: latestPrice ? parseFloat(latestPrice.modal_price) : null,
        priceDate: latestPrice ? latestPrice.record_date : null,
        priceTrend: latestPrice ? latestPrice.price_trend : null,
        forecast30dPrice: forecast ? parseFloat(forecast.predicted_price) : null,
        forecastConfidence: forecast ? parseFloat(forecast.forecast_confidence) : null,
      });
    }

    result.commodityPrices = prices;
  } catch (err) {
    logger.error(`DRISHTI: fetchPulseData failed for farmer ${farmerId}: ${err.message}`);
    dataGaps.push({ module: 'PULSE', reason: `Query failed: ${err.message}` });
  }

  return result;
};

/**
 * SAGE module: current weather outlook for farmer's district.
 * Receives pre-resolved farmerData to get district_id.
 */
const fetchSageData = async (farmerId, farmerData, dataGaps) => {
  const { WeatherObservation } = getDb();

  const result = { weatherOutlook: null };

  try {
    const districtId = farmerData ? farmerData.districtId : null;
    if (!districtId) {
      dataGaps.push({ module: 'SAGE', reason: 'No district_id — cannot fetch weather' });
      return result;
    }

    // Latest weather observation for the district
    const latestWeather = await WeatherObservation.findOne({
      where: { lgd_district_id: districtId, is_active: true },
      order: [['observed_at', 'DESC']],
    });

    if (latestWeather) {
      result.weatherOutlook = {
        observedAt: latestWeather.observed_at,
        tempCelsius: parseFloat(latestWeather.temp_celsius) || null,
        humidityPercent: parseFloat(latestWeather.humidity_percent) || null,
        rainfallMm24h: parseFloat(latestWeather.rainfall_mm_24h) || null,
        windSpeedKmh: parseFloat(latestWeather.wind_speed_kmh) || null,
        conditionText: latestWeather.condition_text,
        source: latestWeather.source,
      };
    } else {
      dataGaps.push({ module: 'SAGE', reason: 'No weather observations for district' });
    }
  } catch (err) {
    logger.error(`DRISHTI: fetchSageData failed for farmer ${farmerId}: ${err.message}`);
    dataGaps.push({ module: 'SAGE', reason: `Query failed: ${err.message}` });
  }

  return result;
};

/**
 * INSURANCE module: active insurance enrollments.
 */
const fetchInsuranceData = async (farmerId, dataGaps) => {
  const { InsuranceEnrollment } = getDb();

  const result = { activeInsurance: null };

  try {
    const enrollments = await InsuranceEnrollment.findAll({
      where: {
        farmer_id: farmerId,
        is_active: true,
        policy_expiry_date: { [Op.gte]: new Date() },
      },
    });

    if (enrollments.length > 0) {
      result.activeInsurance = enrollments.map(e => ({
        type: e.insurance_type,
        insurerName: e.insurer_name,
        sumInsured: parseFloat(e.sum_insured) || 0,
        premiumPaid: parseFloat(e.premium_paid) || 0,
        cropInsured: e.crop_insured,
        season: e.season,
        policyExpiry: e.policy_expiry_date,
        claimStatus: e.claim_status,
      }));
    }
  } catch (err) {
    logger.error(`DRISHTI: fetchInsuranceData failed for farmer ${farmerId}: ${err.message}`);
    dataGaps.push({ module: 'INSURANCE', reason: `Query failed: ${err.message}` });
  }

  return result;
};

/**
 * DRISHTI household tables: income sources and expenses.
 */
const fetchHouseholdData = async (farmerId, dataGaps) => {
  const { DrishtiHouseholdIncomeSource, DrishtiHouseholdExpense } = getDb();

  const result = {
    incomeDetails: null,
    expenseDetails: null,
    // Income summary columns
    spouseShgMonthly: 0,
    wageLaborMonthly: 0,
    mgnregaAnnual: 0,
    pensionMonthly: 0,
    remittanceMonthly: 0,
    pettyBusinessMonthly: 0,
    govtTransfersAnnual: 0,
    rentalIncomeMonthly: 0,
    otherIncomeMonthly: 0,
    totalNonFarmMonthly: 0,
    nonFarmIncomeStreams: 0,
    // Expense summary columns
    foodGroceriesMonthly: 0,
    educationMonthly: 0,
    healthcareMonthly: 0,
    housingMonthly: 0,
    socialObligationsAnnual: 0,
    transportationMonthly: 0,
    utilitiesMonthly: 0,
    nonFarmLoanEmiMonthly: 0,
    totalHouseholdExpenseMonthly: 0,
    // Context
    familyMembersCount: 1,
    earningMembersCount: 1,
    dependentsCount: 0,
    spouseOccupation: null,
    primaryNonFarmOccupation: null,
  };

  try {
    // ── Income sources ──
    const incomeSources = await DrishtiHouseholdIncomeSource.findAll({
      where: { farmer_id: farmerId, is_active: true },
    });

    if (incomeSources.length > 0) {
      result.nonFarmIncomeStreams = incomeSources.length;

      // Build the full income_details JSON
      result.incomeDetails = {
        income_streams: incomeSources.map(s => ({
          source: s.source_type,
          label: s.source_label,
          earning_member: s.earning_member,
          amount_monthly: parseFloat(s.amount_monthly_equivalent) || 0,
          frequency: s.frequency,
          reliability: s.reliability,
          active_months: s.active_months,
        })),
        total_monthly_non_farm: 0,
        data_source: 'drishti_household_table',
      };

      // Aggregate by source_type into summary columns
      const incomeByType = {};
      for (const s of incomeSources) {
        const monthly = parseFloat(s.amount_monthly_equivalent) || 0;
        const annual = monthly * 12;
        const type = s.source_type;
        if (!incomeByType[type]) incomeByType[type] = 0;
        incomeByType[type] += monthly;
      }

      result.spouseShgMonthly = incomeByType.spouse_shg || 0;
      result.wageLaborMonthly = incomeByType.wage_labor || 0;
      result.mgnregaAnnual = (incomeByType.mgnrega || 0) * 12;
      result.pensionMonthly = incomeByType.pension || 0;
      result.remittanceMonthly = incomeByType.remittance || 0;
      result.pettyBusinessMonthly = incomeByType.petty_business || 0;
      result.govtTransfersAnnual = (incomeByType.govt_transfer || 0) * 12;
      result.rentalIncomeMonthly = incomeByType.rental || 0;
      result.otherIncomeMonthly = incomeByType.other || 0;

      result.totalNonFarmMonthly = Object.values(incomeByType).reduce((sum, v) => sum + v, 0);
      result.incomeDetails.total_monthly_non_farm = result.totalNonFarmMonthly;

      // Derive earning members from distinct earning_member values
      const earningMembers = new Set(incomeSources.map(s => s.earning_member));
      result.earningMembersCount = earningMembers.size;

      // Detect spouse occupation from SHG or petty_business entries
      const spouseEntries = incomeSources.filter(s => s.earning_member === 'spouse');
      if (spouseEntries.length > 0) {
        result.spouseOccupation = spouseEntries.map(s => s.source_label).filter(Boolean).join(', ') || null;
      }

      // Primary non-farm occupation from farmer entries that aren't farm-related
      const farmerNonFarm = incomeSources.find(
        s => s.earning_member === 'farmer' && s.source_type !== 'mgnrega' && s.source_type !== 'govt_transfer'
      );
      if (farmerNonFarm) {
        result.primaryNonFarmOccupation = farmerNonFarm.source_label || farmerNonFarm.source_type;
      }
    } else {
      dataGaps.push({ module: 'DRISHTI_HOUSEHOLD', reason: 'No household income sources recorded' });
    }

    // ── Expenses ──
    const expenses = await DrishtiHouseholdExpense.findAll({
      where: { farmer_id: farmerId, is_active: true },
    });

    if (expenses.length > 0) {
      result.expenseDetails = {
        expense_categories: expenses.map(e => ({
          category: e.category,
          label: e.category_label,
          monthly: parseFloat(e.amount_monthly_equivalent) || 0,
          frequency: e.frequency,
          peak_months: e.peak_months,
          peak_amount: parseFloat(e.peak_amount) || 0,
        })),
        total_monthly_expense: 0,
        data_source: 'drishti_household_table',
      };

      // Aggregate by category
      const expByCategory = {};
      for (const e of expenses) {
        const monthly = parseFloat(e.amount_monthly_equivalent) || 0;
        const cat = e.category;
        if (!expByCategory[cat]) expByCategory[cat] = 0;
        expByCategory[cat] += monthly;
      }

      result.foodGroceriesMonthly = expByCategory.food_groceries || 0;
      result.educationMonthly = expByCategory.education || 0;
      result.healthcareMonthly = expByCategory.healthcare || 0;
      result.housingMonthly = expByCategory.housing || 0;
      result.socialObligationsAnnual = (expByCategory.social_obligations || 0) * 12;
      result.transportationMonthly = expByCategory.transportation || 0;
      result.utilitiesMonthly = expByCategory.utilities || 0;
      result.nonFarmLoanEmiMonthly = expByCategory.non_farm_loan_emi || 0;

      result.totalHouseholdExpenseMonthly = Object.values(expByCategory).reduce((sum, v) => sum + v, 0);
      result.expenseDetails.total_monthly_expense = result.totalHouseholdExpenseMonthly;

      // Derive family context from expense categories
      if (expByCategory.education > 0) {
        result.dependentsCount = Math.max(result.dependentsCount, 1);
      }
    } else {
      dataGaps.push({ module: 'DRISHTI_HOUSEHOLD', reason: 'No household expenses recorded' });
    }

    // Estimate family_members_count from earning + dependents
    result.familyMembersCount = result.earningMembersCount + result.dependentsCount;

  } catch (err) {
    logger.error(`DRISHTI: fetchHouseholdData failed for farmer ${farmerId}: ${err.message}`);
    dataGaps.push({ module: 'DRISHTI_HOUSEHOLD', reason: `Query failed: ${err.message}` });
  }

  return result;
};

module.exports = {
  buildSnapshot,
  invalidateSnapshot,
};
