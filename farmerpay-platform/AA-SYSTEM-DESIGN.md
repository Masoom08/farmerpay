# AA — Account Aggregator Financial Intelligence Layer

> **Module Codename:** AA (Account Aggregator)
> **Purpose:** Consent-based bank statement intelligence — the financial backbone for TRUST, DRISHTI, SENTINEL, DICE, and SATHI
> **Date:** 2026-04-13
> **Status:** Implementation Complete (Code)

---

## 1. Executive Summary

The AA module transforms FarmerPay from a platform that relies on self-reported financial data to one powered by **observed financial reality**. By integrating with India's Account Aggregator framework (RBI-regulated, 450+ financial institutions, 2.61 billion accounts enabled), FarmerPay can — with farmer consent — access 12-24 months of bank statement data and extract agriculture-specific financial intelligence.

FarmerPay acts as a **FIU (Financial Information User)**. It does not become an AA or handle raw data storage — it consumes data through licensed AA providers (Setu/OneMoney, Finvu) and runs agricultural intelligence on top.

---

## 2. Three-Layer Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    LAYER 3: CROSS-MODULE BRIDGE                  │
│                                                                   │
│  ┌─────────┐ ┌─────────┐ ┌──────────┐ ┌──────┐ ┌───────┐      │
│  │  TRUST  │ │ DRISHTI │ │ SENTINEL │ │ DICE │ │ SATHI │      │
│  │ Score + │ │Snapshot │ │ EWS +    │ │ EMI  │ │ Pre-  │      │
│  │ verify  │ │ inputs  │ │ risk     │ │ sched│ │ fill  │      │
│  └────┬────┘ └────┬────┘ └────┬─────┘ └──┬───┘ └──┬────┘      │
│       └───────────┴───────────┴───────────┴────────┘            │
│                          ▲                                       │
│                   aaCrossModuleBridge.js                          │
├──────────────────────────┼───────────────────────────────────────┤
│                    LAYER 2: AGRICULTURAL ANALYZERS                │
│                          │                                       │
│  ┌──────────────┐ ┌─────┴──────┐ ┌──────────────┐ ┌──────────┐│
│  │   Income     │ │  Expense   │ │ Seasonality  │ │Financial ││
│  │  Classifier  │ │  Detector  │ │   Mapper     │ │  Health  ││
│  │(10 agri cats)│ │(9 exp cats)│ │(12-mo heatmap│ │  Scorer  ││
│  └──────────────┘ └────────────┘ │ crop season) │ │ (0-100)  ││
│                                   └──────────────┘ └──────────┘│
├──────────────────────────────────────────────────────────────────┤
│                    LAYER 1: AA INTEGRATION CLIENT                 │
│                                                                   │
│  ┌───────────────┐   ┌──────────────────────────────────────┐   │
│  │  aaConfig.js  │   │  aaConsentService.js                 │   │
│  │  (providers,  │   │  (initiate→approve→fetch→store)      │   │
│  │   FIU config) │   └──────────────────────────────────────┘   │
│  └───────────────┘   ┌──────────────────────────────────────┐   │
│  ┌───────────────┐   │  aaDataFetchService.js                │   │
│  │ setuClient.js │   │  (session→poll→normalize→persist)     │   │
│  │ finvuClient.js│   └──────────────────────────────────────┘   │
│  │ aaFactory.js  │   ┌──────────────────────────────────────┐   │
│  └───────────────┘   │  aaDataFetchConsumer.js (RabbitMQ)    │   │
│                       └──────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────┘
          │                              │
          ▼                              ▼
   ┌──────────────┐            ┌──────────────────┐
   │ Setu AA API  │            │  MySQL Tables     │
   │ Finvu AA API │            │  aa_consents      │
   │ (RBI-licensed│            │  aa_bank_stmt_sum │
   │  providers)  │            │  credit_bureau_rpt│
   └──────────────┘            └──────────────────┘
```

---

## 3. Module File Structure

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
├── modules/aa/                            # Layers 2+3: Intelligence + bridge
│   ├── routes/aaRoutes.js                 # 10 API endpoints + webhook router
│   ├── controllers/aaController.js        # HTTP handling
│   ├── services/
│   │   ├── aaConsentService.js            # Consent lifecycle orchestrator
│   │   ├── aaDataFetchService.js          # Data fetch + normalization + persistence
│   │   ├── aaCrossModuleBridge.js         # Layer 3: TRUST/DRISHTI/SENTINEL/DICE/SATHI bridge
│   │   └── analyzers/                     # Layer 2: Agricultural intelligence
│   │       ├── incomeClassifier.js        # 10-category income classification
│   │       ├── expenseDetector.js         # 9-category expense detection
│   │       ├── seasonalityMapper.js       # 12-month cash flow + crop season detection
│   │       └── financialHealthScorer.js   # 0-100 composite score (6 components)
│   ├── validators/aaValidator.js          # Joi schemas
│   └── workers/aaDataFetchConsumer.js     # RabbitMQ async data fetch
│
├── modules/sentinel/models/               # Existing DB models (already built)
│   ├── AaConsent.js                       # Consent tracking (4 providers)
│   ├── AaBankStatementSummary.js          # Aggregated bank statement metrics
│   └── CreditBureauReport.js             # Credit bureau integration
```

---

## 4. API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/aa/consent` | JWT | Initiate AA consent → returns redirect URL |
| GET | `/aa/consent` | JWT | Get farmer's current consent status |
| GET | `/aa/consent/:uuid` | JWT | Check specific consent (polls provider) |
| DELETE | `/aa/consent` | JWT | Revoke active consent |
| POST | `/aa/webhook/:provider` | None | Receive AA provider callbacks |
| POST | `/aa/fetch` | JWT | Trigger manual data fetch |
| GET | `/aa/analysis` | JWT | Full financial analysis |
| GET | `/aa/analysis/health-score` | JWT | Financial health score (0-100) |
| GET | `/aa/bridge/:module` | JWT | Module-specific data (trust/drishti/sentinel/dice/sathi) |
| GET | `/aa/providers` | JWT | List available AA providers |

---

## 5. Consent Flow

```
Farmer App                FarmerPay API              Setu/Finvu AA            Farmer's Bank (FIP)
    │                          │                          │                         │
    │  POST /aa/consent        │                          │                         │
    │─────────────────────────►│                          │                         │
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
    │                          │                          │                         │
    │                          │  [Queue: aa.data.fetch]  │                         │
    │                          │  ──── RabbitMQ ────►     │                         │
    │                          │                          │                         │
    │                          │  Create data session     │                         │
    │                          │─────────────────────────►│  Fetch statements       │
    │                          │                          │─────────────────────────►│
    │                          │                          │  ◄── 12 months data     │
    │                          │  ◄── decrypted data      │                         │
    │                          │                          │                         │
    │                          │  [Run Layer 2 analyzers] │                         │
    │                          │  [Store to DB + cache]   │                         │
    │                          │                          │                         │
    │  GET /aa/analysis        │                          │                         │
    │─────────────────────────►│                          │                         │
    │  ◄── full financial      │                          │                         │
    │      intelligence        │                          │                         │
```

---

## 6. Income Classification (Layer 2)

The income classifier recognizes 10 agriculture-India-specific income categories from bank transaction narrations:

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

## 7. Financial Health Score (Layer 2)

Composite 0-100 score with 6 weighted components:

| Component | Weight | What it Measures |
|-----------|--------|------------------|
| Cash Flow Stability | 25% | Income regularity + deficit months |
| Balance Adequacy | 20% | Avg balance vs monthly outflow (months covered) |
| Income Diversity | 15% | Number of sources + Herfindahl-Hirschman Index |
| Debt Discipline | 20% | Bounce count + EMI regularity |
| Govt Transfer Access | 10% | PM-KISAN, MGNREGA, PMFBY detection (farmer verification proxy) |
| Digital Adoption | 10% | UPI transaction ratio |

**Grades:** A (80+), B (65-79), C (50-64), D (35-49), E (<35)

---

## 8. Cross-Module Bridge (Layer 3)

| Target Module | What AA Provides | Key Fields |
|---------------|-----------------|------------|
| **TRUST** | Verified income, bounce rate, govt scheme access, digital readiness | `financialHealthScore`, `incomeVerification`, `debtBehavior`, `govtSchemeAccess` |
| **DRISHTI** | Observed household income/expense, seasonality, EMI capacity | `householdIncome`, `householdExpense`, `seasonality`, `emiCapacity` |
| **SENTINEL** | Cash flow risk signals, deficit months, bounce count | `cashFlowScore`, `riskFlags`, `emiSafeMonths`, `overallRisk` |
| **DICE** | Income verification, max EMI capacity, repayment timing | `verifiedMonthlyIncome`, `eligibility`, `repaymentIntelligence` |
| **SATHI** | Onboarding pre-fill (income, schemes, bank accounts) | `preFill`, `verificationStatus` |

---

## 9. Existing DB Tables (Already Migrated)

Three tables exist in the database via migration `20250114000003-sentinel-datamon-alignment.js`:

- `aa_consents` — Consent lifecycle (requested → approved → revoked)
- `aa_bank_statement_summaries` — Aggregated monthly metrics per account
- `credit_bureau_reports` — CIBIL/Experian/Equifax scores

**Now registered** in `src/shared/models/index.js` (previously orphaned).

---

## 10. Configuration

Add to `.env`:

```env
# Account Aggregator
AA_ENABLED=false                          # Set true when AA provider sandbox is ready
AA_ACTIVE_PROVIDER=setu                   # setu | finvu
AA_SETU_BASE_URL=https://fiu-uat.setu.co
AA_SETU_CLIENT_ID=your_client_id
AA_SETU_CLIENT_SECRET=your_client_secret
AA_SETU_PRODUCT_INSTANCE_ID=your_product_instance_id
AA_FINVU_BASE_URL=https://fiu.finvu.in/ConnectHub/FIU
AA_FINVU_API_KEY=your_api_key
AA_FINVU_API_SECRET=your_api_secret
AA_DATA_WINDOW_MONTHS=12
AA_RECURRING_CONSENT=false
```

---

## 11. Redis Cache Keys

| Key Pattern | TTL | Content |
|-------------|-----|---------|
| `aa:handle:{consentHandle}` | 24h | Consent handle → internal ID mapping |
| `aa:consent:{farmerId}` | 24h | Current consent status |
| `aa:summary:{farmerId}` | 12h | Bank statement summaries |
| `aa:analysis:{farmerId}` | 12h | Full financial analysis result |

---

## 12. RabbitMQ Queue

| Queue | Producer | Consumer | Purpose |
|-------|----------|----------|---------|
| `aa.data.fetch` | aaConsentService (on webhook) | aaDataFetchConsumer | Async bank data fetch after consent approval |
