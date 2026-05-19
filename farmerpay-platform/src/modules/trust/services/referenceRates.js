/**
 * Reference Rate Tables for the L5 Leverage Calculator.
 *
 * These are conservative defaults sourced from public RBI / NABARD priority-
 * sector circulars + typical NBFC pricing as of 2026. They're INTENTIONALLY
 * inside the codebase (not the DB) so a product manager can tune them with a
 * one-line PR. When we eventually want region-specific or partner-specific
 * rates, this file becomes the seed for a `trust_reference_rates` table.
 *
 * Each row represents a "what-if" loan offer: if a farmer wants to borrow for
 * <purpose>, here's the rate and tenure they can REALISTICALLY get from a
 * mainstream lender. The leverage engine uses these to convert "monthly EMI
 * headroom" → "max loan principal" via the standard amortization formula.
 *
 * If a farmer asks "how much can I borrow?", the calculator will return one
 * row per purpose so the UI can show them all options at once.
 */

const REFERENCE_RATES = [
  {
    purpose: 'KCC',
    label: 'Kisan Credit Card',
    interestRatePct: 7.0,
    tenureMonths: 36,
    maxPrincipalInr: 300000,
    notes: 'Subvented crop loan. Interest after subsidy can be as low as 4%.',
    priority: 1,
  },
  {
    purpose: 'CROP',
    label: 'Crop Loan (priority sector)',
    interestRatePct: 9.0,
    tenureMonths: 12,
    maxPrincipalInr: 200000,
    notes: 'Short-term seasonal financing for inputs.',
    priority: 2,
  },
  {
    purpose: 'DAIRY',
    label: 'Dairy Term Loan',
    interestRatePct: 10.5,
    tenureMonths: 60,
    maxPrincipalInr: 500000,
    notes: 'For purchase of milch animals, shed, equipment.',
    priority: 3,
  },
  {
    purpose: 'FISHERY',
    label: 'Fishery Term Loan',
    interestRatePct: 11.0,
    tenureMonths: 60,
    maxPrincipalInr: 500000,
    notes: 'For ponds, vessels, gear; PMMSY linked.',
    priority: 4,
  },
  {
    purpose: 'GOLD',
    label: 'Agri Gold Loan',
    interestRatePct: 9.5,
    tenureMonths: 12,
    maxPrincipalInr: 1000000,
    notes: 'Liquid + low risk. 24h disbursal.',
    priority: 5,
  },
  {
    purpose: 'BUSINESS',
    label: 'Agri Business / FPO Loan',
    interestRatePct: 12.5,
    tenureMonths: 36,
    maxPrincipalInr: 500000,
    notes: 'Working capital for trading, processing, FPOs.',
    priority: 6,
  },
  {
    purpose: 'PERSONAL',
    label: 'Personal Loan',
    interestRatePct: 14.0,
    tenureMonths: 24,
    maxPrincipalInr: 200000,
    notes: 'Unsecured. Use only after exploring secured options.',
    priority: 7,
  },
];

/**
 * Computes the maximum principal you can borrow given a monthly EMI capacity,
 * interest rate %, and tenure in months. Standard amortization formula.
 *   P = EMI * [(1+r)^n - 1] / [r * (1+r)^n]
 */
function principalFromEmi(emi, annualRatePct, tenureMonths) {
  if (!emi || emi <= 0 || !tenureMonths || tenureMonths <= 0) return 0;
  const r = (annualRatePct / 100) / 12; // monthly rate
  if (r === 0) return Math.round(emi * tenureMonths);
  const factor = Math.pow(1 + r, tenureMonths);
  const principal = emi * (factor - 1) / (r * factor);
  return Math.round(principal);
}

module.exports = { REFERENCE_RATES, principalFromEmi };
