/**
 * Mock Transaction Datasets for AA Analyzer Tests
 * Realistic Indian bank statement patterns for different farmer profiles.
 */

// Helper to create a transaction
const txn = (narration, amount, type, date, mode = 'NEFT', balance = null) => ({
  narration,
  amount,
  type,
  txnDate: date,
  mode,
  currentBalance: balance || (type === 'CREDIT' ? amount + 10000 : 10000 - amount),
});

/**
 * Kharif paddy farmer — income peaks Oct-Jan, PM-KISAN quarterly, regular expenses.
 * 12 months: Jan 2025 to Dec 2025
 */
const kharifFarmer = [
  // Kharif harvest sales (Oct-Jan peaks)
  txn('APMC MANDI PADDY SALE', 85000, 'CREDIT', '2025-10-15', 'NEFT', 120000),
  txn('APMC MANDI RICE PROCUREMENT', 72000, 'CREDIT', '2025-11-05', 'NEFT', 190000),
  txn('FCI PROCUREMENT MSP PADDY', 45000, 'CREDIT', '2025-12-10', 'NEFT', 210000),
  txn('COOPERATIVE SOCIETY SALE', 32000, 'CREDIT', '2025-01-08', 'NEFT', 180000),

  // PM-KISAN quarterly (Feb, Jun, Oct)
  txn('PM-KISAN DBT SAMMAN NIDHI', 2000, 'CREDIT', '2025-02-01', 'DBT', 52000),
  txn('PM-KISAN PMKISAN SAMMAN', 2000, 'CREDIT', '2025-06-01', 'DBT', 28000),
  txn('PM-KISAN DBT', 2000, 'CREDIT', '2025-10-01', 'DBT', 25000),

  // MGNREGA (lean months)
  txn('MGNREGA NREGA WAGE', 5000, 'CREDIT', '2025-05-15', 'DBT', 30000),
  txn('MGNREGA WAGE PAYMENT', 4500, 'CREDIT', '2025-07-20', 'DBT', 22000),

  // Small UPI credits
  txn('UPI/RAMESH/P2P', 3000, 'CREDIT', '2025-03-10', 'UPI', 55000),
  txn('UPI/SURESH/PERSONAL', 2500, 'CREDIT', '2025-08-15', 'UPI', 18000),

  // Expenses — farm inputs (Jun-Jul pre-sowing)
  txn('IFFCO FERTILIZER PURCHASE', 12000, 'DEBIT', '2025-06-10', 'NEFT', 20000),
  txn('BAYER PESTICIDE DEALER', 5000, 'DEBIT', '2025-06-25', 'UPI', 15000),
  txn('SEED PURCHASE KISAN SEVA', 8000, 'DEBIT', '2025-06-05', 'NEFT', 32000),
  txn('DIESEL HP PETROL PUMP', 3500, 'DEBIT', '2025-07-10', 'DEBIT CARD', 18000),
  txn('TRACTOR HIRE PLOUGHING', 4000, 'DEBIT', '2025-06-20', 'CASH', 28000),

  // Expenses — household (spread throughout)
  txn('LPG INDANE GAS REFILL', 900, 'DEBIT', '2025-01-15', 'UPI', 179000),
  txn('ELECTRICITY MSEDCL BILL', 1200, 'DEBIT', '2025-02-10', 'UPI', 50800),
  txn('RATION KIRANA STORE', 3500, 'DEBIT', '2025-03-05', 'UPI', 51500),
  txn('GROCERY DMART PURCHASE', 2800, 'DEBIT', '2025-04-12', 'UPI', 42000),
  txn('MOBILE RECHARGE AIRTEL', 500, 'DEBIT', '2025-05-01', 'UPI', 29500),
  txn('SCHOOL FEES TUITION', 5000, 'DEBIT', '2025-07-01', 'NEFT', 17000),

  // EMI
  txn('NACH KCC EMI SBI', 8000, 'DEBIT', '2025-01-05', 'NACH', 172000),
  txn('NACH KCC EMI SBI', 8000, 'DEBIT', '2025-02-05', 'NACH', 42800),
  txn('NACH KCC EMI SBI', 8000, 'DEBIT', '2025-03-05', 'NACH', 43500),
  txn('NACH KCC EMI SBI', 8000, 'DEBIT', '2025-04-05', 'NACH', 34000),

  // Cash withdrawals
  txn('ATM CASH WITHDRAWAL SBI', 5000, 'DEBIT', '2025-01-20', 'ATM', 167000),
  txn('ATM CASH WDL PNB', 3000, 'DEBIT', '2025-09-15', 'ATM', 12000),
];

/**
 * Dairy farmer — regular monthly AMUL/DCS credits, daily expenses.
 * Perennial income pattern (low CV).
 */
const dairyFarmer = [
  // Monthly AMUL DCS payments (regular, every month)
  txn('AMUL DCS MILK PAYMENT', 18000, 'CREDIT', '2025-01-10', 'NEFT', 45000),
  txn('AMUL DCS MILK PAYMENT', 17500, 'CREDIT', '2025-02-10', 'NEFT', 44500),
  txn('AMUL DCS MILK PAYMENT', 19000, 'CREDIT', '2025-03-10', 'NEFT', 46000),
  txn('AMUL DCS MILK PAYMENT', 18200, 'CREDIT', '2025-04-10', 'NEFT', 45200),
  txn('AMUL DCS MILK PAYMENT', 16800, 'CREDIT', '2025-05-10', 'NEFT', 43800),
  txn('AMUL DCS MILK PAYMENT', 17000, 'CREDIT', '2025-06-10', 'NEFT', 44000),
  txn('AMUL DCS MILK PAYMENT', 18500, 'CREDIT', '2025-07-10', 'NEFT', 45500),
  txn('AMUL DCS MILK PAYMENT', 17800, 'CREDIT', '2025-08-10', 'NEFT', 44800),
  txn('AMUL DCS MILK PAYMENT', 18000, 'CREDIT', '2025-09-10', 'NEFT', 45000),
  txn('AMUL DCS MILK PAYMENT', 18300, 'CREDIT', '2025-10-10', 'NEFT', 45300),
  txn('AMUL DCS MILK PAYMENT', 17900, 'CREDIT', '2025-11-10', 'NEFT', 44900),
  txn('AMUL DCS MILK PAYMENT', 18100, 'CREDIT', '2025-12-10', 'NEFT', 45100),

  // Pension
  txn('OLD AGE PENSION STATE GOVT', 1500, 'CREDIT', '2025-03-01', 'DBT', 47500),
  txn('OLD AGE PENSION STATE GOVT', 1500, 'CREDIT', '2025-09-01', 'DBT', 46500),

  // Expenses — cattle feed
  txn('CATTLE FEED PURCHASE', 8000, 'DEBIT', '2025-01-15', 'NEFT', 37000),
  txn('CATTLE FEED SUPPLIER', 7500, 'DEBIT', '2025-04-15', 'NEFT', 37700),
  txn('VETERINARY DOCTOR VISIT', 2000, 'DEBIT', '2025-06-20', 'UPI', 42000),
  txn('FODDER PURCHASE', 5000, 'DEBIT', '2025-08-10', 'NEFT', 39800),

  // Household
  txn('GROCERY JIOMART', 3000, 'DEBIT', '2025-02-10', 'UPI', 41500),
  txn('ELECTRICITY BESCOM BILL', 800, 'DEBIT', '2025-05-05', 'UPI', 36000),
  txn('LPG BHARAT GAS', 900, 'DEBIT', '2025-07-01', 'UPI', 44600),
];

/**
 * Mixed farmer — farm + salary + govt + SHG income.
 * Tests income diversity and multiple source detection.
 */
const mixedFarmer = [
  // Farm sale
  txn('ENAM MANDI SOYBEAN SALE', 40000, 'CREDIT', '2025-11-20', 'NEFT', 85000),
  // Salary
  txn('NEFT-SALARY EMPLOYER CO', 25000, 'CREDIT', '2025-01-01', 'NEFT', 60000),
  txn('SALARY PAYROLL CREDIT', 25000, 'CREDIT', '2025-02-01', 'NEFT', 60000),
  txn('SALARY PAYROLL CREDIT', 25000, 'CREDIT', '2025-03-01', 'NEFT', 60000),
  // Govt
  txn('PM-KISAN DBT', 2000, 'CREDIT', '2025-02-15', 'DBT', 62000),
  txn('PMFBY CROP INSURANCE CLAIM', 15000, 'CREDIT', '2025-09-01', 'NEFT', 50000),
  // SHG
  txn('NRLM SHG LOAN DISBURSEMENT', 10000, 'CREDIT', '2025-04-01', 'NEFT', 55000),
  txn('SHG SELF HELP GROUP DIVIDEND', 3000, 'CREDIT', '2025-07-15', 'NEFT', 38000),
  // Remittance
  txn('UPI/SON DUBAI/PERSONAL TRANSFER', 15000, 'CREDIT', '2025-05-10', 'UPI', 50000),
  // Business
  txn('SHOP RENT COMMISSION AGENT', 5000, 'CREDIT', '2025-06-01', 'NEFT', 40000),
  // Fishery
  txn('FISH MARKET SHRIMP SALE', 12000, 'CREDIT', '2025-08-20', 'NEFT', 47000),

  // Expenses
  txn('NACH HDFC EMI HOME LOAN', 12000, 'DEBIT', '2025-01-05', 'NACH', 48000),
  txn('SCHOOL COLLEGE FEES', 8000, 'DEBIT', '2025-07-01', 'NEFT', 30000),
  txn('HOSPITAL APOLLO MEDICAL', 5000, 'DEBIT', '2025-03-15', 'UPI', 55000),
  txn('WEDDING CATERER TENT HOUSE', 25000, 'DEBIT', '2025-05-25', 'NEFT', 25000),
  txn('IRCTC TRAIN TICKET', 1500, 'DEBIT', '2025-04-10', 'UPI', 53500),
];

/**
 * Stressed farmer — high bounces, EMI defaults, deficit months.
 * Tests low scores and risk flag detection.
 */
const stressedFarmer = [
  // Meagre income
  txn('MGNREGA NREGA WAGE', 4000, 'CREDIT', '2025-03-15', 'DBT', 8000),
  txn('MGNREGA WAGE PAYMENT', 3500, 'CREDIT', '2025-06-20', 'DBT', 5500),
  txn('UPI/FAMILY P2P TRANSFER', 2000, 'CREDIT', '2025-09-01', 'UPI', 4000),
  txn('PM-KISAN DBT', 2000, 'CREDIT', '2025-02-01', 'DBT', 6000),

  // High bounces
  txn('NACH EMI BOUNCE RETURN DISHONOUR', 5000, 'DEBIT', '2025-01-05', 'NACH', 3000),
  txn('NACH EMI BOUNCE INSUFFICIENT FUNDS', 5000, 'DEBIT', '2025-02-05', 'NACH', 1000),
  txn('NACH ECS RETURN MANDATE FAIL', 5000, 'DEBIT', '2025-03-05', 'NACH', 3000),
  txn('NACH EMI BOUNCE DISHONOUR', 5000, 'DEBIT', '2025-04-05', 'NACH', 2000),
  txn('NACH UNPAID RETURN', 5000, 'DEBIT', '2025-05-05', 'NACH', 1500),

  // Successful EMIs (some months)
  txn('NACH KCC EMI SBI', 5000, 'DEBIT', '2025-06-05', 'NACH', 500),
  txn('NACH KCC EMI SBI', 5000, 'DEBIT', '2025-07-05', 'NACH', 2000),

  // Cash withdrawals
  txn('ATM CASH WITHDRAWAL', 3000, 'DEBIT', '2025-01-20', 'ATM', 0),
  txn('ATM CASH WDL', 2000, 'DEBIT', '2025-04-15', 'ATM', 0),

  // Household — bare minimum
  txn('RATION KIRANA', 2000, 'DEBIT', '2025-02-15', 'CASH', 4000),
  txn('MOBILE RECHARGE BSNL', 200, 'DEBIT', '2025-05-20', 'UPI', 1300),
];

module.exports = {
  kharifFarmer,
  dairyFarmer,
  mixedFarmer,
  stressedFarmer,
  txn,
};
