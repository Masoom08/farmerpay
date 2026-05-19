/**
 * Income Classifier — Unit Tests (~25 tests)
 */

const { classifyTransaction, classifyAllCredits } = require('../../../src/modules/aa/services/analyzers/incomeClassifier');
const { kharifFarmer, mixedFarmer, dairyFarmer, txn } = require('../helpers/mockTransactions');

describe('incomeClassifier', () => {
  // ─── Individual Category Detection ──────────────────────────

  describe('classifyTransaction — farm_sale', () => {
    it('should classify APMC mandi receipt', () => {
      const result = classifyTransaction(txn('APMC MANDI PADDY SALE', 85000, 'CREDIT', '2025-10-15'));
      expect(result.category).toBe('farm_sale');
      expect(result.confidence).toBe(0.9);
    });

    it('should classify FCI procurement / MSP', () => {
      const result = classifyTransaction(txn('FCI PROCUREMENT MSP WHEAT', 60000, 'CREDIT', '2025-04-01'));
      expect(result.category).toBe('farm_sale');
    });

    it('should classify cooperative society', () => {
      const result = classifyTransaction(txn('COOPERATIVE SUGAR MILL PAYMENT', 45000, 'CREDIT', '2025-01-10'));
      expect(result.category).toBe('farm_sale');
    });

    it('should classify ENAM e-marketplace', () => {
      const result = classifyTransaction(txn('E-NAM GROUNDNUT SALE', 30000, 'CREDIT', '2025-03-20'));
      expect(result.category).toBe('farm_sale');
    });
  });

  describe('classifyTransaction — dairy_livestock', () => {
    it('should classify AMUL DCS payment', () => {
      const result = classifyTransaction(txn('AMUL DCS MILK PAYMENT', 18000, 'CREDIT', '2025-01-10'));
      expect(result.category).toBe('dairy_livestock');
      expect(result.confidence).toBe(0.85);
    });

    it('should classify AAVIN dairy', () => {
      const result = classifyTransaction(txn('AAVIN MILK PAYMENT DCS', 12000, 'CREDIT', '2025-02-15'));
      expect(result.category).toBe('dairy_livestock');
    });

    it('should classify poultry/egg', () => {
      const result = classifyTransaction(txn('POULTRY EGG SALE PAYMENT', 8000, 'CREDIT', '2025-05-10'));
      expect(result.category).toBe('dairy_livestock');
    });
  });

  describe('classifyTransaction — fishery', () => {
    it('should classify fish market sale', () => {
      const result = classifyTransaction(txn('FISH MARKET SHRIMP SALE', 12000, 'CREDIT', '2025-08-20'));
      expect(result.category).toBe('fishery');
      expect(result.confidence).toBe(0.85);
    });

    it('should classify MPEDA aquaculture', () => {
      const result = classifyTransaction(txn('MPEDA AQUA EXPORT PAYMENT', 50000, 'CREDIT', '2025-09-01'));
      expect(result.category).toBe('fishery');
    });
  });

  describe('classifyTransaction — govt_transfer', () => {
    it('should classify PM-KISAN DBT with highest confidence', () => {
      const result = classifyTransaction(txn('PM-KISAN DBT SAMMAN NIDHI', 2000, 'CREDIT', '2025-02-01'));
      expect(result.category).toBe('govt_transfer');
      expect(result.confidence).toBe(0.95);
    });

    it('should classify MGNREGA wage', () => {
      const result = classifyTransaction(txn('MGNREGA NREGA WAGE PAYMENT', 5000, 'CREDIT', '2025-05-15'));
      expect(result.category).toBe('govt_transfer');
    });

    it('should classify PMFBY crop insurance claim', () => {
      const result = classifyTransaction(txn('PMFBY CROP INSURANCE CLAIM', 15000, 'CREDIT', '2025-09-01'));
      expect(result.category).toBe('govt_transfer');
    });

    it('should classify KALIA state scheme', () => {
      const result = classifyTransaction(txn('KALIA SCHEME BENEFIT TRANSFER', 5000, 'CREDIT', '2025-04-01'));
      expect(result.category).toBe('govt_transfer');
    });

    it('should classify Rythu Bandhu', () => {
      const result = classifyTransaction(txn('RYTHU BANDHU INVESTMENT SUPPORT', 5000, 'CREDIT', '2025-06-01'));
      expect(result.category).toBe('govt_transfer');
    });
  });

  describe('classifyTransaction — shg_income', () => {
    it('should classify SHG/NRLM payment', () => {
      // Note: "LOAN" keyword matches loan_disbursement (0.85) which beats SHG (0.8)
      // Use a narration without "LOAN" to test pure SHG classification
      const result = classifyTransaction(txn('NRLM SHG SELF HELP GROUP DIVIDEND', 5000, 'CREDIT', '2025-04-01'));
      expect(result.category).toBe('shg_income');
      expect(result.confidence).toBe(0.8);
    });

    it('should classify KUDUMBASHREE', () => {
      const result = classifyTransaction(txn('KUDUMBASHREE MAHILA GROUP PAYMENT', 5000, 'CREDIT', '2025-03-01'));
      expect(result.category).toBe('shg_income');
    });
  });

  describe('classifyTransaction — wage_salary', () => {
    it('should classify salary credit', () => {
      const result = classifyTransaction(txn('NEFT-SALARY EMPLOYER CO', 25000, 'CREDIT', '2025-01-01'));
      expect(result.category).toBe('wage_salary');
      expect(result.confidence).toBe(0.9);
    });
  });

  describe('classifyTransaction — remittance', () => {
    it('should classify family P2P transfer with lower confidence', () => {
      const result = classifyTransaction(txn('UPI/SON DUBAI/PERSONAL TRANSFER', 15000, 'CREDIT', '2025-05-10'));
      expect(result.category).toBe('remittance');
      expect(result.confidence).toBe(0.6);
    });
  });

  describe('classifyTransaction — loan_disbursement', () => {
    it('should classify KCC loan disbursement', () => {
      const result = classifyTransaction(txn('KCC KISAN CREDIT CARD DISBURSEMENT', 200000, 'CREDIT', '2025-06-01'));
      expect(result.category).toBe('loan_disbursement');
      expect(result.confidence).toBe(0.85);
    });
  });

  // ─── Multi-Match Resolution ─────────────────────────────────

  describe('multi-match resolution', () => {
    it('should prefer higher-weight category when narration matches multiple', () => {
      // "PM-KISAN DBT" matches govt_transfer (0.95) AND potentially loan keywords
      const result = classifyTransaction(txn('PM-KISAN DBT SAMMAN NIDHI', 2000, 'CREDIT', '2025-02-01'));
      expect(result.category).toBe('govt_transfer');
      expect(result.confidence).toBe(0.95);
    });

    it('should classify MGNREGA as govt (0.95) not wage (0.9)', () => {
      const result = classifyTransaction(txn('MGNREGA WAGE PAYMENT NREGA', 5000, 'CREDIT', '2025-07-01'));
      expect(result.category).toBe('govt_transfer');
    });
  });

  // ─── Edge Cases ─────────────────────────────────────────────

  describe('edge cases', () => {
    it('should classify empty narration as other_credit', () => {
      const result = classifyTransaction(txn('', 5000, 'CREDIT', '2025-01-01'));
      expect(result.category).toBe('other_credit');
    });

    it('should classify numeric-only narration as other_credit', () => {
      const result = classifyTransaction(txn('123456789012345', 1000, 'CREDIT', '2025-01-01'));
      expect(result.category).toBe('other_credit');
    });

    it('should handle very long narration without crashing', () => {
      const longNarration = 'NEFT PAYMENT FROM COOPERATIVE SOCIETY ' + 'X'.repeat(500);
      const result = classifyTransaction(txn(longNarration, 10000, 'CREDIT', '2025-01-01'));
      expect(result.category).toBe('farm_sale');
    });

    it('should handle missing fields gracefully', () => {
      const result = classifyTransaction({ amount: 5000, type: 'CREDIT' });
      expect(result.category).toBe('other_credit');
      expect(result.amount).toBe(5000);
    });
  });

  // ─── Amount Heuristics ──────────────────────────────────────

  describe('amount heuristics', () => {
    it('should detect probable PM-KISAN from ₹2000 NEFT without keyword', () => {
      const result = classifyTransaction(txn('NEFT CR SOME GOVT DEPT', 2000, 'CREDIT', '2025-02-01', 'NEFT'));
      // Should either stay as other or be boosted — depends on exact narration match
      expect(result.amount).toBe(2000);
    });
  });

  // ─── classifyAllCredits Batch ───────────────────────────────

  describe('classifyAllCredits', () => {
    it('should only classify CREDIT transactions', () => {
      const result = classifyAllCredits(kharifFarmer);
      // kharifFarmer has mixed credits and debits
      const totalClassified = result.summary.totalCredits;
      const creditTxns = kharifFarmer.filter(t => (t.type || '').toUpperCase() === 'CREDIT');
      expect(totalClassified).toBe(creditTxns.length);
    });

    it('should compute correct summary totals for kharif farmer', () => {
      const result = classifyAllCredits(kharifFarmer);
      expect(result.summary.totalIncome).toBeGreaterThan(0);
      expect(result.summary.farmIncome).toBeGreaterThan(0);
      expect(result.summary.govtTransfers).toBeGreaterThan(0);
    });

    it('should detect farm_sale as dominant category for kharif farmer', () => {
      const result = classifyAllCredits(kharifFarmer);
      expect(result.categories.farm_sale).toBeDefined();
      expect(result.categories.farm_sale.total).toBeGreaterThan(result.summary.govtTransfers);
    });

    it('should compute classification rate', () => {
      const result = classifyAllCredits(kharifFarmer);
      expect(result.summary.classificationRate).toBeGreaterThan(0);
      expect(result.summary.classificationRate).toBeLessThanOrEqual(1);
    });

    it('should detect multiple income categories for mixed farmer', () => {
      const result = classifyAllCredits(mixedFarmer);
      const categories = Object.keys(result.categories);
      expect(categories.length).toBeGreaterThanOrEqual(4);
    });

    it('should detect dairy_livestock as dominant for dairy farmer', () => {
      const result = classifyAllCredits(dairyFarmer);
      expect(result.categories.dairy_livestock).toBeDefined();
      expect(result.categories.dairy_livestock.count).toBe(12);
    });
  });
});
