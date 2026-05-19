/**
 * Expense Detector — Layer 2 Analyzer
 * Classifies bank transaction debits into household expense categories.
 * Maps to DRISHTI household expense projector input.
 *
 * Expense Categories:
 *   1. farm_input      — Seeds, fertilizer, pesticide, feed, fuel
 *   2. emi_repayment   — Loan EMIs, KCC interest, NACH mandates
 *   3. household        — Ration, groceries, cooking gas, electricity, mobile
 *   4. education        — School fees, tuition, books, hostel
 *   5. health           — Hospital, pharmacy, doctor, insurance premium
 *   6. ceremony         — Wedding, festival, religious, funeral
 *   7. transport        — Fuel, vehicle, travel, bus, rail
 *   8. cash_withdrawal  — ATM, branch cash withdrawal
 *   9. other_debit      — Unclassified debits
 */

const DEBIT_PATTERNS = {
  farm_input: {
    keywords: [
      'FERTILIZER', 'FERTILISER', 'UREA', 'DAP', 'MOP', 'NPK',
      'PESTICIDE', 'INSECTICIDE', 'HERBICIDE', 'FUNGICIDE',
      'SEED', 'SAPLING', 'NURSERY', 'BAYER', 'SYNGENTA', 'UPL', 'FMC',
      'TRACTOR', 'DIESEL', 'PETROL', 'FUEL', 'HP PETROL', 'INDIAN OIL',
      'BPCL', 'RELIANCE PETROL',
      'FEED', 'CATTLE FEED', 'POULTRY FEED', 'FISH FEED', 'FODDER',
      'DRIP', 'IRRIGATION', 'PUMP', 'MOTOR', 'SPRINKLER',
      'AGRI INPUT', 'KISAN SEVA', 'FARM SUPPLY',
    ],
    weight: 0.85,
  },
  emi_repayment: {
    keywords: [
      'EMI', 'NACH', 'E-NACH', 'ECS', 'AUTO DEBIT', 'MANDATE',
      'LOAN REPAY', 'INSTALMENT', 'INSTALLMENT', 'INTEREST',
      'KCC INT', 'KCC REPAY', 'CROP LOAN', 'TERM LOAN',
      'SBI LOAN', 'BOB LOAN', 'PNB LOAN', 'CANARA LOAN',
      'HDFC EMI', 'BAJAJ EMI', 'MAHINDRA EMI', 'TATA EMI',
    ],
    weight: 0.95,
  },
  household: {
    keywords: [
      'RATION', 'GROCERY', 'KIRANA', 'PROVISION', 'SUPERMARKET',
      'BIGBASKET', 'DMART', 'RELIANCE SMART', 'JIOMART',
      'LPG', 'GAS', 'INDANE', 'BHARAT GAS', 'HP GAS',
      'ELECTRICITY', 'ELECTRIC', 'DISCOM', 'MSEDCL', 'BESCOM', 'KSEB',
      'MOBILE', 'RECHARGE', 'AIRTEL', 'JIO', 'VI ', 'BSNL',
      'WATER', 'PANCHAYAT', 'MUNICIPAL', 'TAX',
    ],
    weight: 0.75,
  },
  education: {
    keywords: [
      'SCHOOL', 'COLLEGE', 'UNIVERSITY', 'TUITION', 'FEES',
      'HOSTEL', 'BOOKS', 'STATIONERY', 'COACHING', 'ACADEMY',
      'VIDYALAYA', 'SHIKSHA', 'EXAM', 'ADMISSION',
    ],
    weight: 0.85,
  },
  health: {
    keywords: [
      'HOSPITAL', 'MEDICAL', 'PHARMA', 'PHARMACY', 'MEDICINE',
      'DOCTOR', 'CLINIC', 'DIAGNOSTIC', 'LAB', 'PATHOLOGY',
      'APOLLO', 'FORTIS', 'AIIMS', 'MANIPAL', 'NARAYANA',
      'INSURANCE PREM', 'PREMIUM', 'HEALTH COVER',
      'AYUSH', 'AYURVEDA', 'VETERINARY', 'VET ',
    ],
    weight: 0.8,
  },
  ceremony: {
    keywords: [
      'WEDDING', 'MARRIAGE', 'SHAADI', 'VIVAH',
      'TEMPLE', 'MANDIR', 'CHURCH', 'MOSQUE', 'GURUDWARA',
      'FESTIVAL', 'DIWALI', 'PUJA', 'HOLI', 'EID', 'CHRISTMAS',
      'FUNERAL', 'CREMATION', 'DEATH', 'SHRADH',
      'JEWELLERY', 'JEWELRY', 'GOLD', 'SILVER', 'ORNAMENT',
      'CATERER', 'TENT HOUSE', 'DECORATION', 'PANDAL',
    ],
    weight: 0.7,
  },
  transport: {
    keywords: [
      'PETROL', 'DIESEL', 'FUEL STATION', 'FILLING',
      'BUS', 'TRAIN', 'RAILWAY', 'IRCTC', 'KSRTC', 'MSRTC',
      'AUTO', 'OLA', 'UBER', 'RAPIDO',
      'VEHICLE', 'BIKE', 'SCOOTER', 'CAR LOAN',
      'TOLL', 'FASTAG', 'NHAI',
    ],
    weight: 0.7,
  },
  cash_withdrawal: {
    keywords: [
      'ATM', 'CASH WITHDRAWAL', 'CASH WDL', 'SELF CHQ', 'SELF CHEQUE',
      'BRANCH CASH', 'CSP CASH', 'BC CASH', 'MICRO ATM',
    ],
    weight: 0.95,
  },
};

/**
 * Classify a single debit transaction.
 * @param {Object} txn
 * @returns {Object} { category, confidence, amount, txnDate }
 */
const classifyDebit = (txn) => {
  const narration = (txn.narration || txn.transactionNarration || '').toUpperCase();
  const amt = parseFloat(txn.amount || txn.transactionAmount || 0);

  let bestMatch = { category: 'other_debit', confidence: 0, subcategory: null };

  for (const [category, { keywords, weight }] of Object.entries(DEBIT_PATTERNS)) {
    for (const keyword of keywords) {
      if (narration.includes(keyword)) {
        if (weight > bestMatch.confidence) {
          bestMatch = { category, confidence: weight, subcategory: keyword.toLowerCase() };
        }
      }
    }
  }

  return {
    ...bestMatch,
    amount: amt,
    narration: txn.narration || txn.transactionNarration,
    txnDate: txn.txnDate || txn.transactionTimestamp || txn.valueDate,
  };
};

/**
 * Classify all debit transactions.
 * @param {Array} transactions
 * @returns {Object} { categories, summary }
 */
const classifyAllDebits = (transactions) => {
  const debits = transactions.filter(txn => {
    const type = (txn.type || txn.txnType || '').toUpperCase();
    return type === 'DEBIT';
  });

  const categories = {};
  for (const txn of debits) {
    const result = classifyDebit(txn);
    if (!categories[result.category]) {
      categories[result.category] = { total: 0, count: 0, transactions: [] };
    }
    categories[result.category].total += result.amount;
    categories[result.category].count++;
    categories[result.category].transactions.push(result);
  }

  const totalExpense = Object.values(categories).reduce((sum, c) => sum + c.total, 0);
  const farmInputs = categories.farm_input?.total || 0;
  const householdTotal = (categories.household?.total || 0) + (categories.education?.total || 0) +
    (categories.health?.total || 0) + (categories.ceremony?.total || 0) + (categories.transport?.total || 0);

  return {
    categories,
    summary: {
      totalDebits: debits.length,
      totalExpense,
      farmInputExpense: farmInputs,
      householdExpense: householdTotal,
      emiRepayments: categories.emi_repayment?.total || 0,
      cashWithdrawals: categories.cash_withdrawal?.total || 0,
      farmToHouseholdRatio: householdTotal > 0 ? farmInputs / householdTotal : 0,
    },
  };
};

module.exports = { classifyDebit, classifyAllDebits };
