/**
 * Income Classifier — Layer 2 Analyzer
 * Classifies bank transaction credits into agriculture-specific income categories.
 * Maps to DRISHTI Engine #2 (Household Portfolio) income sources.
 *
 * Income Categories:
 *   1. farm_sale        — Mandi receipts, cooperative payments, aggregator credits
 *   2. dairy_livestock   — Milk cooperative (DCS/BMC), meat/egg/wool sales
 *   3. fishery           — Fish sale, aquaculture revenue
 *   4. govt_transfer     — PM-KISAN, DBT, MGNREGA, pension, PMFBY claims, state schemes
 *   5. shg_income        — SHG dividend, SHG loan, microfinance credit
 *   6. wage_salary       — Regular salary, wage labor, NREGA wages
 *   7. remittance        — Family transfers, NRI remittance
 *   8. business_income   — Petty shop, trading, service income
 *   9. loan_disbursement — KCC, term loan, gold loan disbursements
 *  10. other_credit      — Unclassified credits
 */

const logger = require('../../../../shared/utils/logger');

// ──────────────────────────────────────────────
// Pattern dictionaries (agriculture-India specific)
// ──────────────────────────────────────────────

const PATTERNS = {
  farm_sale: {
    keywords: [
      'MANDI', 'APMC', 'ENAM', 'E-NAM', 'FPO', 'COOPERATIVE', 'COOP',
      'AGRI MARKET', 'KRISHI', 'COTTON CORP', 'NAFED', 'CCI', 'FCI',
      'SUGAR MILL', 'JAGGERY', 'RICE MILL', 'DAL MILL', 'OIL MILL',
      'PRODUCE SALE', 'MSP', 'PROCUREMENT', 'PADDY', 'WHEAT', 'SOYBEAN',
      'GROUNDNUT', 'MUSTARD', 'COMMISSION AGENT', 'ARTHIYA', 'ADATIYA',
    ],
    weight: 0.9,
  },
  dairy_livestock: {
    keywords: [
      'DAIRY', 'MILK', 'DCS', 'BMC', 'AMUL', 'AAVIN', 'NANDINI',
      'MOTHER DAIRY', 'PARAG', 'VIJAYA', 'SARAS', 'VERKA', 'OMFED',
      'MILMA', 'GOPALJEE', 'HERITAGE', 'DODLA', 'TIRUMALA',
      'CATTLE', 'LIVESTOCK', 'POULTRY', 'EGG', 'MEAT', 'WOOL',
      'ANIMAL HUSBANDRY', 'VETERINARY', 'PASHU',
    ],
    weight: 0.85,
  },
  fishery: {
    keywords: [
      'FISH', 'FISHERY', 'AQUA', 'SHRIMP', 'PRAWN', 'MATSYA',
      'MARINE', 'HARBOR', 'HARBOUR', 'FISHING', 'TRAWL', 'PISCICULTURE',
      'MPEDA', 'NFDB', 'FISH MARKET', 'SEAFOOD',
    ],
    weight: 0.85,
  },
  govt_transfer: {
    keywords: [
      'PM-KISAN', 'PMKISAN', 'PM KISAN', 'PM SAMMAN', 'KISAN SAMMAN',
      'DBT', 'DIRECT BENEFIT', 'GOI', 'GOVT OF INDIA', 'STATE GOVT',
      'MGNREGA', 'NREGA', 'MNREGS', 'MAHATMA GANDHI',
      'PENSION', 'OLD AGE', 'WIDOW', 'DISABILITY',
      'PMFBY', 'CROP INSURANCE', 'INSURANCE CLAIM', 'RWBCIS',
      'KALIA', 'RYTHU BANDHU', 'RYTHU BHAROSA', 'PM-SYM',
      'SUBSIDY', 'GRANT', 'SCHOLARSHIP', 'WELFARE',
      'PMJDY', 'JAN DHAN', 'MUDRA', 'SOCIAL SECURITY',
      'CM FUND', 'RELIEF', 'COMPENSATION', 'DROUGHT RELIEF',
    ],
    weight: 0.95,
  },
  shg_income: {
    keywords: [
      'SHG', 'SELF HELP', 'MAHILA', 'WOMEN GROUP', 'STREE SHAKTI',
      'JLG', 'JOINT LIABILITY', 'MICROFINANCE', 'MFI',
      'NRLM', 'SRLM', 'DAY-NRLM', 'KUDUMBASHREE',
      'SAKHI', 'BC AGENT', 'BANKING CORRESPONDENT',
    ],
    weight: 0.8,
  },
  wage_salary: {
    keywords: [
      'SALARY', 'SAL CR', 'WAGES', 'WAGE', 'STIPEND', 'HONORARIUM',
      'NEFT-SALARY', 'PAYROLL', 'EMPLOYER', 'COMPANY',
    ],
    weight: 0.9,
  },
  remittance: {
    keywords: [
      'REMITTANCE', 'FAMILY', 'SON', 'DAUGHTER', 'HUSBAND', 'WIFE',
      'NRI', 'FOREIGN', 'WESTERN UNION', 'MONEYGRAM', 'XOOM',
      'UAE', 'DUBAI', 'QATAR', 'SAUDI', 'KUWAIT', 'OMAN',
      'P2P', 'PERSONAL TRANSFER',
    ],
    weight: 0.6, // Lower confidence — P2P transfers are ambiguous
  },
  business_income: {
    keywords: [
      'SHOP', 'STORE', 'TRADE', 'TRADING', 'MERCHANT', 'RETAIL',
      'VENDOR', 'SUPPLIER', 'SERVICE', 'RENT', 'LEASE',
      'COMMISSION', 'BROKERAGE', 'TRANSPORT', 'HAULING',
    ],
    weight: 0.5, // Low confidence — needs amount pattern confirmation
  },
  loan_disbursement: {
    keywords: [
      'LOAN', 'KCC', 'KISAN CREDIT', 'CROP LOAN', 'TERM LOAN',
      'GOLD LOAN', 'JEWEL LOAN', 'DISBURSEMENT', 'DISBURSE',
      'SANCTION', 'SANCTIONED', 'CREDIT FACILITY', 'OD LIMIT',
      'OVERDRAFT', 'MUDRA LOAN', 'SHG LOAN',
    ],
    weight: 0.85,
  },
};

// ──────────────────────────────────────────────
// Classification Engine
// ──────────────────────────────────────────────

/**
 * Classify a single credit transaction.
 * @param {Object} txn - { narration, amount, mode, txnDate, currentBalance }
 * @returns {Object} { category, confidence, subcategory, narration }
 */
const classifyTransaction = (txn) => {
  const narration = (txn.narration || txn.transactionNarration || '').toUpperCase();
  const amt = parseFloat(txn.amount || txn.transactionAmount || 0);
  const mode = (txn.mode || txn.transactionMode || '').toUpperCase();

  let bestMatch = { category: 'other_credit', confidence: 0, subcategory: null };

  for (const [category, { keywords, weight }] of Object.entries(PATTERNS)) {
    for (const keyword of keywords) {
      if (narration.includes(keyword)) {
        const confidence = weight;
        if (confidence > bestMatch.confidence) {
          bestMatch = { category, confidence, subcategory: keyword.toLowerCase() };
        }
      }
    }
  }

  // Amount-based heuristics for ambiguous cases
  if (bestMatch.confidence < 0.5) {
    bestMatch = applyAmountHeuristics(bestMatch, amt, narration, mode);
  }

  return {
    ...bestMatch,
    narration: txn.narration || txn.transactionNarration,
    amount: amt,
    txnDate: txn.txnDate || txn.transactionTimestamp || txn.valueDate,
  };
};

/**
 * Classify all credit transactions for a farmer.
 * @param {Array} transactions - Raw bank transactions (credits only)
 * @returns {Object} { categories: { [category]: { total, count, avgAmount, transactions } }, summary }
 */
const classifyAllCredits = (transactions) => {
  const credits = transactions.filter(txn => {
    const type = (txn.type || txn.txnType || '').toUpperCase();
    return type === 'CREDIT';
  });

  const categories = {};
  const classified = [];

  for (const txn of credits) {
    const result = classifyTransaction(txn);
    classified.push(result);

    if (!categories[result.category]) {
      categories[result.category] = { total: 0, count: 0, transactions: [], avgConfidence: 0 };
    }
    categories[result.category].total += result.amount;
    categories[result.category].count++;
    categories[result.category].avgConfidence += result.confidence;
    categories[result.category].transactions.push(result);
  }

  // Compute averages
  for (const cat of Object.values(categories)) {
    cat.avgAmount = cat.count ? cat.total / cat.count : 0;
    cat.avgConfidence = cat.count ? cat.avgConfidence / cat.count : 0;
  }

  const totalIncome = Object.values(categories).reduce((sum, c) => sum + c.total, 0);

  return {
    categories,
    summary: {
      totalCredits: credits.length,
      totalIncome,
      farmIncome: (categories.farm_sale?.total || 0) + (categories.dairy_livestock?.total || 0) + (categories.fishery?.total || 0),
      nonFarmIncome: totalIncome - ((categories.farm_sale?.total || 0) + (categories.dairy_livestock?.total || 0) + (categories.fishery?.total || 0) + (categories.loan_disbursement?.total || 0)),
      govtTransfers: categories.govt_transfer?.total || 0,
      loanDisbursements: categories.loan_disbursement?.total || 0,
      classificationRate: credits.length ? (credits.length - (categories.other_credit?.count || 0)) / credits.length : 0,
    },
    classified,
  };
};

// ──────────────────────────────────────────────
// Amount Heuristics
// ──────────────────────────────────────────────

const applyAmountHeuristics = (current, amount, narration, mode) => {
  // PM-KISAN is always ₹2000 in 3 installments
  if (amount === 2000 && narration.includes('NEFT') && !narration.includes('LOAN')) {
    return { category: 'govt_transfer', confidence: 0.7, subcategory: 'pm_kisan_probable' };
  }

  // Dairy cooperatives typically pay ₹5000-₹25000 bi-monthly
  if (amount >= 3000 && amount <= 30000 && mode === 'NEFT') {
    // Could be dairy cooperative — mark as low-confidence
    return { ...current, confidence: Math.max(current.confidence, 0.3) };
  }

  // Large round-number credits are likely loan disbursements
  if (amount >= 50000 && amount % 10000 === 0) {
    return { category: 'loan_disbursement', confidence: 0.6, subcategory: 'amount_pattern' };
  }

  return current;
};

module.exports = { classifyTransaction, classifyAllCredits };
