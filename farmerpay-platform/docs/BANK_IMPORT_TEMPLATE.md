# Bank Portfolio Import Template — May 2026 Pilot

This document defines the Excel workbook format that pilot bank partners
use to hand FarmerPay their farmer loan data (KCC and non-KCC, for
agriculture / horticulture / dairy / animal husbandry / fisheries).

A blank template xlsx can be generated at any time by running:

```bash
cd farmerpay-platform
node scripts/generate-bank-import-sample.js > docs/samples/bank-import-template.xlsx
```

## Workbook layout — 3 tabs per upload

Every upload is a single `.xlsx` workbook with **exactly three sheets**
in this order:

1. **Loans** — one row per loan account
2. **Schedules** — one row per scheduled EMI installment
3. **Payments** — one row per historical payment that has already been
   recorded in the bank's core banking system

A workbook with only tab 1 will still import (loans-only). Tabs 2 and
3 can be omitted by the bank for a first upload; subsequent uploads
that add new payment history can include just tab 3 and leave tabs 1
and 2 empty. The importer matches rows across tabs using the
`account_number` column as the join key.

Sheet names are matched **case-insensitively** — `Loans` / `loans` /
`LOANS` all work.

## Tab 1 — `Loans`

One row per distinct loan account at the bank. Re-uploading the same
`account_number` on a later date updates the existing row (outstanding
amount, days past due, etc.) rather than inserting a duplicate.

| Column header | Required | Description |
|---|---|---|
| `account_number` | ✅ | Bank's internal loan account number. Used as the join key across all 3 tabs. Case-sensitive. |
| `borrower_name` | ✅ | Full name of the primary borrower. |
| `borrower_mobile` | — | 10-digit Indian mobile. Used to auto-match the loan to an existing FarmerPay farmer account during field agent onboarding. |
| `borrower_aadhaar_last4` | — | Last 4 digits of Aadhaar only. **Do not send the full Aadhaar number** — it violates DPDP and our data sharing MOU. |
| `borrower_pan` | — | PAN number if available. |
| `loan_type` | ✅ | One of: `KCC`, `Crop Loan`, `Dairy Loan`, `Livestock Loan`, `Horticulture Loan`, `Fisheries Loan`, `Animal Husbandry Loan`, `Input Loan`, `JLG`, `SHG`, or the gold-loan family (`KCC Gold`, `Agri Gold`, `Allied Gold`, `Consumption Gold`). Matching is case-insensitive and forgiving (`kcc gold`, `agri-gold`, `agriculture gold` all map to `agri_gold`). |
| `scheme_name` | — | Bank scheme name, e.g. `KCC Kharif 2025`, `Dairy Entrepreneurship Scheme`. |
| `scheme_code` | — | Internal bank scheme code. |
| `sanction_amount` | ✅ | Rupees, numeric. Decimals allowed. |
| `outstanding_amount` | ✅ | Current outstanding principal + interest as of `data_as_of_date`. |
| `interest_rate` | — | Percentage e.g. `7.0`. |
| `sanction_date` | — | `YYYY-MM-DD` or any Excel date format. |
| `maturity_date` | — | `YYYY-MM-DD`. |
| `repayment_type` | — | `emi` or `bullet`. Defaults to `emi`. |
| `dpd` | — | Days past due at the report date. If omitted, FarmerPay will compute it from the payments tab. |
| `sma_classification` | — | `standard` / `sma_0` / `sma_1` / `sma_2` / `npa`. If omitted, FarmerPay will derive it from `dpd`. |
| `district` | ✅ | LGD district name. **Critical for the 6-district pilot geography dimension** — the cohort report is sliced by (bank, district, cohort). |
| `lgd_district_code` | — | LGD code if the bank has it. Helps if two districts share a name. |
| `cohort_tag` | ✅ | **`test` or `control`**. The single most important column. Bank assigns this before sending — FarmerPay does NOT randomize. Any other value is treated as `unassigned` and excluded from the pilot report. |
| `data_as_of_date` | ✅ | `YYYY-MM-DD` — the date on which this snapshot of the portfolio is accurate. Every row in the same upload should share the same `data_as_of_date`. |

## Tab 2 — `Schedules`

One row per scheduled EMI installment. All rows for a loan — past,
present, and future — should be included on the first upload. Subsequent
uploads can leave this tab empty unless the schedule has been
restructured.

| Column header | Required | Description |
|---|---|---|
| `account_number` | ✅ | Must match a row in tab 1 (of this upload or a prior upload). |
| `installment_number` | ✅ | 1-based installment index. |
| `due_date` | ✅ | `YYYY-MM-DD`. |
| `due_amount` | ✅ | Total amount due for this installment (principal + interest). |
| `principal_amount` | — | Principal component. If omitted, the full `due_amount` is recorded with no split. |
| `interest_amount` | — | Interest component. |
| `status` | — | `pending` / `paid` / `overdue` / `forgiven`. Defaults to `pending`. FarmerPay will recompute this daily from the NPA cron based on the `Payments` tab so you don't strictly need to keep it current. |

## Tab 3 — `Payments`

One row per historical payment already received against a loan. Bank
should include every payment FarmerPay hasn't seen before. The importer
will upsert by `account_number + payment_date + utr_reference` so it's
safe to re-send the same payment row across multiple uploads.

| Column header | Required | Description |
|---|---|---|
| `account_number` | ✅ | Must match a row in tab 1. |
| `installment_number` | — | Which scheduled installment this payment is against. If omitted, FarmerPay auto-matches to the oldest unpaid installment. |
| `payment_date` | ✅ | `YYYY-MM-DD`. |
| `amount` | ✅ | Rupees received. |
| `mode` | — | `bank_transfer` / `cash` / `check` / `digital_wallet`. Defaults to `bank_transfer`. |
| `utr_reference` | — | Bank UTR or reference number. Used for deduplication if the same payment appears in two uploads. |

## Upload workflow

1. Bank ops staff logs into the FarmerPay bank-admin portal
2. Picks their bank + branch from the seeded dropdowns
3. Sets the `data_as_of_date` (the report-cutoff for this upload)
4. Uploads the .xlsx file
5. Admin UI shows a processing spinner → polls for status
6. When complete: success/fail counts, error log for any rows that
   failed validation, link to the cohort report

## Validation rules

The upload is processed inside a single database transaction — if
**any** row fails validation, the whole workbook is rolled back. The
bank then fixes the error log and re-uploads.

Known validation failures:
- Missing required column
- `account_number` in tab 2 or 3 that doesn't exist in tab 1 (or in a prior
  upload by the same bank)
- `cohort_tag` that is neither `test` nor `control` (treated as
  `unassigned` — row still imports but is excluded from pilot metrics)
- `district` not in the bank's seeded district list for this pilot
- `loan_type` that doesn't match any known code
- Non-numeric values in numeric columns
- Duplicate `account_number` within the same tab 1 of a single upload

## FAQ

**Q: Can we upload a CSV instead?**
Yes — the original CSV flow at `POST /bank/portfolio/import` still works for
single-tab gold loan portfolios. For the pilot with cohort tags, schedules, and
payment history, use the xlsx 3-tab format via `POST /bank/portfolio/bulk-import`.

**Q: How do we assign the cohort tag?**
Per your own randomization methodology — typically alternate rows, or randomize
at the branch level. FarmerPay does not touch this decision; we just honor
whatever's in the column. Document your randomization method in the pilot MOU.

**Q: What if a farmer has multiple loans with us?**
Upload one row per loan in tab 1. FarmerPay links all of them to the same
farmer profile via mobile + Aadhaar-last-4 matching.

**Q: Can the test and control farmers be in the same branch?**
Yes. The statistical design works as long as cohort assignment is random
within each branch. Document whether you're randomizing per-loan or
per-farmer.

**Q: How often should we send uploads?**
Weekly during the pilot (every Monday morning is typical). First upload is the
full baseline; subsequent uploads are incremental (new payments + any
restructured schedules). Tab 1 rows can be re-sent every week with updated
`outstanding_amount` and `dpd` — they'll upsert on `account_number`.

**Q: What if we don't have Aadhaar-last-4 for all farmers?**
Mobile alone is fine for linkage; our field agents will collect Aadhaar-last-4
during onboarding if needed. Never send the full Aadhaar.
