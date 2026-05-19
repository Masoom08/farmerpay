#!/usr/bin/env node
/**
 * generate-bank-import-sample.js
 *
 * Writes a 3-tab sample Excel workbook (Loans / Schedules / Payments) that
 * pilot bank partners can use as a starting point for their own data.
 *
 * Usage:
 *   cd farmerpay-platform
 *   node scripts/generate-bank-import-sample.js           # writes to ./docs/samples/bank-import-template.xlsx
 *   node scripts/generate-bank-import-sample.js out.xlsx  # writes to ./out.xlsx
 *
 * The sample contains 5 loans across 2 districts and 2 cohorts, plus a
 * schedule and a few paid installments so the shape of the data is
 * visible without needing to read BANK_IMPORT_TEMPLATE.md.
 */

const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const loans = [
  ['account_number', 'borrower_name', 'borrower_mobile', 'borrower_aadhaar_last4', 'loan_type', 'scheme_name', 'sanction_amount', 'outstanding_amount', 'interest_rate', 'sanction_date', 'maturity_date', 'dpd', 'district', 'cohort_tag', 'data_as_of_date'],
  ['KCC202501001', 'Ramesh Kumar',  '9876543001', '1234', 'KCC',          'KCC Kharif 2025',        150000, 120000, 7.0, '2025-06-01', '2026-05-31',  0, 'Barabanki', 'test',    '2026-04-30'],
  ['KCC202501002', 'Sita Devi',     '9876543002', '5678', 'Dairy Loan',   'Dairy Entrepreneurship', 80000,  40000,  8.5, '2024-03-15', '2027-03-14', 45, 'Barabanki', 'control', '2026-04-30'],
  ['KCC202501003', 'Mukesh Singh',  '9876543003', '9012', 'Crop Loan',    'Kharif Input 2025',     200000, 180000, 9.0, '2025-07-01', '2026-06-30',  0, 'Fatehpur',  'test',    '2026-04-30'],
  ['KCC202501004', 'Lakshmi Bai',   '9876543004', '3456', 'KCC',          'KCC Kharif 2025',        120000, 115000, 7.0, '2025-06-05', '2026-06-04',  5, 'Fatehpur',  'control', '2026-04-30'],
  ['KCC202501005', 'Vijay Patil',   '9876543005', '7890', 'Livestock Loan', 'Dairy Entrepreneurship', 100000, 60000, 8.5, '2024-09-01', '2027-08-31', 95, 'Fatehpur',  'test',    '2026-04-30'],
];

const schedules = [
  ['account_number', 'installment_number', 'due_date', 'due_amount', 'principal_amount', 'interest_amount', 'status'],
  ['KCC202501001', 1, '2025-07-01', 13500, 12500, 1000, 'paid'],
  ['KCC202501001', 2, '2025-08-01', 13500, 12600,  900, 'paid'],
  ['KCC202501001', 3, '2025-09-01', 13500, 12700,  800, 'paid'],
  ['KCC202501002', 1, '2024-04-15',  7500,  6800,  700, 'paid'],
  ['KCC202501002', 2, '2024-05-15',  7500,  6850,  650, 'paid'],
  ['KCC202501002', 3, '2024-06-15',  7500,  6900,  600, 'overdue'],
  ['KCC202501003', 1, '2025-08-01', 18000, 16500, 1500, 'paid'],
  ['KCC202501004', 1, '2025-07-05', 10800, 10000,  800, 'pending'],
  ['KCC202501005', 1, '2024-10-01',  9500,  8500, 1000, 'paid'],
  ['KCC202501005', 2, '2024-11-01',  9500,  8550,  950, 'overdue'],
  ['KCC202501005', 3, '2024-12-01',  9500,  8600,  900, 'overdue'],
];

const payments = [
  ['account_number', 'installment_number', 'payment_date', 'amount', 'mode', 'utr_reference'],
  ['KCC202501001', 1, '2025-07-01', 13500, 'bank_transfer', 'UTR202507ABC001'],
  ['KCC202501001', 2, '2025-08-02', 13500, 'bank_transfer', 'UTR202508ABC002'],
  ['KCC202501001', 3, '2025-09-01', 13500, 'upi',           'UTR202509ABC003'],
  ['KCC202501002', 1, '2024-04-14',  7500, 'cash',          ''],
  ['KCC202501002', 2, '2024-05-18',  7500, 'cash',          ''],
  ['KCC202501003', 1, '2025-08-01', 18000, 'bank_transfer', 'UTR202508DEF001'],
  ['KCC202501005', 1, '2024-10-02',  9500, 'bank_transfer', 'UTR202410GHI001'],
];

const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(loans),     'Loans');
XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(schedules), 'Schedules');
XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(payments),  'Payments');

const outArg = process.argv[2];
const outPath = outArg
  ? path.resolve(process.cwd(), outArg)
  : path.resolve(__dirname, '..', 'docs', 'samples', 'bank-import-template.xlsx');

// Ensure the target dir exists
fs.mkdirSync(path.dirname(outPath), { recursive: true });

XLSX.writeFile(wb, outPath);
console.log(`✓ Wrote sample workbook: ${outPath}`);
console.log(`   5 loans, ${schedules.length - 1} schedules, ${payments.length - 1} payments`);
