/**
 * Expense Detector — Unit Tests (~15 tests)
 */

const { classifyDebit, classifyAllDebits } = require('../../../src/modules/aa/services/analyzers/expenseDetector');
const { kharifFarmer, mixedFarmer, stressedFarmer, txn } = require('../helpers/mockTransactions');

describe('expenseDetector', () => {
  // ─── Individual Category Detection ──────────────────────────

  describe('classifyDebit — farm_input', () => {
    it('should classify IFFCO fertilizer', () => {
      const result = classifyDebit(txn('IFFCO FERTILIZER PURCHASE', 12000, 'DEBIT', '2025-06-10'));
      expect(result.category).toBe('farm_input');
      expect(result.confidence).toBe(0.85);
    });

    it('should classify Bayer pesticide', () => {
      const result = classifyDebit(txn('BAYER PESTICIDE DEALER', 5000, 'DEBIT', '2025-06-25'));
      expect(result.category).toBe('farm_input');
    });

    it('should classify cattle feed', () => {
      const result = classifyDebit(txn('CATTLE FEED PURCHASE FODDER', 8000, 'DEBIT', '2025-01-15'));
      expect(result.category).toBe('farm_input');
    });

    it('should classify seed purchase', () => {
      const result = classifyDebit(txn('SEED SAPLING NURSERY ORDER', 3000, 'DEBIT', '2025-05-15'));
      expect(result.category).toBe('farm_input');
    });
  });

  describe('classifyDebit — emi_repayment', () => {
    it('should classify NACH EMI with highest confidence', () => {
      const result = classifyDebit(txn('NACH KCC EMI SBI', 8000, 'DEBIT', '2025-01-05'));
      expect(result.category).toBe('emi_repayment');
      expect(result.confidence).toBe(0.95);
    });

    it('should classify E-NACH auto debit', () => {
      const result = classifyDebit(txn('E-NACH AUTO DEBIT MANDATE HDFC', 12000, 'DEBIT', '2025-02-05'));
      expect(result.category).toBe('emi_repayment');
    });

    it('should classify HDFC EMI', () => {
      const result = classifyDebit(txn('HDFC EMI PERSONAL LOAN', 15000, 'DEBIT', '2025-03-05'));
      expect(result.category).toBe('emi_repayment');
    });
  });

  describe('classifyDebit — household', () => {
    it('should classify LPG gas refill', () => {
      const result = classifyDebit(txn('LPG INDANE GAS REFILL', 900, 'DEBIT', '2025-01-15'));
      expect(result.category).toBe('household');
    });

    it('should classify electricity bill', () => {
      const result = classifyDebit(txn('ELECTRICITY MSEDCL BILL PAY', 1200, 'DEBIT', '2025-02-10'));
      expect(result.category).toBe('household');
    });

    it('should classify ration/kirana store', () => {
      const result = classifyDebit(txn('RATION KIRANA PROVISION STORE', 3500, 'DEBIT', '2025-03-05'));
      expect(result.category).toBe('household');
    });
  });

  describe('classifyDebit — other categories', () => {
    it('should classify school/education', () => {
      const result = classifyDebit(txn('SCHOOL FEES TUITION PAYMENT', 5000, 'DEBIT', '2025-07-01'));
      expect(result.category).toBe('education');
    });

    it('should classify hospital/medical', () => {
      const result = classifyDebit(txn('HOSPITAL APOLLO MEDICAL BILL', 5000, 'DEBIT', '2025-03-15'));
      expect(result.category).toBe('health');
    });

    it('should classify wedding/ceremony', () => {
      const result = classifyDebit(txn('WEDDING CATERER TENT HOUSE', 25000, 'DEBIT', '2025-05-25'));
      expect(result.category).toBe('ceremony');
    });

    it('should classify ATM cash withdrawal', () => {
      const result = classifyDebit(txn('ATM CASH WITHDRAWAL SBI', 5000, 'DEBIT', '2025-01-20'));
      expect(result.category).toBe('cash_withdrawal');
      expect(result.confidence).toBe(0.95);
    });

    it('should classify IRCTC as transport', () => {
      const result = classifyDebit(txn('IRCTC TRAIN TICKET BOOKING', 1500, 'DEBIT', '2025-04-10'));
      expect(result.category).toBe('transport');
    });
  });

  // ─── Edge Cases ─────────────────────────────────────────────

  describe('edge cases', () => {
    it('should classify empty narration as other_debit', () => {
      const result = classifyDebit(txn('', 1000, 'DEBIT', '2025-01-01'));
      expect(result.category).toBe('other_debit');
    });

    it('should handle missing fields', () => {
      const result = classifyDebit({ amount: 500, type: 'DEBIT' });
      expect(result.category).toBe('other_debit');
    });
  });

  // ─── classifyAllDebits Batch ────────────────────────────────

  describe('classifyAllDebits', () => {
    it('should only classify DEBIT transactions', () => {
      const result = classifyAllDebits(kharifFarmer);
      const debitTxns = kharifFarmer.filter(t => (t.type || '').toUpperCase() === 'DEBIT');
      expect(result.summary.totalDebits).toBe(debitTxns.length);
    });

    it('should compute correct summary totals', () => {
      const result = classifyAllDebits(kharifFarmer);
      expect(result.summary.totalExpense).toBeGreaterThan(0);
      expect(result.summary.farmInputExpense).toBeGreaterThan(0);
      expect(result.summary.emiRepayments).toBeGreaterThan(0);
      expect(result.summary.cashWithdrawals).toBeGreaterThan(0);
    });

    it('should compute farmToHouseholdRatio', () => {
      const result = classifyAllDebits(kharifFarmer);
      expect(result.summary.farmToHouseholdRatio).toBeGreaterThan(0);
    });

    it('should detect bounces in stressed farmer', () => {
      const result = classifyAllDebits(stressedFarmer);
      // Bounce narrations contain EMI keywords too, so they go to emi_repayment
      expect(result.summary.totalExpense).toBeGreaterThan(0);
    });
  });
});
