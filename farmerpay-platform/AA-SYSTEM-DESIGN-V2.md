# AA — Account Aggregator Financial Intelligence Layer (V2 — Refined)

> **Module Codename:** AA (Account Aggregator)  
> **Purpose:** Consent-based bank statement intelligence — the financial backbone for TRUST, DRISHTI, SENTINEL, DICE, and SATHI  
> **Date:** 2026-04-13  
> **Status:** V1 code written, V2 design refinement for production readiness  
> **Predecessor:** `AA-SYSTEM-DESIGN.md` (V1)

---

## 1. Executive Summary

The AA module transforms FarmerPay from a platform that relies on self-reported financial data to one powered by **observed financial reality**. By integrating with India's Account Aggregator framework (RBI-regulated, 450+ financial institutions, 2.61 billion accounts enabled), FarmerPay can — with farmer consent — access 12-24 months of bank statement data and extract agriculture-specific financial intelligence.

FarmerPay acts as a **FIU (Financial Information User)**. It does not become an AA or handle raw data storage — it consumes data through licensed AA providers (Setu/OneMoney, Finvu) and runs agricultural intelligence on top.

### V2 Refinements Over V1

| Gap in V1 | V2 Fix |
|-----------|--------|
| No raw transaction storage | New `aa_transactions` table — enables deep analytics and re-analysis |
| No analysis result persistence | New `aa_financial_analyses` table — audit trail + fast retrieval |
| No consent audit log | New `aa_consent_audit_logs` table — RBI compliance |
| No migration file | Full migration for 3 new + 3 existing tables |
| No tests | 8 test suites, ~120 tests planned |
| No frontend | Farmer app (3 screens), Banker dashboard (2 pages), Sathi flow (2 pages) |
| No webhook signature verification | HMAC-SHA256 verification on all incoming webhooks |
| No rate limiting on AA provider calls | Per-farmer cooldown + daily limit |
| No data retention/purge policy | 24-month transaction retention, auto-purge job |
| Analyzers only work with raw txns | Summary-fallback mode when raw transactions unavailable |
| No re-analysis trigger | Manual + scheduled re-analysis when fresh data arrives |
| DRISHTI snapshotBuilder not wired to AA | Bridge auto-invoked during snapshot build |
| No error recovery for partial fetches | Retry queue + partial-success handling |

---

## 2. Three-Layer Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                     LAYER 3: CROSS-MODULE BRIDGE                     │
│                                                                       │
│  ┌─────────┐ ┌─────────┐ ┌──────────┐ ┌──────┐ ┌───────┐          │
│  │  TRUST  │ │ DRISHTI │ │ SENTINEL │ │ DICE │ │ SATHI │          │
│  │ Score + │ │Snapshot │ │ EWS +    │ │ EMI  │ │ Pre-  │          │
│  │ verify  │ │ inputs  │ │ risk     │ │ sched│ │ fill  │          │
│  └────┬────┘ └────┬────┘ └────┬─────┘ └──┬───┘ └──┬────┘          │
│       └───────────┴───────────┴───────────┴────────┘                │
│                          ▲                                           │
│                   aaCrossModuleBridge.js                              │
├──────────────────────────┼───────────────────────────────────────────┤
│                     LAYER 2: AGRICULTURAL ANALYZERS                   │
│                          │                                           │
│  ┌──────────────┐ ┌─────┴──────┐ ┌──────────────┐ ┌──────────────┐│
│  │   Income     │ │  Expense   │ │ Seasonality  │ │  Financial   ││
│  │  Classifier  │ │  Detector  │ │   Mapper     │ │   Health     ││
│  │(10 agri cats)│ │(9 exp cats)│ │(12-mo heatmap│ │   Scorer     ││
│  └──────────────┘ └────────────┘ │ crop season) │ │  (0-100)     ││
│                                   └──────────────┘ └──────────────┘│
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────────┐│
│  │  NEW: aaAnalysisOrchestrator.js                                  ││
│  │  Runs all 4 analyzers → persists to aa_financial_analyses        ││
│  │  Handles both raw-txn mode and summary-fallback mode             ││
│  └──────────────────────────────────────────────────────────────────┘│
├──────────────────────────────────────────────────────────────────────┤
│                     LAYER 1: AA INTEGRATION CLIENT                    │
│                                                                       │
│  ┌───────────────┐   ┌──────────────────────────────────────┐       │
│  │  aaConfig.js  │   │  aaConsentService.js                 │       │
│  │  (providers,  │   │  (initiate→approve→fetch→store)      │       │
│  │   FIU config) │   │  NEW: webhook HMAC verification      │       │
│  └───────────────┘   │  NEW: consent audit logging           │       │
│  ┌───────────────┐   └──────────────────────────────────────┘       │
│  │ setuClient.js │   ┌──────────────────────────────────────┐       │
│  │ finvuClient.js│   │  aaDataFetchService.js                │       │
│  │ aaFactory.js  │   │  NEW: raw transaction persistence     │       │
│  └───────────────┘   │  NEW: partial-success recovery        │       │
│                       │  NEW: rate limiting per farmer        │       │
│                       └──────────────────────────────────────┘       │
│                       ┌──────────────────────────────────────┐       │
│                       │  aaDataFetchConsumer.js (RabbitMQ)    │       │
│                       │  NEW: aaReAnalysisConsumer.js         │       │
│                       └──────────────────────────────────────┘       │
└──────────────────────────────────────────────────────────────────────┘
          │                              │
          ▼                              ▼
   ┌──────────────┐            ┌──────────────────────┐
   │ Setu AA API  │            │  MySQL Tables          │
   │ Finvu AA API │            │  aa_consents (existing) │
   │ (RBI-licensed│            │  aa_bank_statement_sum  │
   │  providers)  │            │  credit_bureau_reports  │
   └──────────────┘            │  NEW: aa_transactions   │
                               │  NEW: aa_financial_anal │
                               │  NEW: aa_consent_audit  │
                               └──────────────────────────┘
```

---

## 3. Database Tables — Complete Schema

### 3.1 Existing Tables (Already Migrated)

These 3 tables exist via migration `20250114000003-sentinel-datamon-alignment.js`:

#### `aa_consents` (exists — model in sentinel/models/AaConsent.js)
| Column | Type | Notes |
|--------|------|-------|
| id | INT AUTO_INCREMENT PK | |
| consent_uuid | VARCHAR(36) UNIQUE | External-facing ID |
| farmer_id | INT FK → users | |
| aa_provider | ENUM('finvu','onemoney','cams','nsdl') | V2: add 'setu' to ENUM |
| consent_status | ENUM('requested','approved','rejected','revoked','expired') | |
| consent_purpose | VARCHAR(100) | |
| data_from | DATE | |
| data_to | DATE | |
| is_active | BOOLEAN DEFAULT true | |
| created_at, updated_at | TIMESTAMPS | |

**V2 Changes needed:** Add `setu` to `aa_provider` ENUM. Add columns: `consent_handle VARCHAR(100)`, `redirect_url TEXT`, `provider_consent_id VARCHAR(100)`, `approved_at DATETIME`, `expires_at DATETIME`, `last_fetch_at DATETIME`, `fetch_count INT DEFAULT 0`.

#### `aa_bank_statement_summaries` (exists)
Schema unchanged from V1. See `sentinel/models/AaBankStatementSummary.js`.

#### `credit_bureau_reports` (exists)
Schema unchanged. Used by SENTINEL, not AA module.

### 3.2 New Tables (V2)

#### `aa_transactions` — Raw Transaction Storage
Stores individual bank transactions for deep analysis. Enables re-analysis without re-fetching from AA provider.

| Column | Type | Notes |
|--------|------|-------|
| id | BIGINT AUTO_INCREMENT PK | Large volume expected |
| transaction_uuid | VARCHAR(36) UNIQUE | External-facing ID |
| farmer_id | INT FK → users | |
| consent_id | INT FK → aa_consents | |
| summary_id | INT FK → aa_bank_statement_summaries | Links to parent account |
| txn_date | DATE NOT NULL | Transaction date |
| txn_type | ENUM('credit','debit') NOT NULL | |
| amount | DECIMAL(15,2) NOT NULL | |
| balance_after | DECIMAL(15,2) | Running balance |
| narration | VARCHAR(500) | Bank narration text |
| reference | VARCHAR(100) | UTR / reference number |
| mode | VARCHAR(30) | UPI, NEFT, IMPS, ATM, CASH, etc. |
| income_category | VARCHAR(30) NULL | Classifier output (Layer 2) |
| expense_category | VARCHAR(30) NULL | Classifier output (Layer 2) |
| classification_confidence | DECIMAL(3,2) NULL | 0.00–1.00 |
| is_active | BOOLEAN DEFAULT true | |
| created_at, updated_at | TIMESTAMPS | |

**Indexes:** `farmer_id`, `consent_id`, `txn_date`, `income_category`, `expense_category`, composite `(farmer_id, txn_date)`.

**Retention:** Auto-purge transactions older than 24 months via scheduled job.

#### `aa_financial_analyses` — Persisted Analysis Results
Audit trail of every analysis run. Cached result for fast API response.

| Column | Type | Notes |
|--------|------|-------|
| id | INT AUTO_INCREMENT PK | |
| analysis_uuid | VARCHAR(36) UNIQUE | |
| farmer_id | INT FK → users | |
| consent_id | INT FK → aa_consents | |
| analysis_type | ENUM('full','health_score_only','summary_only') | |
| health_score | DECIMAL(5,2) | 0–100 |
| health_grade | CHAR(1) | A/B/C/D/E |
| score_components | JSON | { cashFlowStability, balanceAdequacy, ... } |
| income_summary | JSON | { categories, totals, seasonality } |
| expense_summary | JSON | { categories, totals } |
| seasonality_data | JSON | { heatmap, cropSeason, emiRecommendation } |
| risk_flags | JSON | [{ type, severity, detail }] |
| bridge_data | JSON | { trust, drishti, sentinel, dice, sathi } |
| analysis_mode | ENUM('raw_transactions','summary_fallback') | |
| transaction_count | INT | Number of txns analyzed |
| period_from | DATE | |
| period_to | DATE | |
| is_latest | BOOLEAN DEFAULT true | |
| is_active | BOOLEAN DEFAULT true | |
| created_at, updated_at | TIMESTAMPS | |

**Indexes:** `farmer_id`, `consent_id`, `analysis_uuid`, composite `(farmer_id, is_latest)`.

#### `aa_consent_audit_logs` — RBI Compliance Audit Trail
Immutable log of every consent lifecycle event.

| Column | Type | Notes |
|--------|------|-------|
| id | BIGINT AUTO_INCREMENT PK | |
| consent_id | INT FK → aa_consents | |
| farmer_id | INT FK → users | |
| event_type | ENUM('consent_requested','consent_approved','consent_rejected','consent_revoked','consent_expired','data_fetched','data_fetch_failed','analysis_run','consent_renewed') | |
| event_source | ENUM('farmer','system','webhook','admin','scheduler') | Who triggered |
| provider | VARCHAR(20) | |
| metadata | JSON | Event-specific details |
| ip_address | VARCHAR(45) | For consent requests |
| created_at | TIMESTAMP | Immutable — no updated_at |

**Indexes:** `consent_id`, `farmer_id`, `event_type`, `created_at`.

---

## 4. API Endpoints (Complete)

### 4.1 Authenticated Routes (JWT required)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/aa/consent` | Initiate AA consent → returns redirect URL |
| GET | `/aa/consent` | Get farmer's current consent status |
| GET | `/aa/consent/:uuid` | Check specific consent (polls provider) |
| DELETE | `/aa/consent` | Revoke active consent |
| POST | `/aa/fetch` | Trigger manual data fetch |
| GET | `/aa/analysis` | Full financial analysis (cached or computed) |
| GET | `/aa/analysis/health-score` | Health score only (lightweight) |
| GET | `/aa/analysis/history` | **NEW:** Past analysis runs for the farmer |
| GET | `/aa/analysis/transactions` | **NEW:** Paginated classified transactions |
| GET | `/aa/bridge/:module` | Module-specific data (trust/drishti/sentinel/dice/sathi) |
| GET | `/aa/providers` | List available AA providers |
| POST | `/aa/analysis/refresh` | **NEW:** Trigger re-analysis with latest data |

### 4.2 Webhook Routes (No auth — separate router)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/aa/webhook/:provider` | Receive AA provider callbacks (HMAC verified) |

### 4.3 Banker / Admin Routes (JWT + roleCheck)

| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| GET | `/aa/admin/stats` | banker, admin | **NEW:** AA adoption stats (consent rates, avg scores) |
| GET | `/aa/admin/farmer/:farmerId/analysis` | banker | **NEW:** View farmer's AA analysis (banker access) |
| POST | `/aa/admin/bulk-analysis` | admin | **NEW:** Trigger batch re-analysis via RabbitMQ |

---

## 5. Consent Flow (V2 — with HMAC + Audit)

```
Farmer App                FarmerPay API              Setu/Finvu AA            Farmer's Bank (FIP)
    │                          │                          │                         │
    │  POST /aa/consent        │                          │                         │
    │─────────────────────────►│                          │                         │
    │                          │ [Audit: consent_requested]                         │
    │                          │  Create consent request  │                         │
    │                          │─────────────────────────►│                         │
    │                          │  ◄── consentHandle + URL │                         │
    │  ◄── redirect URL        │                          │                         │
    │                          │                          │                         │
    │  Farmer opens AA app ────┼──────────────────────────►                         │
    │  Reviews & approves      │                          │  Fetch account list     │
    │                          │                          │─────────────────────────►│
    │                          │                          │  ◄── linked accounts    │
    │                          │                          │                         │
    │                          │  Webhook: APPROVED       │                         │
    │                          │◄─────────────────────────│                         │
    │                          │ [HMAC-SHA256 verified]    │                         │
    │                          │ [Audit: consent_approved] │                         │
    │                          │                          │                         │
    │                          │  [Queue: aa.data.fetch]  │                         │
    │                          │  ──── RabbitMQ ────►     │                         │
    │                          │                          │                         │
    │                          │  Create data session     │                         │
    │                          │─────────────────────────►│  Fetch statements       │
    │                          │                          │─────────────────────────►│
    │                          │                          │  ◄── 12 months data     │
    │                          │  ◄── decrypted data      │                         │
    │                          │ [Audit: data_fetched]     │                         │
    │                          │                          │                         │
    │                          │  [Store raw transactions] │                         │
    │                          │  [Run Layer 2 analyzers]  │                         │
    │                          │  [Persist analysis]       │                         │
    │                          │  [Audit: analysis_run]    │                         │
    │                          │                          │                         │
    │  GET /aa/analysis        │                          │                         │
    │─────────────────────────►│                          │                         │
    │  ◄── full financial      │                          │                         │
    │      intelligence        │                          │                         │
```

---

## 6. Webhook Security

### HMAC-SHA256 Verification

All incoming webhooks are verified using provider-specific signing:

```javascript
// Setu: X-Setu-Signature header
const expectedSig = crypto.createHmac('sha256', setuWebhookSecret)
  .update(JSON.stringify(req.body)).digest('hex');
if (req.headers['x-setu-signature'] !== expectedSig) reject;

// Finvu: X-Finvu-Signature header (same algorithm, different secret)
```

Rate limit: Max 100 webhooks per minute per provider.

---

## 7. Income Classification (Layer 2) — 10 Categories

| Category | Pattern Examples | Confidence |
|----------|-----------------|------------|
| farm_sale | MANDI, APMC, ENAM, FPO, COOPERATIVE, SUGAR MILL, MSP, PROCUREMENT | 0.90 |
| dairy_livestock | AMUL, AAVIN, NANDINI, MOTHER DAIRY, DCS, BMC, POULTRY, EGG | 0.85 |
| fishery | FISH MARKET, SHRIMP, PRAWN, MPEDA, HARBOR, AQUA | 0.85 |
| govt_transfer | PM-KISAN, MGNREGA, DBT, PMFBY, KALIA, RYTHU BANDHU, PENSION | 0.95 |
| shg_income | SHG, SELF HELP, JLG, NRLM, KUDUMBASHREE, MICROFINANCE | 0.80 |
| wage_salary | SALARY, WAGE, STIPEND, PAYROLL | 0.90 |
| remittance | WESTERN UNION, P2P, FAMILY TRANSFER | 0.60 |
| business_income | SHOP, TRADE, MERCHANT, RENT, COMMISSION | 0.50 |
| loan_disbursement | KCC, TERM LOAN, GOLD LOAN, DISBURSE, MUDRA | 0.85 |
| other_credit | Unclassified | — |

---

## 8. Expense Detection (Layer 2) — 9 Categories

| Category | Pattern Examples |
|----------|-----------------|
| farm_input | FERTILIZER, UREA, DAP, SEED, PESTICIDE, TRACTOR, DIESEL |
| emi_repayment | EMI, LOAN, NACH, E-NACH, AUTO DEBIT, MANDATE, KCC |
| household | GROCERY, RATION, LPG, ELECTRICITY, WATER BILL, RENT |
| education | SCHOOL, COLLEGE, TUITION, BOOKS, FEES |
| health | HOSPITAL, MEDICAL, PHARMACY, DOCTOR, LAB, HEALTH INS |
| ceremony | WEDDING, FESTIVAL, TEMPLE, DONATION, POOJA |
| transport | FUEL, PETROL, DIESEL, BUS, TRAIN, IRCTC |
| cash_withdrawal | ATM, CASH WITHDRAWAL, CASH WDL |
| other_debit | Unclassified |

---

## 9. Seasonality Mapper (Layer 2)

Builds a 12-month cash flow signature:

| Output | Description |
|--------|-------------|
| Monthly heatmap | Income/expense totals per month, per category |
| Peak income months | Months with income > 1.5x average (harvest detection) |
| Cash-thin months | Months with deficit (expense > income) |
| Crop season | Kharif (Oct-Jan income), Rabi (Mar-May), Dual, Perennial |
| EMI recommendation | Monthly, seasonal_skip, or bullet_or_quarterly |
| Income regularity | Coefficient of variation per income source |

---

## 10. Financial Health Score (Layer 2)

Composite 0-100 score with 6 weighted components:

| Component | Weight | What it Measures |
|-----------|--------|------------------|
| Cash Flow Stability | 25% | Income regularity + deficit months |
| Balance Adequacy | 20% | Avg balance vs monthly outflow (months covered) |
| Income Diversity | 15% | Number of sources + Herfindahl-Hirschman Index |
| Debt Discipline | 20% | Bounce count + EMI regularity |
| Govt Transfer Access | 10% | PM-KISAN, MGNREGA, PMFBY detection |
| Digital Adoption | 10% | UPI transaction ratio |

**Grades:** A (80+), B (65-79), C (50-64), D (35-49), E (<35)

---

## 11. Cross-Module Bridge (Layer 3)

| Target Module | What AA Provides | Key Fields |
|---------------|-----------------|------------|
| **TRUST** | Verified income, bounce rate, govt scheme access, digital readiness | `financialHealthScore`, `incomeVerification`, `debtBehavior`, `govtSchemeAccess` |
| **DRISHTI** | Observed household income/expense, seasonality, EMI capacity | `householdIncome`, `householdExpense`, `seasonality`, `emiCapacity` |
| **SENTINEL** | Cash flow risk signals, deficit months, bounce count | `cashFlowScore`, `riskFlags`, `emiSafeMonths`, `overallRisk` |
| **DICE** | Income verification, max EMI capacity, repayment timing | `verifiedMonthlyIncome`, `eligibility`, `repaymentIntelligence` |
| **SATHI** | Onboarding pre-fill (income, schemes, bank accounts) | `preFill`, `verificationStatus` |

### DRISHTI Integration (Important)

The DRISHTI `snapshotBuilder.js` must be updated to automatically call `getDrishtiInputs(farmerId)` when building a farmer snapshot. If AA data is available, it should **override** self-reported income/expense with observed values. If not available, fall back to self-reported data.

---

## 12. Module File Structure (V2 Complete)

```
src/
├── integrations/accountAggregator/        # Layer 1: External AA provider clients
│   ├── config/aaConfig.js                 # Provider config, feature flags, cache TTLs
│   ├── services/
│   │   ├── setuClient.js                  # Setu (OneMoney) AA client
│   │   ├── finvuClient.js                 # Finvu AA client (backup)
│   │   └── aaProviderFactory.js           # Provider factory + registry
│   └── index.js                           # Public API
│
├── modules/aa/
│   ├── routes/aaRoutes.js                 # All endpoints + webhook router
│   ├── controllers/aaController.js        # HTTP handling
│   ├── models/                            # NEW: AA-specific models
│   │   ├── AaTransaction.js               # Raw transaction storage
│   │   ├── AaFinancialAnalysis.js         # Persisted analysis results
│   │   └── AaConsentAuditLog.js           # RBI compliance audit trail
│   ├── services/
│   │   ├── aaConsentService.js            # Consent lifecycle + audit logging
│   │   ├── aaDataFetchService.js          # Data fetch + raw txn persistence
│   │   ├── aaAnalysisOrchestrator.js      # NEW: Runs all analyzers, persists result
│   │   ├── aaCrossModuleBridge.js         # Layer 3: module bridges
│   │   ├── aaWebhookVerifier.js           # NEW: HMAC verification
│   │   ├── aaRateLimiter.js               # NEW: Per-farmer fetch cooldown
│   │   └── analyzers/                     # Layer 2: Agricultural intelligence
│   │       ├── incomeClassifier.js        # 10-category income classification
│   │       ├── expenseDetector.js         # 9-category expense detection
│   │       ├── seasonalityMapper.js       # 12-month cash flow + crop season
│   │       └── financialHealthScorer.js   # 0-100 composite score
│   ├── validators/aaValidator.js          # Joi schemas (expanded)
│   ├── workers/
│   │   ├── aaDataFetchConsumer.js         # RabbitMQ async data fetch
│   │   └── aaReAnalysisConsumer.js        # NEW: Batch re-analysis worker
│   └── index.js                           # Module exporter
│
├── modules/sentinel/models/               # Existing DB models
│   ├── AaConsent.js                       # V2: add 'setu' ENUM, new columns
│   ├── AaBankStatementSummary.js          # Unchanged
│   └── CreditBureauReport.js             # Unchanged
│
└── jobs/
    └── aaDataPurgeJob.js                  # NEW: 24-month transaction retention
```

---

## 13. Redis Cache Keys

| Key Pattern | TTL | Content |
|-------------|-----|---------|
| `aa:handle:{consentHandle}` | 24h | Consent handle → internal ID mapping |
| `aa:consent:{farmerId}` | 24h | Current consent status |
| `aa:summary:{farmerId}` | 12h | Bank statement summaries |
| `aa:analysis:{farmerId}` | 12h | Full financial analysis result |
| `aa:analysis:latest:{farmerId}` | **NEW** 6h | Latest analysis UUID for fast lookup |
| `aa:fetch:cooldown:{farmerId}` | **NEW** 1h | Rate limit — one fetch per hour per farmer |
| `aa:webhook:dedup:{eventId}` | **NEW** 24h | Webhook idempotency guard |

---

## 14. RabbitMQ Queues

| Queue | Producer | Consumer | Purpose |
|-------|----------|----------|---------|
| `aa.data.fetch` | aaConsentService (on webhook) | aaDataFetchConsumer | Async bank data fetch after consent approval |
| `aa.reanalysis` | **NEW** controller / scheduler | aaReAnalysisConsumer | Batch re-analysis when data refreshed |
| `aa.bulk.analysis` | **NEW** admin endpoint | aaReAnalysisConsumer | Admin-triggered batch analysis |

---

## 15. Test Suites

| Suite | File | Tests | Coverage |
|-------|------|-------|----------|
| Income Classifier | `__tests__/analyzers/incomeClassifier.test.js` | ~25 | All 10 categories + edge cases |
| Expense Detector | `__tests__/analyzers/expenseDetector.test.js` | ~15 | All 9 categories + multi-match |
| Seasonality Mapper | `__tests__/analyzers/seasonalityMapper.test.js` | ~15 | Kharif/Rabi/Dual/Perennial detection, EMI rec |
| Financial Health Scorer | `__tests__/analyzers/financialHealthScorer.test.js` | ~15 | Component weights, grade boundaries |
| Consent Service | `__tests__/services/aaConsentService.test.js` | ~15 | Full lifecycle + webhook processing |
| Data Fetch Service | `__tests__/services/aaDataFetchService.test.js` | ~10 | Fetch + normalize + store |
| Cross-Module Bridge | `__tests__/services/aaCrossModuleBridge.test.js` | ~15 | All 5 module outputs |
| API Integration | `__tests__/routes/aaRoutes.test.js` | ~10 | Endpoint status codes + validation |

---

## 16. Frontend Screens

### 16.1 Farmer App (React Native / Expo)

| Screen | Location | Features |
|--------|----------|----------|
| AA Consent | `screens/aa/AAConsentScreen.js` | Consent explanation in Hindi/English, provider selection, redirect to AA app, status polling |
| Financial Health | `screens/aa/FinancialHealthScreen.js` | Circular gauge (0-100), grade badge, 6 component cards, trend vs last analysis |
| Transaction Insights | `screens/aa/TransactionInsightsScreen.js` | Income/expense pie charts, monthly bar chart, category drill-down, crop season badge |

**Components:**
- `HealthScoreGauge.js` — Animated circular gauge (react-native-svg)
- `CategoryPieChart.js` — Income/expense category breakdown
- `MonthlyHeatmap.js` — 12-month income vs expense bars
- `ConsentStatusBadge.js` — Shows active/expired/pending status

### 16.2 Banker Dashboard (Next.js)

| Page | Location | Features |
|------|----------|----------|
| AA Portfolio Overview | `pages/banker/aa-overview.js` | AA adoption rates, avg health scores by branch, risk distribution chart |
| Farmer AA Detail | `pages/banker/farmer/[id]/aa.js` | Full analysis view for a specific farmer (read-only), transaction timeline, risk flags |

**Components:**
- `AAAdoptionChart.js` — Recharts bar chart of consent rates by branch
- `HealthScoreDistribution.js` — Histogram of farmer health scores
- `RiskFlagTimeline.js` — Chronological risk flag display
- `TransactionClassTable.js` — Sortable classified transactions

### 16.3 Sathi Dashboard (Next.js)

| Page | Location | Features |
|------|----------|----------|
| AA Onboarding | `pages/sathi/aa-onboard.js` | Guide farmer through AA consent, explain in simple terms, show benefits |
| AA Summary Share | `pages/sathi/aa-share.js` | Generate WhatsApp/SMS shareable summary of farmer's financial health |

---

## 17. Configuration (.env additions)

```env
# Account Aggregator
AA_ENABLED=false
AA_ACTIVE_PROVIDER=setu
AA_SETU_BASE_URL=https://fiu-uat.setu.co
AA_SETU_CLIENT_ID=your_client_id
AA_SETU_CLIENT_SECRET=your_client_secret
AA_SETU_PRODUCT_INSTANCE_ID=your_product_instance_id
AA_SETU_WEBHOOK_SECRET=your_webhook_signing_secret
AA_FINVU_BASE_URL=https://fiu.finvu.in/ConnectHub/FIU
AA_FINVU_API_KEY=your_api_key
AA_FINVU_API_SECRET=your_api_secret
AA_FINVU_WEBHOOK_SECRET=your_webhook_signing_secret
AA_DATA_WINDOW_MONTHS=12
AA_RECURRING_CONSENT=false
AA_FETCH_COOLDOWN_MINUTES=60
AA_TRANSACTION_RETENTION_MONTHS=24
```

---

## 18. Scheduled Jobs

| Job | Schedule | Purpose |
|-----|----------|---------|
| `aaDataPurgeJob` | Daily 2 AM | Delete transactions older than 24 months |
| `aaConsentExpiryJob` | Daily 6 AM | Mark expired consents, notify farmers via Sathi |
| `aaPeriodicRefreshJob` | Weekly Sunday 3 AM | Re-fetch data for active consents, re-run analysis |
