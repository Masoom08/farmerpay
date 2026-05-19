# DRISHTI — System Design Document

> **Module Codename:** DRISHTI (दृष्टि — "Foresight")
> **Purpose:** Farmer Digital Twin — Scenario simulation and financial decision-support engine
> **Author:** FarmerPay Architecture Team
> **Date:** 2026-04-12
> **Status:** Design Phase

---

## 1. Executive Summary

DRISHTI is a new module for the FarmerPay platform that transforms the existing record-keeping system into a forward-looking financial decision-support engine. It enables farmers, field agents (Sathis), and bankers to run "what-if" scenarios across agriculture, dairy, fishery, and horticulture — projecting financial outcomes before committing resources.

DRISHTI does not require new data collection or hardware. It consumes data already flowing through ROOTS (activity tracking), DICE (loans), PULSE (market intelligence), SAGE (weather/advisory), SENTINEL (risk), TRUST (credit scoring), and INSURANCE — and produces scenario simulations that answer: *"If I change X, what happens to my household and farm economics?"*

**Design Philosophy — Household-First Economics:** Indian farming is not a business — it is a household livelihood. A farmer's financial health depends not only on crop/dairy/fishery output, but on spouse's SHG income, children's wage labor, MGNREGA payments, pension, remittances, petty shop earnings, and government transfers (PM-KISAN, DBT). DRISHTI models the **complete household economy**, not just the farm. Every engine factors in total household income and expenses, because a loan repayment comes from the household, not from a single crop.

### Six Engines

| # | Engine | User Question | Primary User |
|---|--------|---------------|--------------|
| 1 | **Pre-Loan Scenario Modeling** | "Should I take this loan?" | Farmer + Banker |
| 2 | **Household & Activity Portfolio Optimizer** | "What should my household do to maximize income?" | Farmer + Sathi |
| 3 | **Climate Stress Testing** | "What if the monsoon fails?" | Farmer + Banker |
| 4 | **Insurance Decision Engine** | "Is PMFBY worth it for me?" | Farmer + Sathi |
| 5 | **Post-Harvest Market Timing** | "Should I sell now or store?" | Farmer |
| 6 | **Banker Portfolio Simulation** | "What if monsoon fails in Vidarbha?" | Banker |

---

## 2. Requirements

### 2.1 Functional Requirements

**FR-1: Pre-Loan Scenario Modeling**
- Given a loan product, amount, and intended crop/activity, produce a projected P&L with three climate scenarios (good, average, stress)
- Calculate: expected revenue, expected costs (from PoP benchmarks), net margin, EMI burden as % of income, breakeven yield
- Attach simulation results to DICE LoanApplication for banker review
- Show projected SMA classification under each scenario

**FR-2: Household & Activity Portfolio Optimizer**
- Model the **complete household economy** — farm activities + all non-farm income streams — as a single integrated cash flow timeline
- **Farm activity inputs:** acreage allocation, crop selection, herd size, pond area, input spend level
- **Household income inputs:**
  - Spouse SHG income (Self Help Group — monthly savings, internal lending returns, micro-enterprise income)
  - Wage labor income (farmer, spouse, or family members — daily/seasonal labor earnings)
  - MGNREGA income (guaranteed 100-day employment, ₹267-350/day depending on state)
  - Pension income (Old Age Pension, Widow Pension, Disability Pension)
  - Remittances (from family members working in cities/abroad — monthly or irregular)
  - Petty business income (kirana shop, tailoring, auto-rickshaw, etc.)
  - Government transfers (PM-KISAN ₹6,000/year, DBT subsidies, state schemes)
  - Rental income (land lease-out, equipment rental)
  - Other income (custom category with label)
- **Household expense inputs:**
  - Food and groceries (monthly)
  - Education expenses (children's school/college — monthly/annual)
  - Healthcare expenses (monthly average + emergency buffer)
  - Housing (rent, maintenance, construction EMI)
  - Social obligations (weddings, festivals, religious — seasonal/annual)
  - Transportation
  - Utilities (electricity, phone, gas)
  - Loan EMIs (non-farm loans — personal, gold, housing)
- Show month-by-month **household cash flow**: all farm inflows + all non-farm inflows vs all farm outflows + all household outflows + all EMIs
- Highlight months where cash flow goes negative and calculate **working capital gap**
- Calculate **household financial resilience score**: months of expenses coverable by savings + non-farm income if all farm income stops
- Show **income diversification index**: what percentage of household income comes from each source

**FR-3: Climate Stress Testing**
- Accept a climate scenario (rainfall deviation from normal, temperature shift, delayed monsoon weeks)
- Cascade impact: yield adjustment → revenue change → dairy feed cost change → loan repayment stress → SMA migration probability
- Support Monte Carlo mode: model key variables as distributions, run N simulations, show probability bands
- Output: probability of income falling below a threshold, expected SMA classification distribution

**FR-4: Insurance Decision Engine**
- Compare two scenarios: with and without insurance enrollment
- Calculate: premium cost, expected loss without insurance (based on historical district-level claim data), expected payout probability
- Show net financial position under stress scenarios with/without coverage
- Support PMFBY, livestock, aquaculture, weather index insurance types

**FR-5: Post-Harvest Market Timing**
- Given a commodity, quantity, and current market price from PULSE, simulate storage scenarios
- Model: warehousing cost per quintal/month, interest cost of active loan, PULSE price forecast over 30/60/90 days
- Calculate: probability of net gain from storage vs immediate sale
- Integrate with DICE post-harvest topup loan simulation

**FR-6: Banker Portfolio Simulation**
- Accept district-level or portfolio-level climate/market shocks
- Run individual farmer DRISHTI simulations across all farmers in the portfolio simultaneously
- Aggregate: projected SMA migration, expected NPA count, total portfolio-at-risk amount
- Identify top-N farmers requiring proactive intervention
- Support batch execution via RabbitMQ

### 2.2 Non-Functional Requirements

| Requirement | Target | Rationale |
|-------------|--------|-----------|
| Latency (single farmer scenario) | < 3 seconds | Sathi-farmer conversation must feel interactive |
| Latency (Monte Carlo, 1000 runs) | < 10 seconds | Acceptable for deeper analysis |
| Latency (portfolio simulation, 500 farmers) | < 60 seconds | Async via queue, result delivered to dashboard |
| Availability | 99.5% | Same as platform SLA |
| Data freshness | Daily | Scenarios use daily-refreshed PULSE/SAGE data |
| Concurrency | 50 concurrent single-farmer simulations | Peak during Sathi field visit hours (9am-5pm) |
| Storage | ~2KB per scenario run (JSON result) | Retain for 2 years for audit/analytics |
| Language support | 11 languages via Bhashini | Scenario results must be translatable |

### 2.3 Constraints

- Must fit within the existing Express.js + MySQL + Redis + RabbitMQ stack
- No new infrastructure dependencies (no Python ML servers, no Spark clusters)
- Computation must be doable in Node.js
- Must follow existing module pattern: routes → controllers → services → models → validators
- All financial amounts: DECIMAL(15,2). All rates: DECIMAL(5,2) or DECIMAL(5,3)
- Must integrate with existing audit, notification, and translation services

---

## 3. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          CLIENT LAYER                                       │
│                                                                             │
│   Farmer App        Sathi Dashboard      Banker Dashboard    Farmer Web     │
│   ┌───────────┐     ┌──────────────┐     ┌──────────────┐   ┌──────────┐  │
│   │ Scenario   │     │ Guided       │     │ Loan Risk    │   │ Scenario │  │
│   │ Screens    │     │ Scenario     │     │ Simulation   │   │ Widget   │  │
│   │ (4 screens)│     │ Builder      │     │ + Portfolio   │   │          │  │
│   └─────┬─────┘     └──────┬───────┘     │ Stress Test  │   └────┬─────┘  │
│         │                   │             └──────┬───────┘        │         │
└─────────┼───────────────────┼────────────────────┼───────────────┼─────────┘
          │                   │                    │               │
          ▼                   ▼                    ▼               ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                     DRISHTI API LAYER  (/api/v1/drishti)                     │
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                     DrishtiController                                │   │
│  │  POST /scenarios/pre-loan          POST /scenarios/household-portfolio│   │
│  │  POST /scenarios/climate-stress    POST /scenarios/insurance         │   │
│  │  POST /scenarios/market-timing     POST /scenarios/banker-portfolio  │   │
│  │  GET  /scenarios/:id               GET  /scenarios/farmer/:farmerId  │   │
│  │  GET  /scenarios/comparison/:id    POST /scenarios/compare           │   │
│  └──────────────────────────┬───────────────────────────────────────────┘   │
│                              │                                               │
│  ┌──────────────────────────▼───────────────────────────────────────────┐   │
│  │                     DrishtiService (Orchestrator)                     │   │
│  │                                                                      │   │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌──────────────┐  │   │
│  │  │ ProfileSnap- │ │  Scenario   │ │ Computation │ │   Result     │  │   │
│  │  │ shotBuilder  │ │  Validator  │ │   Engine    │ │  Formatter   │  │   │
│  │  └──────┬──────┘ └─────────────┘ └──────┬──────┘ └──────────────┘  │   │
│  │         │                                │                           │   │
│  │         │  ┌─────────────────────────────┤                           │   │
│  │         │  │   SIX COMPUTATION ENGINES   │                           │   │
│  │         │  │  ┌───────────────────────┐  │                           │   │
│  │         │  │  │ PreLoanEngine         │  │                           │   │
│  │         │  │  │ PortfolioOptEngine    │  │                           │   │
│  │         │  │  │ ClimateStressEngine   │  │                           │   │
│  │         │  │  │ InsuranceEngine       │  │                           │   │
│  │         │  │  │ MarketTimingEngine    │  │                           │   │
│  │         │  │  │ BankerPortfolioEngine │  │                           │   │
│  │         │  │  └───────────────────────┘  │                           │   │
│  │         │  └─────────────────────────────┘                           │   │
│  └─────────┼────────────────────────────────────────────────────────────┘   │
│            │                                                                 │
└────────────┼─────────────────────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    DATA SOURCE LAYER (Read-Only Consumers)                   │
│                                                                             │
│  ┌─────────┐ ┌───────┐ ┌───────┐ ┌──────┐ ┌──────────┐ ┌───────┐         │
│  │ FARMER  │ │ ROOTS │ │ DICE  │ │PULSE │ │ SENTINEL │ │ SAGE  │         │
│  │ Profile │ │ Crop  │ │ Loan  │ │Market│ │   Risk   │ │Weather│         │
│  │ Land    │ │ Dairy │ │Product│ │Price │ │  Income  │ │Alerts │         │
│  │ Assets  │ │Fishery│ │  EMI  │ │Fcst  │ │  Adequacy│ │       │         │
│  └─────────┘ └───────┘ └───────┘ └──────┘ └──────────┘ └───────┘         │
│  ┌─────────┐ ┌───────┐ ┌───────┐                                          │
│  │  TRUST  │ │INSUR- │ │VYAPAR │                                          │
│  │ Credit  │ │ ANCE  │ │Vendor │                                          │
│  │ Score   │ │Enroll │ │Prices │                                          │
│  └─────────┘ └───────┘ └───────┘                                          │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  DRISHTI OWN TABLES                                                 │   │
│  │  ScenarioRun │ ScenarioVariable │ ScenarioResult │ ScenarioCompare  │   │
│  │  FarmerSnapshot │ BenchmarkProfile │ ScenarioTemplate                │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌──────────┐  ┌────────────┐                                              │
│  │  Redis   │  │  RabbitMQ  │                                              │
│  │  Cache   │  │  Portfolio │                                              │
│  │ Bench-   │  │  Batch     │                                              │
│  │ marks    │  │  Queue     │                                              │
│  └──────────┘  └────────────┘                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 3.1 Key Architectural Decisions

**Decision 1: DRISHTI is a read-only consumer, not a data owner.**
DRISHTI never writes to ROOTS, DICE, PULSE, or any other module's tables. It reads their data, computes scenarios, and writes only to its own `drishti_*` tables. This means zero risk of corrupting existing module data and zero coupling to their write paths.

**Decision 2: Snapshot-then-compute pattern.**
Before running any scenario, DRISHTI takes a "FarmerSnapshot" — a frozen-in-time copy of the farmer's current state from all modules. The scenario runs against the snapshot, not live data. This ensures deterministic results (same inputs → same outputs) and allows replaying/auditing scenarios later.

**Decision 3: Engine-per-scenario-type, shared computation primitives.**
Each of the 6 engines is a separate service class, but they share computation primitives: `CashFlowProjector`, `YieldEstimator`, `CostEstimator`, `PriceForecaster`, `EMICalculator`, `RiskClassifier`. This avoids duplication while keeping engine logic focused.

**Decision 4: Synchronous for single-farmer, async for portfolio.**
Engines 1-5 (single farmer) run synchronously and return results in the HTTP response (< 3s target). Engine 6 (banker portfolio) publishes to RabbitMQ and delivers results via notification when complete.

**Decision 5: Redis-cached benchmarks, not real-time queries.**
District-level benchmarks (average yield, average costs, price ranges) are computed by a nightly cron job and stored in Redis. Individual scenario runs read from cache, not from aggregating thousands of rows in real time.

---

## 4. Data Model

### 4.1 DRISHTI Tables (New)

#### drishti_scenario_templates

Pre-defined scenario blueprints that power the UI dropdowns and guided flows.

```sql
CREATE TABLE drishti_scenario_templates (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  template_uuid   VARCHAR(36) UNIQUE NOT NULL,
  engine_type     ENUM('pre_loan', 'household_portfolio', 'climate_stress',
                       'insurance', 'market_timing', 'banker_portfolio') NOT NULL,
  template_name   VARCHAR(150) NOT NULL,
  template_name_key VARCHAR(100),                   -- i18n key for Bhashini
  description     TEXT,
  default_variables JSON NOT NULL,                   -- default slider values
  variable_ranges JSON NOT NULL,                     -- min/max/step for each variable
  activity_types  JSON,                              -- ['crop','dairy','fishery','horticulture']
  is_system       BOOLEAN DEFAULT TRUE,              -- system vs user-created
  display_order   INT DEFAULT 0,
  is_active       BOOLEAN DEFAULT TRUE,
  created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_engine_type (engine_type),
  INDEX idx_active (is_active)
);
```

#### drishti_farmer_snapshots

A frozen-in-time snapshot of the farmer's complete profile at the moment a scenario is run. This is the "digital twin" — a structured copy of everything DRISHTI knows about this farmer.

```sql
CREATE TABLE drishti_farmer_snapshots (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  snapshot_uuid   VARCHAR(36) UNIQUE NOT NULL,
  farmer_id       INT NOT NULL,
  snapshot_date   DATE NOT NULL,

  -- FARMER module data
  total_farm_size_hectares    DECIMAL(10,4),
  land_ownership_type         VARCHAR(20),
  years_farming_experience    INT,
  education_level             VARCHAR(30),
  family_size                 INT,
  district_id                 INT,
  block_id                    INT,

  -- ROOTS: Current activities summary
  active_crop_cycles          JSON,     -- [{cycle_id, crop, variety, acreage, season, stage}]
  active_dairy_profile        JSON,     -- {herd_id, animal_count, avg_daily_milk_liters, breed}
  active_fishery_profile      JSON,     -- {register_id, pond_count, total_area_hectares, species}
  horticulture_profile        JSON,     -- {orchard details if any}

  -- ROOTS: Historical performance (last 3 seasons)
  historical_crop_profitability   JSON, -- [{season, crop, acreage, total_cost, total_revenue, profit}]
  historical_dairy_profitability  JSON, -- [{month, total_income, total_expense, net_profit}]
  historical_fishery_profitability JSON,-- [{cycle, total_income, total_expense, net_profit}]

  -- DICE: Loan exposure
  active_loans                JSON,     -- [{application_id, product, outstanding, emi, next_due, health}]
  total_outstanding           DECIMAL(15,2) DEFAULT 0,
  total_monthly_emi           DECIMAL(15,2) DEFAULT 0,

  -- TRUST: Credit profile
  trust_score                 INT,
  trust_band                  VARCHAR(20),

  -- SENTINEL: Risk profile
  income_adequacy_status      VARCHAR(20),
  loan_to_income_ratio        DECIMAL(5,2),
  risk_severity_band          VARCHAR(20),

  -- PULSE: Relevant market data
  relevant_commodity_prices   JSON,     -- [{commodity, current_price, forecast_30d, forecast_confidence}]

  -- SAGE: Current weather outlook
  weather_outlook             JSON,     -- {rainfall_forecast, temperature_forecast, alert_level}

  -- INSURANCE: Coverage status
  active_insurance            JSON,     -- [{type, sum_insured, premium, expiry}]

  -- HOUSEHOLD INCOME: Complete non-farm income picture
  household_income_details    JSON,     -- Full breakdown, see schema below
  -- Extracted summary columns for queryability:
  spouse_shg_monthly          DECIMAL(15,2) DEFAULT 0,   -- SHG savings returns + micro-enterprise
  wage_labor_monthly          DECIMAL(15,2) DEFAULT 0,   -- Daily labor (farmer + family)
  mgnrega_annual              DECIMAL(15,2) DEFAULT 0,   -- 100-day employment income
  pension_monthly             DECIMAL(15,2) DEFAULT 0,   -- All pension types
  remittance_monthly          DECIMAL(15,2) DEFAULT 0,   -- From migrant family members
  petty_business_monthly      DECIMAL(15,2) DEFAULT 0,   -- Kirana, tailoring, auto, etc.
  govt_transfers_annual       DECIMAL(15,2) DEFAULT 0,   -- PM-KISAN + DBT + state schemes
  rental_income_monthly       DECIMAL(15,2) DEFAULT 0,   -- Land/equipment lease
  other_income_monthly        DECIMAL(15,2) DEFAULT 0,   -- Custom/misc
  total_non_farm_monthly      DECIMAL(15,2) DEFAULT 0,   -- Computed: sum of all above (annualized/12)
  non_farm_income_streams     INT DEFAULT 0,             -- Count of active non-farm streams

  -- HOUSEHOLD EXPENSES: Full expense picture
  household_expense_details   JSON,     -- Full breakdown, see schema below
  -- Extracted summary columns:
  food_groceries_monthly      DECIMAL(15,2) DEFAULT 0,
  education_monthly           DECIMAL(15,2) DEFAULT 0,
  healthcare_monthly          DECIMAL(15,2) DEFAULT 0,
  housing_monthly             DECIMAL(15,2) DEFAULT 0,
  social_obligations_annual   DECIMAL(15,2) DEFAULT 0,   -- Weddings, festivals
  transportation_monthly      DECIMAL(15,2) DEFAULT 0,
  utilities_monthly           DECIMAL(15,2) DEFAULT 0,
  non_farm_loan_emi_monthly   DECIMAL(15,2) DEFAULT 0,   -- Personal/gold/housing loans
  total_household_expense_monthly DECIMAL(15,2) DEFAULT 0,

  -- HOUSEHOLD CONTEXT
  family_members_count        INT DEFAULT 1,
  earning_members_count       INT DEFAULT 1,
  dependents_count            INT DEFAULT 0,
  spouse_occupation           VARCHAR(50),
  primary_non_farm_occupation VARCHAR(50),              -- If farmer has side business

  is_active       BOOLEAN DEFAULT TRUE,
  created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_farmer (farmer_id),
  INDEX idx_date (snapshot_date),
  INDEX idx_farmer_date (farmer_id, snapshot_date)
);
```

**household_income_details JSON Schema:**

```json
{
  "income_streams": [
    {
      "source": "spouse_shg",
      "label": "Wife's SHG — Jai Bhavani Group",
      "earning_member": "spouse",
      "amount_monthly": 3500,
      "frequency": "monthly",
      "reliability": "regular",
      "seasonal_variation": false,
      "notes": "Member since 2022, monthly savings ₹500 + lending returns"
    },
    {
      "source": "wage_labor",
      "label": "Construction labor",
      "earning_member": "farmer",
      "amount_monthly": 6000,
      "frequency": "seasonal",
      "active_months": [1, 2, 3, 4, 5, 11, 12],
      "reliability": "irregular",
      "seasonal_variation": true,
      "notes": "Works at construction sites when no farm work"
    },
    {
      "source": "mgnrega",
      "label": "MGNREGA",
      "earning_member": "farmer",
      "amount_annual": 26700,
      "days_employed": 80,
      "daily_wage": 333,
      "frequency": "seasonal",
      "active_months": [4, 5, 6, 10, 11],
      "reliability": "regular"
    },
    {
      "source": "pension",
      "label": "Old Age Pension — Father",
      "earning_member": "family",
      "amount_monthly": 1000,
      "frequency": "monthly",
      "reliability": "guaranteed"
    },
    {
      "source": "remittance",
      "label": "Son working in Pune",
      "earning_member": "family",
      "amount_monthly": 5000,
      "frequency": "monthly",
      "reliability": "regular"
    },
    {
      "source": "petty_business",
      "label": "Kirana shop (spouse)",
      "earning_member": "spouse",
      "amount_monthly": 4000,
      "frequency": "daily",
      "reliability": "regular"
    },
    {
      "source": "govt_transfer",
      "label": "PM-KISAN",
      "earning_member": "farmer",
      "amount_annual": 6000,
      "frequency": "quarterly",
      "installment_amount": 2000,
      "installment_months": [4, 8, 12],
      "reliability": "guaranteed"
    },
    {
      "source": "rental",
      "label": "Land lease — 0.5 acre to neighbor",
      "earning_member": "farmer",
      "amount_annual": 12000,
      "frequency": "annual",
      "reliability": "regular"
    },
    {
      "source": "other",
      "label": "Custom income source",
      "earning_member": "farmer",
      "amount_monthly": 0,
      "frequency": "monthly",
      "reliability": "irregular"
    }
  ],
  "total_monthly_non_farm": 22500,
  "total_annual_non_farm": 270000,
  "earning_members": ["farmer", "spouse", "family"],
  "data_source": "sathi_verified",
  "last_verified_date": "2026-03-15"
}
```

**household_expense_details JSON Schema:**

```json
{
  "expense_categories": [
    {"category": "food_groceries", "monthly": 6000, "notes": "Family of 5"},
    {"category": "education", "monthly": 2500, "notes": "2 children in school, 1 in college", "annual_lumpsum": 15000, "lumpsum_month": 6},
    {"category": "healthcare", "monthly": 1000, "emergency_buffer_annual": 5000},
    {"category": "housing", "monthly": 0, "notes": "Own house, no rent"},
    {"category": "social_obligations", "annual": 20000, "notes": "Festivals, community events", "peak_months": [3, 10, 11]},
    {"category": "transportation", "monthly": 800},
    {"category": "utilities", "monthly": 1200, "breakdown": {"electricity": 600, "phone": 400, "gas": 200}},
    {"category": "non_farm_loan_emi", "monthly": 2000, "notes": "Gold loan EMI — jeweler"}
  ],
  "total_monthly_expense": 13500,
  "total_annual_expense": 187000,
  "seasonal_peaks": [
    {"month": 6, "reason": "School fees", "extra_amount": 15000},
    {"month": 10, "reason": "Diwali + harvest festival", "extra_amount": 10000}
  ],
  "data_source": "farmer_declared",
  "last_verified_date": "2026-03-15"
}
```

#### drishti_household_income_sources

Persistent storage of household income data collected by Sathi during field visits. This feeds into snapshots but also serves as standalone household financial profile.

```sql
CREATE TABLE drishti_household_income_sources (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  source_uuid     VARCHAR(36) UNIQUE NOT NULL,
  farmer_id       INT NOT NULL,

  -- Income source details
  source_type     ENUM('spouse_shg', 'wage_labor', 'mgnrega', 'pension',
                       'remittance', 'petty_business', 'govt_transfer',
                       'rental', 'other') NOT NULL,
  source_label    VARCHAR(150),                       -- Human-readable label
  earning_member  ENUM('farmer', 'spouse', 'son', 'daughter',
                       'parent', 'family', 'other') NOT NULL,
  earning_member_name VARCHAR(100),

  -- Amount and frequency
  amount          DECIMAL(15,2) NOT NULL,
  frequency       ENUM('daily', 'weekly', 'monthly', 'quarterly',
                       'seasonal', 'annual', 'irregular') NOT NULL,
  amount_monthly_equivalent  DECIMAL(15,2),            -- Normalized to monthly
  active_months   JSON,                                -- [1,2,3...12] for seasonal income
  reliability     ENUM('guaranteed', 'regular', 'irregular', 'one_time') DEFAULT 'regular',

  -- SHG-specific fields (populated when source_type = 'spouse_shg')
  shg_name        VARCHAR(100),
  shg_monthly_saving  DECIMAL(10,2),
  shg_loan_outstanding DECIMAL(15,2),
  shg_member_since DATE,

  -- Verification
  verified_by_sathi  BOOLEAN DEFAULT FALSE,
  verified_at     DATE,
  verification_evidence VARCHAR(200),                  -- Photo/document reference
  confidence_level ENUM('declared', 'sathi_verified', 'document_verified') DEFAULT 'declared',

  is_active       BOOLEAN DEFAULT TRUE,
  created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_farmer (farmer_id),
  INDEX idx_source_type (source_type),
  INDEX idx_earning_member (earning_member)
);
```

#### drishti_household_expenses

Persistent storage of household expense data.

```sql
CREATE TABLE drishti_household_expenses (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  expense_uuid    VARCHAR(36) UNIQUE NOT NULL,
  farmer_id       INT NOT NULL,

  category        ENUM('food_groceries', 'education', 'healthcare', 'housing',
                       'social_obligations', 'transportation', 'utilities',
                       'non_farm_loan_emi', 'clothing', 'other') NOT NULL,
  category_label  VARCHAR(100),

  -- Amount and frequency
  amount          DECIMAL(15,2) NOT NULL,
  frequency       ENUM('daily', 'weekly', 'monthly', 'quarterly',
                       'seasonal', 'annual') NOT NULL,
  amount_monthly_equivalent  DECIMAL(15,2),
  peak_months     JSON,                                -- Months with above-average expense
  peak_amount     DECIMAL(15,2),                       -- Extra amount in peak months
  notes           TEXT,

  -- Verification
  verified_by_sathi  BOOLEAN DEFAULT FALSE,
  confidence_level ENUM('declared', 'sathi_estimated', 'document_verified') DEFAULT 'declared',

  is_active       BOOLEAN DEFAULT TRUE,
  created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_farmer (farmer_id),
  INDEX idx_category (category)
);
```

#### drishti_scenario_runs

Each execution of a scenario engine. This is the primary record — "farmer X ran scenario Y at time Z."

```sql
CREATE TABLE drishti_scenario_runs (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  run_uuid        VARCHAR(36) UNIQUE NOT NULL,
  farmer_id       INT NOT NULL,
  snapshot_id     INT NOT NULL,                      -- FK → drishti_farmer_snapshots
  template_id     INT,                               -- FK → drishti_scenario_templates (nullable for custom)
  engine_type     ENUM('pre_loan', 'household_portfolio', 'climate_stress',
                       'insurance', 'market_timing', 'banker_portfolio') NOT NULL,

  -- Who initiated
  initiated_by    INT NOT NULL,                      -- FK → users (farmer, sathi, or banker)
  initiator_role  ENUM('farmer', 'sathi', 'banker', 'admin') NOT NULL,

  -- Context links
  loan_application_id  INT,                          -- FK → loan_applications (for pre_loan engine)
  portfolio_run_id     INT,                          -- FK → drishti_portfolio_runs (for banker_portfolio)

  -- Input variables
  input_variables JSON NOT NULL,                     -- The specific values the user set

  -- Computation metadata
  computation_mode  ENUM('deterministic', 'monte_carlo') DEFAULT 'deterministic',
  monte_carlo_runs  INT DEFAULT 0,                   -- Number of MC iterations if applicable
  computation_time_ms INT,                           -- How long the engine took

  -- Status
  status          ENUM('pending', 'computing', 'completed', 'failed') DEFAULT 'pending',
  error_message   TEXT,

  is_active       BOOLEAN DEFAULT TRUE,
  created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_farmer (farmer_id),
  INDEX idx_engine (engine_type),
  INDEX idx_loan (loan_application_id),
  INDEX idx_status (status),
  INDEX idx_created (created_at)
);
```

#### drishti_scenario_results

The computed output for each scenario run. Stored as structured JSON for flexibility, with key summary fields extracted as columns for querying.

```sql
CREATE TABLE drishti_scenario_results (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  result_uuid     VARCHAR(36) UNIQUE NOT NULL,
  run_id          INT NOT NULL,                      -- FK → drishti_scenario_runs
  scenario_label  VARCHAR(50) NOT NULL,              -- 'optimistic', 'base', 'stress', 'with_insurance', etc.

  -- Summary metrics (extracted for queryability)
  projected_revenue       DECIMAL(15,2),
  projected_cost          DECIMAL(15,2),
  projected_net_income    DECIMAL(15,2),
  projected_roi_percent   DECIMAL(5,2),
  emi_to_income_ratio     DECIMAL(5,2),
  breakeven_yield_kg      DECIMAL(10,2),
  cash_flow_negative_months INT DEFAULT 0,
  projected_health_status VARCHAR(20),               -- good, watch, stressed, npa
  projected_sma_class     VARCHAR(20),               -- standard, sma_0_30, etc.
  income_adequacy_status  VARCHAR(20),               -- strong, adequate, marginal, inadequate

  -- Monte Carlo outputs (if applicable)
  probability_profitable   DECIMAL(5,2),             -- % of MC runs that are profitable
  probability_sma_stress   DECIMAL(5,2),             -- % that trigger SMA classification
  income_p10              DECIMAL(15,2),             -- 10th percentile income
  income_p50              DECIMAL(15,2),             -- median income
  income_p90              DECIMAL(15,2),             -- 90th percentile income

  -- Full detailed output
  monthly_cashflow        JSON,                      -- [{month, inflows: {crop, dairy, fish, other}, outflows: {inputs, feed, emi, household}, net, cumulative}]
  detailed_breakdown      JSON,                      -- engine-specific detailed results
  risk_factors            JSON,                      -- [{factor, impact, severity}]
  recommendations         JSON,                      -- [{type, message, message_key}]

  is_active       BOOLEAN DEFAULT TRUE,
  created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_run (run_id),
  INDEX idx_label (scenario_label)
);
```

#### drishti_scenario_comparisons

Side-by-side comparison of 2-3 scenario results, used when the farmer wants to compare options.

```sql
CREATE TABLE drishti_scenario_comparisons (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  comparison_uuid VARCHAR(36) UNIQUE NOT NULL,
  farmer_id       INT NOT NULL,
  comparison_label VARCHAR(150),

  run_ids         JSON NOT NULL,                     -- [run_id_1, run_id_2, run_id_3]
  comparison_summary JSON,                           -- pre-computed diff highlights
  recommended_run_id INT,                            -- engine's recommendation

  is_active       BOOLEAN DEFAULT TRUE,
  created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_farmer (farmer_id)
);
```

#### drishti_benchmark_profiles

District + crop/activity level benchmarks, refreshed nightly, cached in Redis.

```sql
CREATE TABLE drishti_benchmark_profiles (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  benchmark_uuid  VARCHAR(36) UNIQUE NOT NULL,
  district_id     INT NOT NULL,
  season          VARCHAR(20),                       -- kharif, rabi, summer, annual
  activity_type   ENUM('crop', 'dairy', 'fishery', 'horticulture') NOT NULL,

  -- For crop
  crop_id         VARCHAR(36),
  avg_yield_kg_per_hectare     DECIMAL(10,2),
  avg_cost_per_hectare         DECIMAL(15,2),
  avg_revenue_per_hectare      DECIMAL(15,2),
  avg_profit_per_hectare       DECIMAL(15,2),

  -- For dairy
  avg_milk_yield_per_animal    DECIMAL(8,2),
  avg_monthly_cost_per_animal  DECIMAL(15,2),
  avg_monthly_revenue_per_animal DECIMAL(15,2),

  -- For fishery
  avg_yield_kg_per_hectare_pond DECIMAL(10,2),
  avg_cost_per_hectare_pond     DECIMAL(15,2),
  avg_revenue_per_hectare_pond  DECIMAL(15,2),

  -- Climate sensitivity
  yield_rainfall_elasticity    DECIMAL(5,3),          -- % yield change per % rainfall change
  yield_temperature_sensitivity DECIMAL(5,3),

  -- Insurance history
  historical_claim_rate_pct    DECIMAL(5,2),
  avg_claim_payout             DECIMAL(15,2),

  sample_size     INT,                                -- number of farmers in benchmark
  benchmark_date  DATE NOT NULL,
  is_active       BOOLEAN DEFAULT TRUE,
  created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_district_season (district_id, season),
  INDEX idx_crop (crop_id),
  INDEX idx_activity (activity_type),
  UNIQUE KEY uk_benchmark (district_id, season, activity_type, crop_id, benchmark_date)
);
```

#### drishti_portfolio_runs (Banker Portfolio Simulation)

Batch simulation runs across a set of farmers.

```sql
CREATE TABLE drishti_portfolio_runs (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  portfolio_run_uuid VARCHAR(36) UNIQUE NOT NULL,
  banker_id       INT NOT NULL,                       -- FK → users
  run_label       VARCHAR(200),

  -- Scope
  district_id     INT,
  block_id        INT,
  loan_product_id INT,
  farmer_count    INT NOT NULL,
  farmer_ids      JSON,                               -- [farmer_id_1, farmer_id_2, ...]

  -- Shock parameters
  shock_variables JSON NOT NULL,                      -- {rainfall_deviation_pct: -20, price_change_pct: -10, ...}

  -- Aggregated results
  total_portfolio_outstanding   DECIMAL(15,2),
  projected_npa_count           INT,
  projected_npa_amount          DECIMAL(15,2),
  projected_sma_migration       JSON,                 -- {good_to_watch: N, watch_to_stressed: N, ...}
  farmers_needing_intervention  JSON,                 -- [{farmer_id, risk_score, projected_status}]
  portfolio_var_95              DECIMAL(15,2),         -- Value at Risk (95th percentile loss)

  -- Status
  status          ENUM('queued', 'processing', 'completed', 'failed') DEFAULT 'queued',
  progress_pct    INT DEFAULT 0,
  started_at      DATETIME,
  completed_at    DATETIME,
  error_message   TEXT,

  is_active       BOOLEAN DEFAULT TRUE,
  created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_banker (banker_id),
  INDEX idx_status (status),
  INDEX idx_district (district_id)
);
```

### 4.2 Entity Relationship Summary

```
drishti_scenario_templates
         │
         │ (optional, template_id)
         ▼
drishti_scenario_runs ──────────► drishti_farmer_snapshots
         │                            (snapshot_id)
         │
         │ (run_id)
         ▼
drishti_scenario_results
         │
         │ (run_ids[])
         ▼
drishti_scenario_comparisons


drishti_portfolio_runs ──1:N──► drishti_scenario_runs
   (banker batch)               (portfolio_run_id)


drishti_household_income_sources ──► drishti_farmer_snapshots
   (farmer_id)                       (household_income_details JSON)

drishti_household_expenses ──► drishti_farmer_snapshots
   (farmer_id)                 (household_expense_details JSON)

drishti_benchmark_profiles ── Redis cache ── read by all engines
```

### 4.3 Cross-Module Data Dependencies (Read-Only)

| DRISHTI Needs | Source Module | Source Table(s) | Access Pattern |
|---------------|-------------- |-----------------|----------------|
| Farmer profile, land, assets | FARMER | farmer_profiles, farmer_addresses | By farmer_id |
| Crop history, costs, revenue | ROOTS/crop | cultivation_cycle_profitability, task_execution_input_log, harvest_sale_records | By farmer_id, last 3 seasons |
| PoP cost benchmarks | ROOTS/crop | pop_cost_benchmarks, packages_of_practice | By crop_id + district |
| Dairy income/expense | ROOTS/dairy | dairy_income_summaries, dairy_expense_summaries, dairy_profitability_summaries | By herd_id, last 12 months |
| Fishery income/expense | ROOTS/fishery | fishery_income_summaries, fishery_expense_summaries | By register_id |
| Loan products & terms | DICE | loan_products, loan_applications, loan_repayment_schedules | By product_id, farmer_id |
| Market prices & forecasts | PULSE | pulse_price_records, pulse_price_forecasts, pulse_msp | By commodity_id |
| Weather outlook | SAGE | sage_weather_events | By district, date range |
| Credit score | TRUST | trust_score_history | Latest by farmer_id |
| Risk & income adequacy | SENTINEL | income_adequacy_assessments, rss_score_history, loan_health_snapshots | By farmer_id |
| Insurance coverage | DICE/INSURANCE | insurance_enrollments | By farmer_id |
| Vendor input prices | VYAPAR | vendor_products | By category |

---

## 5. Module Structure

Following the existing FarmerPay MVC + Service Layer pattern:

```
src/modules/drishti/
├── routes/
│   └── drishtiRoutes.js                 # All DRISHTI API endpoints
│
├── controllers/
│   └── drishtiController.js             # Request handling, response formatting
│
├── services/
│   ├── drishtiService.js                # Main orchestrator
│   ├── snapshotBuilder.js               # Builds FarmerSnapshot from cross-module data
│   │
│   ├── engines/                         # One engine per scenario type
│   │   ├── preLoanEngine.js
│   │   ├── householdPortfolioEngine.js  # Household + Activity Portfolio Optimizer
│   │   ├── climateStressEngine.js
│   │   ├── insuranceEngine.js
│   │   ├── marketTimingEngine.js
│   │   └── bankerPortfolioEngine.js
│   │
│   ├── computation/                     # Shared computation primitives
│   │   ├── cashFlowProjector.js         # Month-by-month cash flow builder (farm + household)
│   │   ├── yieldEstimator.js            # Yield projection with climate adjustments
│   │   ├── costEstimator.js             # Cost projection from PoP + actuals
│   │   ├── priceForecaster.js           # Price projection using PULSE data
│   │   ├── emiCalculator.js             # EMI / bullet / flexible repayment math
│   │   ├── riskClassifier.js            # SMA / health classification logic
│   │   ├── monteCarloRunner.js          # MC simulation driver
│   │   ├── insuranceModeler.js          # Insurance premium-vs-payout modeling
│   │   ├── householdIncomeProjector.js  # Non-farm income timeline (seasonal, irregular)
│   │   ├── householdExpenseProjector.js # Household expense timeline (with seasonal peaks)
│   │   └── resilienceCalculator.js      # Financial resilience and survival scoring
│   │
│   ├── householdService.js             # CRUD for household income/expense profiles
│   └── benchmarkService.js             # Benchmark computation + Redis cache
│
├── models/
│   ├── DrishtiScenarioTemplate.js
│   ├── DrishtiFarmerSnapshot.js
│   ├── DrishtiScenarioRun.js
│   ├── DrishtiScenarioResult.js
│   ├── DrishtiScenarioComparison.js
│   ├── DrishtiBenchmarkProfile.js
│   ├── DrishtiPortfolioRun.js
│   ├── DrishtiHouseholdIncomeSource.js   # Persistent household income data
│   └── DrishtiHouseholdExpense.js        # Persistent household expense data
│
├── validators/
│   ├── preLoanValidator.js
│   ├── householdPortfolioValidator.js
│   ├── householdIncomeValidator.js       # Income source CRUD validation
│   ├── householdExpenseValidator.js      # Expense CRUD validation
│   ├── climateStressValidator.js
│   ├── insuranceValidator.js
│   ├── marketTimingValidator.js
│   └── bankerPortfolioValidator.js
│
└── workers/
    └── portfolioSimulationConsumer.js   # RabbitMQ consumer for banker batch jobs
```

---

## 6. API Design

### 6.1 Endpoint Overview

All endpoints prefixed with `/api/v1/drishti`. Authentication required via JWT. Role-based access.

| Method | Path | Role | Engine | Response |
|--------|------|------|--------|----------|
| POST | `/scenarios/pre-loan` | farmer, sathi, banker | PreLoan | Sync JSON |
| POST | `/scenarios/household-portfolio` | farmer, sathi | HouseholdPortfolio | Sync JSON |
| GET | `/household/:farmerId/income` | farmer, sathi, banker | — | Income sources |
| POST | `/household/:farmerId/income` | farmer, sathi | — | Add/update income source |
| GET | `/household/:farmerId/expenses` | farmer, sathi, banker | — | Expense categories |
| POST | `/household/:farmerId/expenses` | farmer, sathi | — | Add/update expense |
| GET | `/household/:farmerId/summary` | farmer, sathi, banker | — | Complete household profile |
| POST | `/scenarios/climate-stress` | farmer, sathi, banker | ClimateStress | Sync JSON |
| POST | `/scenarios/insurance` | farmer, sathi | Insurance | Sync JSON |
| POST | `/scenarios/market-timing` | farmer, sathi | MarketTiming | Sync JSON |
| POST | `/scenarios/banker-portfolio` | banker, admin | BankerPortfolio | Async (queue) |
| GET | `/scenarios/:runUuid` | farmer, sathi, banker | — | Stored result |
| GET | `/scenarios/farmer/:farmerId` | farmer, sathi, banker | — | List of runs |
| POST | `/scenarios/compare` | farmer, sathi, banker | — | Comparison |
| GET | `/scenarios/comparison/:compUuid` | farmer, sathi, banker | — | Stored comparison |
| GET | `/templates` | all | — | Available templates |
| GET | `/templates/:engineType` | all | — | Templates for engine |
| GET | `/benchmarks/:districtId` | all | — | District benchmarks |
| GET | `/portfolio-runs/:runUuid` | banker, admin | — | Portfolio batch status |
| GET | `/portfolio-runs/:runUuid/farmers` | banker, admin | — | Individual farmer results |

### 6.2 API Contract — Pre-Loan Scenario Modeling

**POST /api/v1/drishti/scenarios/pre-loan**

```json
// REQUEST
{
  "farmer_id": 1234,
  "loan_product_id": 5,
  "loan_amount": 200000,
  "loan_tenure_months": 12,
  "repayment_type": "emi",

  "activity": {
    "type": "crop",
    "crop_id": "crop_uuid_paddy",
    "variety_id": "variety_uuid",
    "acreage_hectares": 1.2,
    "season": "kharif",
    "irrigation_type": "rainfed"
  },

  "overrides": {
    "input_cost_factor": 1.0,
    "yield_factor": 1.0,
    "selling_price_override": null,
    "household_monthly_expense": 8000
  },

  "computation_mode": "deterministic",
  "include_insurance_comparison": true
}
```

```json
// RESPONSE
{
  "success": true,
  "data": {
    "run_uuid": "drishti_run_abc123",
    "engine_type": "pre_loan",
    "snapshot_date": "2026-04-12",
    "farmer_summary": {
      "name": "Ramesh Kumar",
      "district": "Varanasi",
      "total_land_hectares": 2.5,
      "trust_score": 72,
      "trust_band": "good",
      "existing_loan_emi": 3500
    },

    "loan_terms": {
      "amount": 200000,
      "interest_rate": 7.0,
      "tenure_months": 12,
      "monthly_emi": 17316,
      "total_repayable": 207792,
      "processing_fee": 2000
    },

    "scenarios": [
      {
        "label": "optimistic",
        "label_key": "drishti.scenario.optimistic",
        "description": "Good monsoon, normal market conditions",
        "assumptions": {
          "rainfall_deviation_pct": 10,
          "yield_factor": 1.15,
          "price_factor": 1.05
        },
        "projections": {
          "total_revenue": 185000,
          "total_cost": 92000,
          "net_farm_income": 93000,
          "total_income_with_other": 108000,
          "emi_burden_monthly": 17316,
          "emi_to_income_ratio": 0.19,
          "breakeven_yield_kg_per_hectare": 2800,
          "projected_yield_kg_per_hectare": 4200,
          "yield_safety_margin_pct": 33.3,
          "health_status": "good",
          "sma_classification": "standard",
          "income_adequacy": "strong"
        },
        "monthly_cashflow": [
          {"month": "2026-06", "inflows": {"crop": 0, "dairy": 12000, "other": 5000}, "outflows": {"inputs": 25000, "emi": 17316, "household": 8000}, "net": -33316, "cumulative": -33316},
          {"month": "2026-07", "inflows": {"crop": 0, "dairy": 12000, "other": 5000}, "outflows": {"inputs": 15000, "emi": 17316, "household": 8000}, "net": -23316, "cumulative": -56632},
          "..."
        ]
      },
      {
        "label": "base",
        "label_key": "drishti.scenario.base",
        "description": "Average conditions based on 5-year district history",
        "assumptions": { "rainfall_deviation_pct": 0, "yield_factor": 1.0, "price_factor": 1.0 },
        "projections": { "..." }
      },
      {
        "label": "stress",
        "label_key": "drishti.scenario.stress",
        "description": "Delayed monsoon, below-average rainfall",
        "assumptions": { "rainfall_deviation_pct": -25, "yield_factor": 0.7, "price_factor": 0.95 },
        "projections": { "..." }
      }
    ],

    "insurance_comparison": {
      "without_insurance": { "worst_case_loss": 45000, "probability_of_loss": 0.28 },
      "with_pmfby": { "premium": 3200, "worst_case_loss": 12000, "probability_of_loss": 0.28, "expected_payout": 33000 }
    },

    "risk_factors": [
      {"factor": "Rainfed cultivation", "impact": "high", "message_key": "drishti.risk.rainfed"},
      {"factor": "Single crop dependency", "impact": "medium", "message_key": "drishti.risk.single_crop"}
    ],

    "recommendations": [
      {"type": "action", "message_key": "drishti.rec.add_insurance", "message": "Consider PMFBY enrollment — it reduces your worst-case loss by ₹33,000"},
      {"type": "info", "message_key": "drishti.rec.breakeven", "message": "You need at least 2,800 kg/hectare to cover loan costs — district average is 3,600 kg/hectare"}
    ]
  }
}
```

### 6.3 API Contract — Household & Activity Portfolio Optimizer

**POST /api/v1/drishti/scenarios/household-portfolio**

```json
// REQUEST
{
  "farmer_id": 1234,

  "proposed_farm_activities": {
    "crops": [
      {"crop_id": "crop_uuid_paddy", "acreage_hectares": 0.8, "season": "kharif", "irrigation": "rainfed"},
      {"crop_id": "crop_uuid_mustard", "acreage_hectares": 0.4, "season": "rabi", "irrigation": "irrigated"}
    ],
    "dairy": {
      "animal_count": 3,
      "breed": "murrah_buffalo",
      "avg_daily_milk_liters": 8,
      "feed_quality": "standard"
    },
    "fishery": {
      "pond_area_hectares": 0.2,
      "species": "rohu",
      "stocking_density": "standard",
      "cycle_months": 8
    }
  },

  "household_income": {
    "use_saved_profile": true,
    "overrides": [
      {"source_type": "spouse_shg", "amount_monthly": 4000, "note": "New SHG micro-enterprise starting"},
      {"source_type": "wage_labor", "amount_monthly": 5000, "active_months": [1,2,3,4,5,11,12]}
    ],
    "additional_sources": [
      {"source_type": "remittance", "earning_member": "son", "amount_monthly": 5000, "reliability": "regular"}
    ]
  },

  "household_expenses": {
    "use_saved_profile": true,
    "overrides": [
      {"category": "education", "amount_monthly": 3000, "note": "Daughter starting college"}
    ]
  },

  "active_loan_ids": [101, 205],
  "time_horizon_months": 12,
  "include_stress_scenarios": true
}
```

```json
// RESPONSE
{
  "success": true,
  "data": {
    "run_uuid": "drishti_run_xyz789",
    "engine_type": "household_portfolio",
    "snapshot_date": "2026-04-12",

    "household_profile": {
      "family_members": 5,
      "earning_members": 3,
      "dependents": 2,
      "farmer": "Ramesh Kumar",
      "spouse": "Sunita Devi",
      "spouse_occupation": "SHG member + Kirana shop"
    },

    "income_summary": {
      "total_projected_annual": 520000,
      "farm_income_annual": 250000,
      "non_farm_income_annual": 270000,
      "farm_income_pct": 48.1,
      "non_farm_income_pct": 51.9,

      "income_streams": [
        {"source": "crop_paddy",      "type": "farm",     "annual": 95000,  "pct": 18.3, "timing": "seasonal",  "months": [10, 11]},
        {"source": "crop_mustard",     "type": "farm",     "annual": 45000,  "pct": 8.7,  "timing": "seasonal",  "months": [3, 4]},
        {"source": "dairy",            "type": "farm",     "annual": 86400,  "pct": 16.6, "timing": "monthly",   "months": "all"},
        {"source": "fishery",          "type": "farm",     "annual": 23600,  "pct": 4.5,  "timing": "cyclical",  "months": [2]},
        {"source": "spouse_shg",       "type": "non_farm", "annual": 48000,  "pct": 9.2,  "timing": "monthly",   "months": "all"},
        {"source": "petty_business",   "type": "non_farm", "annual": 48000,  "pct": 9.2,  "timing": "daily",     "months": "all"},
        {"source": "wage_labor",       "type": "non_farm", "annual": 35000,  "pct": 6.7,  "timing": "seasonal",  "months": [1,2,3,4,5,11,12]},
        {"source": "remittance",       "type": "non_farm", "annual": 60000,  "pct": 11.5, "timing": "monthly",   "months": "all"},
        {"source": "mgnrega",          "type": "non_farm", "annual": 26700,  "pct": 5.1,  "timing": "seasonal",  "months": [4,5,6,10,11]},
        {"source": "govt_transfer",    "type": "non_farm", "annual": 6000,   "pct": 1.2,  "timing": "quarterly", "months": [4,8,12]},
        {"source": "pension",          "type": "non_farm", "annual": 12000,  "pct": 2.3,  "timing": "monthly",   "months": "all"},
        {"source": "rental",           "type": "non_farm", "annual": 12000,  "pct": 2.3,  "timing": "annual",    "months": [4]}
      ],

      "income_diversification_index": 0.86,
      "income_diversification_rating": "well_diversified"
    },

    "expense_summary": {
      "total_annual_household": 187000,
      "total_annual_farm_operations": 155000,
      "total_annual_loan_emi": 72000,
      "grand_total_annual": 414000,

      "expense_breakdown": [
        {"category": "farm_crop_inputs",     "annual": 92000,  "timing": "seasonal"},
        {"category": "farm_dairy_feed",      "annual": 54000,  "timing": "monthly"},
        {"category": "farm_fishery_inputs",  "annual": 9000,   "timing": "cyclical"},
        {"category": "food_groceries",       "annual": 72000,  "timing": "monthly"},
        {"category": "education",            "annual": 36000,  "timing": "monthly + lumpsum"},
        {"category": "healthcare",           "annual": 12000,  "timing": "monthly"},
        {"category": "social_obligations",   "annual": 20000,  "timing": "seasonal"},
        {"category": "utilities",            "annual": 14400,  "timing": "monthly"},
        {"category": "transportation",       "annual": 9600,   "timing": "monthly"},
        {"category": "farm_loan_emi",        "annual": 48000,  "timing": "monthly"},
        {"category": "non_farm_loan_emi",    "annual": 24000,  "timing": "monthly"}
      ]
    },

    "net_household_position": {
      "annual_surplus": 106000,
      "monthly_average_surplus": 8833,
      "surplus_months": 9,
      "deficit_months": 3,
      "max_monthly_deficit": -18000,
      "deficit_period": ["2026-06", "2026-07", "2026-08"],
      "working_capital_gap": 42000
    },

    "monthly_cashflow": [
      {
        "month": "2026-04",
        "inflows": {
          "farm": {"crop": 0, "dairy": 7200, "fishery": 0, "subtotal": 7200},
          "non_farm": {"shg": 4000, "business": 4000, "wage": 5000, "remittance": 5000, "mgnrega": 5340, "pension": 1000, "govt_transfer": 2000, "rental": 12000, "subtotal": 38340},
          "total": 45540
        },
        "outflows": {
          "farm": {"crop_inputs": 0, "dairy_feed": 4500, "fish_feed": 0, "subtotal": 4500},
          "household": {"food": 6000, "education": 2500, "healthcare": 1000, "utilities": 1200, "transport": 800, "subtotal": 11500},
          "loans": {"farm_emi": 4000, "non_farm_emi": 2000, "subtotal": 6000},
          "total": 22000
        },
        "net": 23540,
        "cumulative": 23540,
        "is_negative": false
      },
      "... 11 more months ..."
    ],

    "financial_resilience": {
      "resilience_score": 68,
      "resilience_rating": "moderate",
      "months_survivable_without_farm_income": 4.2,
      "non_farm_covers_household_expenses_pct": 144,
      "non_farm_covers_all_expenses_pct": 65,
      "single_point_of_failure": false,
      "highest_risk_income_loss": "crop_failure",
      "impact_if_crop_fails": {
        "income_loss_annual": 140000,
        "remaining_income": 380000,
        "can_cover_all_expenses": false,
        "shortfall": 34000
      }
    },

    "stress_scenarios": [
      {
        "label": "crop_failure",
        "description": "Complete kharif crop loss due to drought",
        "income_change": -140000,
        "household_can_survive": true,
        "survival_depends_on": ["dairy_income", "spouse_shg", "remittance"],
        "loan_repayment_at_risk": true,
        "projected_health_status": "watch"
      },
      {
        "label": "spouse_income_stops",
        "description": "Spouse SHG + business income stops",
        "income_change": -96000,
        "household_can_survive": true,
        "loan_repayment_at_risk": false,
        "projected_health_status": "good"
      },
      {
        "label": "remittance_stops",
        "description": "Son loses city job, remittances stop",
        "income_change": -60000,
        "household_can_survive": true,
        "loan_repayment_at_risk": false,
        "projected_health_status": "good"
      }
    ],

    "comparison_to_current": {
      "current_total_household_income": 420000,
      "proposed_total_household_income": 520000,
      "income_change_pct": 23.8,
      "current_diversification_index": 0.65,
      "proposed_diversification_index": 0.86,
      "risk_change": "significantly_reduced",
      "key_improvement": "Adding dairy + fishery reduces seasonal income gaps and provides monthly cash flow"
    },

    "recommendations": [
      {"type": "strength", "message_key": "drishti.rec.good_diversification", "message": "Your household has 12 income streams — losing any single one won't be catastrophic"},
      {"type": "warning", "message_key": "drishti.rec.working_capital", "message": "You'll need ₹42,000 working capital for Jun-Aug when crop input costs exceed income"},
      {"type": "action", "message_key": "drishti.rec.increase_shg", "message": "Spouse's SHG micro-enterprise is your most reliable non-farm income — consider scaling it"},
      {"type": "info", "message_key": "drishti.rec.resilience", "message": "Even if crops fail completely, your household can survive 4.2 months on non-farm income alone"}
    ]
  }
}
```

### 6.4 API Contract — Banker Portfolio Simulation

**POST /api/v1/drishti/scenarios/banker-portfolio**

```json
// REQUEST
{
  "scope": {
    "district_id": 45,
    "loan_product_id": null,
    "farmer_ids": null
  },
  "shock_variables": {
    "rainfall_deviation_pct": -25,
    "price_change_pct": -10,
    "temperature_deviation_celsius": 2
  },
  "computation_mode": "monte_carlo",
  "monte_carlo_runs": 500
}
```

```json
// RESPONSE (immediate — job queued)
{
  "success": true,
  "data": {
    "portfolio_run_uuid": "drishti_port_abc456",
    "status": "queued",
    "farmer_count": 487,
    "estimated_completion_seconds": 45,
    "message": "Portfolio simulation queued. You will be notified when complete."
  }
}
```

```json
// GET /portfolio-runs/:runUuid (when completed)
{
  "success": true,
  "data": {
    "portfolio_run_uuid": "drishti_port_abc456",
    "status": "completed",
    "completed_at": "2026-04-12T14:35:22Z",
    "computation_time_ms": 38400,

    "portfolio_summary": {
      "total_farmers": 487,
      "total_outstanding": 48500000,
      "current_npa_count": 12,
      "current_npa_amount": 1450000
    },

    "stress_impact": {
      "projected_npa_count": 38,
      "projected_npa_amount": 4200000,
      "additional_npa_count": 26,
      "additional_npa_amount": 2750000,
      "portfolio_at_risk_pct": 8.66,

      "sma_migration": {
        "good_to_watch": 45,
        "good_to_stressed": 8,
        "watch_to_stressed": 22,
        "watch_to_npa": 6,
        "stressed_to_npa": 20
      },

      "probability_distribution": {
        "npa_count_p10": 28,
        "npa_count_p50": 38,
        "npa_count_p90": 52,
        "npa_amount_p10": 3100000,
        "npa_amount_p50": 4200000,
        "npa_amount_p90": 5800000
      }
    },

    "intervention_list": [
      {"farmer_id": 1234, "name": "Ramesh Kumar", "outstanding": 200000, "projected_status": "stressed", "current_status": "good", "risk_score": 78, "primary_risk": "rainfed_single_crop"},
      "... top 50 farmers by risk ..."
    ]
  }
}
```

---

## 7. Computation Engine Design

### 7.1 Shared Computation Primitives

```
┌─────────────────────────────────────────────────────────────┐
│                  COMPUTATION PRIMITIVES                       │
│                                                               │
│  ┌──────────────────┐    ┌──────────────────┐                │
│  │  YieldEstimator  │    │  CostEstimator   │                │
│  │                  │    │                  │                │
│  │ Input:           │    │ Input:           │                │
│  │  - crop, variety │    │  - crop, acreage │                │
│  │  - district      │    │  - input level   │                │
│  │  - irrigation    │    │  - PoP benchmarks│                │
│  │  - climate adj.  │    │ Output:          │                │
│  │ Output:          │    │  - itemized costs│                │
│  │  - kg/hectare    │    │  - total cost    │                │
│  │  - confidence    │    │  - monthly timing│                │
│  └──────────────────┘    └──────────────────┘                │
│                                                               │
│  ┌──────────────────┐    ┌──────────────────┐                │
│  │ PriceForecaster  │    │  EMICalculator   │                │
│  │                  │    │                  │                │
│  │ Input:           │    │ Input:           │                │
│  │  - commodity     │    │  - principal     │                │
│  │  - PULSE data    │    │  - rate, tenure  │                │
│  │  - price adj.    │    │  - type (emi,    │                │
│  │ Output:          │    │    bullet, flex)  │                │
│  │  - price range   │    │ Output:          │                │
│  │  - month-by-month│    │  - schedule[]    │                │
│  │  - confidence    │    │  - total payable │                │
│  └──────────────────┘    └──────────────────┘                │
│                                                               │
│  ┌──────────────────┐    ┌──────────────────┐                │
│  │CashFlowProjector │    │ RiskClassifier   │                │
│  │                  │    │                  │                │
│  │ Combines all     │    │ Input:           │                │
│  │ primitives into  │    │  - cashflow      │                │
│  │ month-by-month   │    │  - emi/income    │                │
│  │ inflow/outflow   │    │ Output:          │                │
│  │ timeline         │    │  - health_status │                │
│  │                  │    │  - sma_class     │                │
│  │                  │    │  - adequacy      │                │
│  └──────────────────┘    └──────────────────┘                │
│                                                               │
│  ┌──────────────────┐    ┌──────────────────┐                │
│  │MonteCarloRunner  │    │InsuranceModeler  │                │
│  │                  │    │                  │                │
│  │ Wraps any engine │    │ Input:           │                │
│  │ Varies:          │    │  - crop, district│                │
│  │  - yield ±σ      │    │  - sum insured   │                │
│  │  - price ±σ      │    │  - historical    │                │
│  │  - rainfall ±σ   │    │    claim data    │                │
│  │ Runs N times     │    │ Output:          │                │
│  │ Aggregates P10,  │    │  - premium       │                │
│  │  P50, P90        │    │  - payout prob.  │                │
│  └──────────────────┘    └──────────────────┘                │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐    │
│  │          HOUSEHOLD ECONOMICS PRIMITIVES               │    │
│  │                                                       │    │
│  │  ┌────────────────────┐  ┌────────────────────┐      │    │
│  │  │HouseholdIncome-    │  │HouseholdExpense-   │      │    │
│  │  │   Projector        │  │   Projector        │      │    │
│  │  │                    │  │                    │      │    │
│  │  │ Input:             │  │ Input:             │      │    │
│  │  │  - income sources[]│  │  - expense cats[]  │      │    │
│  │  │  - frequency,      │  │  - frequency,      │      │    │
│  │  │    active months,  │  │    peak months,    │      │    │
│  │  │    reliability     │  │    seasonal spikes │      │    │
│  │  │ Output:            │  │ Output:            │      │    │
│  │  │  - month-by-month  │  │  - month-by-month  │      │    │
│  │  │    income timeline │  │    expense timeline│      │    │
│  │  │  - by source & type│  │  - by category     │      │    │
│  │  └────────────────────┘  └────────────────────┘      │    │
│  │                                                       │    │
│  │  ┌────────────────────┐                               │    │
│  │  │Resilience-         │                               │    │
│  │  │   Calculator       │                               │    │
│  │  │                    │                               │    │
│  │  │ Input:             │                               │    │
│  │  │  - total cashflow  │                               │    │
│  │  │  - farm vs non-farm│                               │    │
│  │  │  - loan obligations│                               │    │
│  │  │ Output:            │                               │    │
│  │  │  - resilience score│                               │    │
│  │  │  - months survive  │                               │    │
│  │  │    w/o farm income │                               │    │
│  │  │  - diversification │                               │    │
│  │  │    index           │                               │    │
│  │  │  - failure impact  │                               │    │
│  │  │    analysis        │                               │    │
│  │  └────────────────────┘                               │    │
│  └───────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

### 7.2 YieldEstimator Logic

```javascript
// Pseudocode for yieldEstimator.js

function estimateYield({ cropId, varietyId, districtId, irrigationType, rainfallDeviationPct, temperatureDeviationC }) {

  // Step 1: Base yield from benchmark (district + crop average)
  const benchmark = await getBenchmark(districtId, cropId);
  let baseYield = benchmark.avg_yield_kg_per_hectare;

  // Step 2: Adjust for irrigation type
  if (irrigationType === 'rainfed') {
    // Rainfed crops are more sensitive to rainfall
    baseYield *= 0.85; // rainfed typically 15% lower than irrigated baseline
  }

  // Step 3: Climate adjustment using rainfall elasticity
  // elasticity = -0.5 means 10% less rain → 5% less yield
  const rainfallImpact = rainfallDeviationPct * benchmark.yield_rainfall_elasticity;
  const temperatureImpact = temperatureDeviationC * benchmark.yield_temperature_sensitivity;

  const adjustedYield = baseYield * (1 + rainfallImpact/100 + temperatureImpact/100);

  // Step 4: If farmer has historical data, blend with personal history
  const farmerHistory = snapshot.historical_crop_profitability
    .filter(h => h.crop === cropId);
  if (farmerHistory.length >= 2) {
    const personalAvgYield = avg(farmerHistory.map(h => h.yield_per_hectare));
    // 60% personal history, 40% district benchmark
    return personalAvgYield * 0.6 + adjustedYield * 0.4;
  }

  return adjustedYield;
}
```

### 7.3 Monte Carlo Runner Logic

```javascript
// Pseudocode for monteCarloRunner.js

function runMonteCarlo({ engine, baseInputs, numRuns = 1000 }) {

  // Define variable distributions (normal distribution with historical σ)
  const distributions = {
    yield_factor:    { mean: 1.0, stddev: 0.18 },   // ±18% typical crop yield variance
    price_factor:    { mean: 1.0, stddev: 0.15 },   // ±15% typical price variance
    rainfall_dev:    { mean: 0,   stddev: 20   },    // ±20% rainfall deviation
    cost_factor:     { mean: 1.0, stddev: 0.08 },   // ±8% input cost variance (more stable)
  };

  const results = [];

  for (let i = 0; i < numRuns; i++) {
    const sampledInputs = {
      ...baseInputs,
      overrides: {
        yield_factor: sampleNormal(distributions.yield_factor),
        price_factor: sampleNormal(distributions.price_factor),
        rainfall_deviation_pct: sampleNormal(distributions.rainfall_dev),
        cost_factor: sampleNormal(distributions.cost_factor),
      }
    };

    const result = engine.computeDeterministic(sampledInputs);
    results.push(result);
  }

  // Aggregate
  const incomes = results.map(r => r.net_income).sort((a, b) => a - b);
  return {
    probability_profitable: results.filter(r => r.net_income > 0).length / numRuns,
    probability_sma_stress: results.filter(r => ['stressed','npa'].includes(r.sma_class)).length / numRuns,
    income_p10: percentile(incomes, 10),
    income_p50: percentile(incomes, 50),
    income_p90: percentile(incomes, 90),
    scenario_results: results   // for detailed analysis
  };
}
```

### 7.4 Engine Execution Flow

```
User Request (POST /scenarios/pre-loan)
         │
         ▼
┌──────────────────────┐
│   DrishtiController  │  Validates request, extracts params
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│   DrishtiService     │  Orchestrator
│   (orchestrate)      │
│                      │
│  1. Build Snapshot ──┼──► SnapshotBuilder reads FARMER, ROOTS, DICE,
│                      │    PULSE, SAGE, TRUST, SENTINEL, INSURANCE
│                      │    → Creates/reuses DrishtiFarmerSnapshot
│                      │
│  2. Create Run  ─────┼──► DrishtiScenarioRun (status: computing)
│                      │
│  3. Invoke Engine ───┼──► PreLoanEngine.compute(snapshot, variables)
│                      │    ├── YieldEstimator.estimate(...)
│                      │    ├── CostEstimator.estimate(...)
│                      │    ├── PriceForecaster.forecast(...)
│                      │    ├── EMICalculator.calculate(...)
│                      │    ├── CashFlowProjector.project(...)
│                      │    ├── RiskClassifier.classify(...)
│                      │    └── (if MC) MonteCarloRunner.run(...)
│                      │
│  4. Store Results ───┼──► DrishtiScenarioResult × 3 (optimistic, base, stress)
│                      │
│  5. Format Response ─┼──► ResultFormatter with i18n keys
│                      │
│  6. Update Run ──────┼──► DrishtiScenarioRun (status: completed)
└──────────────────────┘
```

---

## 8. Caching Strategy

### 8.1 Redis Cache Architecture

```
Redis Key Structure:
─────────────────────

drishti:benchmark:{district_id}:{season}:{activity_type}:{crop_id}
  → JSON benchmark profile
  → TTL: 24 hours (refreshed by nightly job)
  → Size: ~500 bytes per key

drishti:pop_cost:{pop_id}
  → JSON array of cost benchmarks for a Package of Practice
  → TTL: 24 hours
  → Size: ~1KB per key

drishti:pulse_forecast:{commodity_id}
  → Latest price forecast from PULSE
  → TTL: 6 hours (refreshed by pulseDailyIngestJob)
  → Size: ~200 bytes per key

drishti:weather:{district_id}
  → Current weather outlook from SAGE
  → TTL: 6 hours (refreshed by imdWeatherFetchJob)
  → Size: ~300 bytes per key

drishti:farmer_snapshot:{farmer_id}
  → Latest snapshot (avoid rebuilding if recent)
  → TTL: 1 hour
  → Size: ~3KB per key

drishti:msp:{commodity_id}:{season}
  → MSP reference prices
  → TTL: 24 hours
  → Size: ~100 bytes per key
```

### 8.2 Cache Warming

A new daily cron job `drishtiBenchmarkRefreshJob` runs after `pulseDailyIngestJob` completes:

1. Aggregates yield, cost, and revenue data per district + crop from ROOTS historical data
2. Pulls latest PULSE forecasts and IMD weather
3. Computes benchmark profiles for active districts
4. Writes to `drishti_benchmark_profiles` table and Redis cache

---

## 9. Queue Design (Banker Portfolio Simulation)

### 9.1 RabbitMQ Integration

```
Exchange: drishti.portfolio
  └── Queue: drishti.portfolio.simulation
       └── Consumer: portfolioSimulationConsumer.js (1-2 workers)

Message format:
{
  "portfolio_run_id": 123,
  "banker_id": 456,
  "farmer_ids": [1001, 1002, ...],
  "shock_variables": { ... },
  "computation_mode": "monte_carlo",
  "monte_carlo_runs": 500
}
```

### 9.2 Portfolio Consumer Execution

```
portfolioSimulationConsumer receives message
         │
         ▼
For each farmer_id in batch (chunked by 50):
  ├── Build snapshot (or read from cache)
  ├── Run ClimateStressEngine with shock_variables
  ├── Store individual DrishtiScenarioRun + DrishtiScenarioResult
  ├── Update DrishtiPortfolioRun.progress_pct
  └── Continue

After all farmers processed:
  ├── Aggregate results across all farmers
  ├── Compute SMA migration matrix
  ├── Identify top-N intervention candidates
  ├── Calculate portfolio VaR
  ├── Update DrishtiPortfolioRun (status: completed, all aggregates)
  └── Send NotificationV2 to banker
```

---

## 10. Error Handling and Resilience

| Failure Mode | Handling Strategy |
|-------------|-------------------|
| Cross-module DB read fails (e.g., ROOTS table unavailable) | Return partial snapshot with `data_gaps` field; engine uses benchmarks as fallback for missing data |
| Redis cache miss for benchmarks | Fall through to MySQL query; populate cache on read |
| Single farmer MC simulation exceeds 10s timeout | Reduce MC runs to 200; return result with `computation_note: "reduced_precision"` |
| Portfolio batch job fails mid-way | Consumer tracks last processed farmer_id; on retry, resumes from checkpoint |
| Invalid input variables (e.g., negative acreage) | Joi validation at controller layer; return 400 with field-level errors |
| PULSE forecast data missing for commodity | Use MSP as floor price, historical average as ceiling; flag in `risk_factors` |
| No historical data for farmer (new farmer) | Use district benchmarks only; set `data_confidence: "benchmark_only"` |

---

## 11. Scale Estimation

### 11.1 Load Projections

| Metric | Year 1 | Year 2 |
|--------|--------|--------|
| Active farmers | 10,000 | 50,000 |
| Scenarios/day (farmer-initiated) | 500 | 3,000 |
| Scenarios/day (sathi-guided) | 200 | 1,500 |
| Portfolio simulations/day (banker) | 5 | 20 |
| Average farmers per portfolio sim | 200 | 500 |
| Peak concurrent simulations | 20 | 50 |

### 11.2 Storage Projections

| Data Type | Size/Record | Records/Year | Annual Storage |
|-----------|-------------|--------------|----------------|
| Scenario runs | ~0.5 KB | 250,000 | ~125 MB |
| Scenario results | ~2 KB | 750,000 (3 per run) | ~1.5 GB |
| Farmer snapshots | ~3 KB | 100,000 | ~300 MB |
| Portfolio runs | ~5 KB | 2,000 | ~10 MB |
| Benchmark profiles | ~0.5 KB | 5,000 | ~2.5 MB |
| Household income sources | ~0.3 KB | 50,000 (5 per farmer) | ~15 MB |
| Household expenses | ~0.2 KB | 80,000 (8 per farmer) | ~16 MB |
| **Total Year 1** | | | **~2 GB** |

### 11.3 Compute Estimation

Single farmer deterministic scenario:
- Snapshot build: ~200ms (5-8 cross-module queries, most cached)
- Engine computation: ~50ms (pure math)
- Result storage: ~100ms (2-3 inserts)
- **Total: ~350ms** (well under 3s target)

Single farmer Monte Carlo (1000 runs):
- Snapshot build: ~200ms
- MC computation: ~5s (1000 × 5ms per deterministic run)
- Aggregation: ~100ms
- **Total: ~5.3s** (under 10s target)

Portfolio (500 farmers, MC 500 runs each):
- Per farmer: ~3s (with cached snapshots)
- Parallelized chunks of 50: ~30s total
- Aggregation: ~2s
- **Total: ~32s** (under 60s target)

---

## 12. Monitoring and Alerting

### 12.1 Key Metrics

| Metric | Alert Threshold |
|--------|----------------|
| `drishti.scenario.latency_p99` | > 5s for single farmer |
| `drishti.portfolio.latency_p99` | > 90s for batch |
| `drishti.scenario.error_rate` | > 5% |
| `drishti.snapshot.cache_hit_ratio` | < 60% |
| `drishti.benchmark.freshness_hours` | > 36 hours |
| `drishti.queue.depth` | > 10 pending jobs |
| `drishti.queue.consumer.idle` | > 5 min with pending jobs |

### 12.2 Audit Integration

All scenario runs logged via existing `auditService.js`:
- Entity type: `drishti_scenario_run`
- Action: `create`
- Sensitivity level: 2 (contains financial projections but no PII)
- Changed fields: input_variables, engine_type
- User context: farmer_id, initiator_id, initiator_role

---

## 13. Migration Plan — Sequencing

### Phase 1 (Weeks 1-4): Foundation + Pre-Loan Engine

| Week | Deliverables |
|------|-------------|
| 1 | Database migrations for all 7 DRISHTI tables. Module skeleton: routes, controller, service stubs, models, validators. |
| 2 | `SnapshotBuilder` service (reads from all cross-module tables). `BenchmarkService` + nightly cron job. Redis cache setup. |
| 3 | Computation primitives: `YieldEstimator`, `CostEstimator`, `PriceForecaster`, `EMICalculator`, `CashFlowProjector`, `RiskClassifier`. |
| 4 | `PreLoanEngine` complete. API endpoints: POST pre-loan, GET scenario by ID. Integration tests. Farmer app screen (basic). |

### Phase 2 (Weeks 5-9): Household Economics + Portfolio Optimizer + Insurance Engine

| Week | Deliverables |
|------|-------------|
| 5 | Household data layer: `drishti_household_income_sources` + `drishti_household_expenses` tables. `HouseholdService` CRUD. Household income/expense API endpoints. Sathi data collection screens. |
| 6 | `HouseholdIncomeProjector` + `HouseholdExpenseProjector` primitives. Month-by-month household cash flow projection with seasonal and irregular income handling. |
| 7 | `HouseholdPortfolioEngine` — combined farm + household economics. `ResilienceCalculator` — survival scoring, diversification index, single-point-of-failure analysis. Farmer app household income entry screens. |
| 8 | `InsuranceEngine` + `InsuranceModeler` primitive. Stress scenario generation (crop failure, spouse income loss, remittance stops). |
| 9 | Scenario comparison API and UI. Sathi dashboard — guided household scenario builder with income/expense collection flow. Integration testing, Bhashini translation keys, seed scenario templates. |

### Phase 3 (Weeks 10-13): Climate Stress + Market Timing + Monte Carlo

| Week | Deliverables |
|------|-------------|
| 10 | `ClimateStressEngine` with SAGE/IMD integration. Household impact cascading (climate → dairy feed costs → household deficit). |
| 11 | `MonteCarloRunner` primitive. MC mode for Pre-Loan, Climate, and Household Portfolio engines. |
| 12 | `MarketTimingEngine` extending PULSE sell-or-store. Post-harvest topup loan simulation. |
| 13 | Farmer app screens for climate and market. End-to-end testing across all household scenarios. |

### Phase 4 (Weeks 14-17): Banker Portfolio Simulation + Polish

| Week | Deliverables |
|------|-------------|
| 14 | `BankerPortfolioEngine`. RabbitMQ consumer. Portfolio runs table. Household income adequacy feeds into banker view. |
| 15 | Banker dashboard — portfolio stress testing UI. SMA migration visualizations. Household resilience scores visible in banker loan review. |
| 16 | Intervention list UI. Notification integration. Performance tuning. |
| 17 | Load testing. Documentation. Production deployment. |

---

## 14. Trade-Off Analysis

| Decision | Chosen | Alternative | Why |
|----------|--------|-------------|-----|
| Snapshot pattern | Frozen copy at run time | Live queries during computation | Deterministic results, auditability, no coupling to source table locks |
| JSON for detailed results | Flexible schema in JSON columns | Normalized tables for every output field | Engine outputs will evolve; JSON avoids migration churn. Summary fields extracted as columns for querying. |
| Node.js for MC simulation | Run in same Express process | Separate Python/R service for MC | No new infra dependency; 1000 iterations × 5ms = 5s is acceptable. Revisit if MC needs grow beyond 5000 runs. |
| Redis for benchmarks | In-memory cache, nightly refresh | Compute on-the-fly from ROOTS data | Benchmarks aggregate thousands of rows; real-time aggregation would add 2-3s per scenario |
| RabbitMQ for portfolio batch | Async queue, existing infra | Synchronous with streaming response | Portfolio sims can take 30-60s; async is better UX and avoids HTTP timeout issues |
| 3 scenario labels (optimistic/base/stress) | Fixed labels per engine | User-defined unlimited scenarios | Simplicity for V1; farmers need clear framing, not infinite choice. Expand in V2. |
| Benchmark as fallback | Use when farmer has no history | Require farmer history for all scenarios | New farmers (Phase 1) have no ROOTS history; benchmarks make DRISHTI usable from day 1 |
| Household data as own tables | `drishti_household_income_sources` + `drishti_household_expenses` | Add fields to `farmer_profiles` table | Household economic data is DRISHTI-specific, not core to onboarding. Avoids bloating FARMER module. Sathi collects during guided scenario sessions, not during basic onboarding. |
| Household income as self-declared | Accept farmer/Sathi-declared income | Require bank statement verification for all income | Most non-farm income (SHG, wage labor, MGNREGA) is cash-based and unverifiable via documents. Self-declared with Sathi verification is realistic. Confidence levels track data quality. |
| Resilience scoring | Custom formula based on diversification + survival months | Use established poverty/vulnerability indexes | Existing indexes (PPI, MPI) are household surveys, not actionable for loan decisions. Custom score directly maps to "can this farmer repay if crops fail?" — which is what the banker needs. |

---

## 15. What to Revisit as the System Grows

**When farmer count exceeds 100K:** Consider read replicas for snapshot queries. The snapshot build does 5-8 SELECT queries across modules — at scale, these should hit read replicas, not the primary MySQL.

**When MC needs exceed 5000 runs:** Move Monte Carlo computation to a worker pool (Node.js worker threads or a dedicated compute service). The single-threaded Node.js event loop will bottleneck at ~5000 iterations for complex engines.

**When benchmark granularity needs to increase:** Current benchmarks are district + crop + season. Future: block-level, soil-type-adjusted, variety-specific. This requires more ROOTS data density and more Redis cache keys.

**When scenario templates proliferate:** V1 has system-defined templates. V2 should allow banker-created and Sathi-created templates (e.g., "standard kharif paddy assessment for Varanasi district") with template sharing and versioning.

**When AI/ML models are ready:** Replace rule-based `YieldEstimator` with ML-trained yield prediction models once enough historical data (3+ seasons across 10K+ farmers) is available. The engine interface stays the same — only the estimator implementation changes.

**When real-time sensor data is available:** If IoT sensors (soil moisture, weather stations) become part of the platform, SAGE data feeds into DRISHTI become real-time instead of daily. The snapshot pattern handles this gracefully — just refresh snapshots more frequently.

**When household data matures:** V1 relies on Sathi-collected self-declared household income. As the platform grows, consider: (a) UPI transaction analysis (with farmer consent) to verify income flows, (b) SHG linkage via NABARD/NRLM APIs for verified SHG membership and savings data, (c) MGNREGA API integration for verified employment days, (d) PM-KISAN DBT verification for government transfer confirmation. Each of these reduces reliance on self-declaration and increases DRISHTI's credibility for banking decisions.

**When household data becomes a platform asset:** The household income/expense data collected by DRISHTI is arguably the most valuable dataset in Indian rural fintech — no one else has structured, verified household-level income data for farming families. Consider exposing anonymized, aggregated household economics as a data product for NBFCs, insurance companies, and government agencies (with proper consent and anonymization).

---

## Appendix A: Scenario Template Examples (Seed Data)

```json
[
  {
    "engine_type": "pre_loan",
    "template_name": "Kharif Crop Loan Assessment",
    "default_variables": {
      "season": "kharif",
      "loan_tenure_months": 12,
      "repayment_type": "bullet",
      "household_monthly_expense": 8000
    },
    "variable_ranges": {
      "loan_amount": {"min": 25000, "max": 1500000, "step": 5000},
      "acreage_hectares": {"min": 0.1, "max": 20, "step": 0.1},
      "input_cost_factor": {"min": 0.5, "max": 1.5, "step": 0.1},
      "yield_factor": {"min": 0.3, "max": 1.5, "step": 0.05},
      "household_monthly_expense": {"min": 3000, "max": 30000, "step": 1000}
    },
    "activity_types": ["crop"]
  },
  {
    "engine_type": "household_portfolio",
    "template_name": "Household Economy & Farm Portfolio Planning",
    "default_variables": {
      "time_horizon_months": 12,
      "use_saved_household_profile": true,
      "include_stress_scenarios": true
    },
    "variable_ranges": {
      "crop_acreage": {"min": 0, "max": 20, "step": 0.1},
      "dairy_animal_count": {"min": 0, "max": 20, "step": 1},
      "fishery_pond_hectares": {"min": 0, "max": 5, "step": 0.1},
      "spouse_shg_monthly": {"min": 0, "max": 15000, "step": 500},
      "wage_labor_monthly": {"min": 0, "max": 20000, "step": 500},
      "remittance_monthly": {"min": 0, "max": 30000, "step": 1000},
      "food_groceries_monthly": {"min": 2000, "max": 20000, "step": 500},
      "education_monthly": {"min": 0, "max": 15000, "step": 500}
    },
    "activity_types": ["crop", "dairy", "fishery", "household"]
  },
  {
    "engine_type": "climate_stress",
    "template_name": "Monsoon Failure Scenario",
    "default_variables": {
      "rainfall_deviation_pct": -30,
      "temperature_deviation_celsius": 1.5
    },
    "variable_ranges": {
      "rainfall_deviation_pct": {"min": -50, "max": 50, "step": 5},
      "temperature_deviation_celsius": {"min": -3, "max": 5, "step": 0.5}
    },
    "activity_types": ["crop", "dairy", "fishery"]
  },
  {
    "engine_type": "banker_portfolio",
    "template_name": "District Drought Stress Test",
    "default_variables": {
      "rainfall_deviation_pct": -25,
      "price_change_pct": -10,
      "computation_mode": "monte_carlo",
      "monte_carlo_runs": 500
    },
    "variable_ranges": {
      "rainfall_deviation_pct": {"min": -50, "max": 0, "step": 5},
      "price_change_pct": {"min": -30, "max": 0, "step": 5}
    },
    "activity_types": ["crop", "dairy", "fishery"]
  }
]
```

---

## Appendix B: Integration Points with Existing Cron Jobs

| Existing Job | DRISHTI Integration |
|-------------|---------------------|
| `pulseDailyIngestJob` | After completion, triggers cache refresh for `drishti:pulse_forecast:*` keys |
| `imdWeatherFetchJob` | After completion, triggers cache refresh for `drishti:weather:*` keys |
| `bankNpaRecalcJob` | After completion, DRISHTI snapshots include fresh health/SMA data |
| `pulseSentinelScanJob` | Feeds into SENTINEL data that DRISHTI reads for risk classification |
| **NEW: `drishtiBenchmarkRefreshJob`** | Runs daily at 04:00 AM after PULSE and IMD jobs; computes/refreshes district benchmarks |

---

## 16. Frontend Integration Strategy

### 16.1 Design Philosophy: Hybrid Approach

DRISHTI uses a **hybrid integration** — a dedicated DRISHTI section in each interface for full scenario planning, **plus** embedded scenario widgets inside existing module flows where decisions naturally happen. This gives both discoverability (farmer knows DRISHTI exists) and contextual relevance (scenarios appear right when needed).

**Engine Access by Role:**

| Engine | Farmer App | Farmer Web | Sathi Dashboard | Banker Dashboard |
|--------|-----------|------------|-----------------|------------------|
| Pre-Loan Scenario | ✅ | ✅ | ✅ | ✅ (read-only review) |
| Household & Portfolio | ✅ | ✅ | ✅ (primary user) | ❌ |
| Climate Stress | ❌ | ❌ | ✅ | ✅ |
| Insurance Decision | ✅ | ✅ | ✅ | ❌ |
| Market Timing | ✅ | ✅ | ✅ | ❌ |
| Banker Portfolio Sim | ❌ | ❌ | ❌ | ✅ |

---

### 16.2 Farmer Mobile App (React Native / Expo 54)

#### Navigation Change: New 5th Bottom Tab

```
Current tabs:   [Home]  [Farm]  [Money]  [Loans]
New tabs:       [Home]  [Farm]  [Drishti]  [Money]  [Loans]
                                  ↑ NEW (icon: eye / दृष्टि)
```

The DRISHTI tab sits at center position — the most natural thumb reach on mobile. Icon: a stylized eye (दृष्टि) or a crystal ball silhouette.

#### New Screens (add to farmer-app/app/)

```
farmer-app/app/
├── (tabs)/
│   ├── home.tsx                    # Existing
│   ├── farm.tsx                    # Existing
│   ├── drishti.tsx                 # NEW — DRISHTI home / scenario list
│   ├── money.tsx                   # Existing
│   └── loans.tsx                   # Existing
│
├── drishti/                        # NEW — DRISHTI screens (8 screens)
│   ├── index.tsx                   # Scenario dashboard — cards for each engine
│   ├── pre-loan.tsx                # Pre-Loan Scenario builder
│   ├── pre-loan-result.tsx         # Pre-Loan results with 3-scenario comparison
│   ├── household-portfolio.tsx     # Household + Activity Portfolio builder
│   ├── household-portfolio-result.tsx  # Portfolio results with cash flow chart
│   ├── household-income.tsx        # Household income entry/edit (SHG, wage, etc.)
│   ├── household-expenses.tsx      # Household expense entry/edit
│   ├── insurance-compare.tsx       # Insurance decision — with vs without
│   ├── market-timing.tsx           # Sell now vs store simulation
│   ├── market-timing-result.tsx    # Market timing results
│   ├── scenario-history.tsx        # Past scenario runs list
│   └── scenario-detail.tsx         # Detailed view of any past scenario
```

#### Screen-by-Screen Design

**drishti/index.tsx — DRISHTI Home**

```
┌─────────────────────────────────────┐
│  दृष्टि — Your Farm's Future       │
│  See what happens before you decide │
├─────────────────────────────────────┤
│                                     │
│  ┌─────────────────────────────┐    │
│  │ 🌾 Should I Take This Loan? │    │
│  │ See if a loan makes sense   │    │
│  │ for your next crop season   │    │
│  │                    [Start →]│    │
│  └─────────────────────────────┘    │
│                                     │
│  ┌─────────────────────────────┐    │
│  │ 🏠 My Household Plan        │    │
│  │ Plan your farm + family     │    │
│  │ income for the whole year   │    │
│  │                    [Start →]│    │
│  └─────────────────────────────┘    │
│                                     │
│  ┌─────────────────────────────┐    │
│  │ 🛡️ Is Insurance Worth It?   │    │
│  │ Compare your risk with      │    │
│  │ and without coverage        │    │
│  │                    [Start →]│    │
│  └─────────────────────────────┘    │
│                                     │
│  ┌─────────────────────────────┐    │
│  │ 📊 Sell Now or Store?       │    │
│  │ Find the best time to       │    │
│  │ sell your harvest           │    │
│  │                    [Start →]│    │
│  └─────────────────────────────┘    │
│                                     │
│  ── Recent Scenarios ──             │
│  ┌──────────────────────┐           │
│  │ Paddy Loan ₹2L  ✅   │ Apr 10   │
│  │ Household Plan   ✅   │ Apr 8    │
│  └──────────────────────┘           │
│                                     │
└─────────────────────────────────────┘
│ [Home] [Farm] [*Drishti*] [Money] [Loans] │
```

**drishti/pre-loan.tsx — Pre-Loan Scenario Builder**

```
┌─────────────────────────────────────┐
│  ← Should I Take This Loan?        │
├─────────────────────────────────────┤
│                                     │
│  What do you want to grow?          │
│  ┌─────────────────────────────┐    │
│  │ [🌾 Paddy] [Wheat] [Mustard]│    │
│  │ [Vegetable] [Sugarcane]     │    │
│  └─────────────────────────────┘    │
│                                     │
│  How many acres?                    │
│  ◄━━━━━━━━●━━━━━━━━━━━━━━━━━► 3.0  │
│  (Your total land: 5 acres)         │
│                                     │
│  Loan amount?                       │
│  ◄━━━━━━━━━━━━●━━━━━━━━━━━━━► ₹2L  │
│  (Eligible: ₹25K – ₹5L)            │
│                                     │
│  Season                             │
│  [● Kharif] [○ Rabi] [○ Summer]    │
│                                     │
│  Irrigation                         │
│  [● Rainfed] [○ Irrigated]         │
│                                     │
│  ── Your Household ──               │
│  Monthly non-farm income:  ₹22,500  │
│  Monthly expenses:         ₹13,500  │
│  [Edit household details →]         │
│                                     │
│         [See My Future →]           │
│                                     │
└─────────────────────────────────────┘
```

**drishti/pre-loan-result.tsx — Results Screen**

```
┌─────────────────────────────────────┐
│  ← Paddy Loan — ₹2L Kharif         │
├─────────────────────────────────────┤
│                                     │
│  ┌──────┐  ┌──────┐  ┌──────┐      │
│  │ Good │  │ Avg  │  │ Poor │      │
│  │Season│  │Season│  │Season│      │
│  │ 😊   │  │ 😐   │  │ 😟   │      │
│  │+₹93K │  │+₹51K │  │-₹12K │      │
│  └──────┘  └──────┘  └──────┘      │
│  [● Good]  [○ Avg ]  [○ Poor]      │
│                                     │
│  ── Good Season Details ──          │
│                                     │
│  Expected Revenue       ₹1,85,000  │
│  Crop Costs            -₹92,000    │
│  ─────────────────────────────────  │
│  Farm Profit            ₹93,000    │
│  + Other Income         ₹2,70,000  │
│  - Household Expenses  -₹1,87,000  │
│  - Loan EMI            -₹17,316/mo │
│  ─────────────────────────────────  │
│  Net Surplus            ₹1,06,000  │
│                                     │
│  EMI is 16% of your total income    │
│  ✅ Loan is manageable              │
│                                     │
│  ── Cash Flow Chart ──              │
│  [Monthly bar chart showing         │
│   green/red bars for surplus/       │
│   deficit months]                   │
│                                     │
│  ⚠️ Jun-Aug: You'll need ₹42K      │
│  working capital for input costs    │
│                                     │
│  ── Should You Get Insurance? ──    │
│  Without: worst case -₹45K loss    │
│  With PMFBY: ₹3,200 premium,      │
│  worst case reduced to -₹12K      │
│  [Compare Insurance →]              │
│                                     │
│  [Apply for Loan →] [Save & Share]  │
│                                     │
└─────────────────────────────────────┘
```

**drishti/household-income.tsx — Household Income Entry**

This is the data collection screen where farmers (or Sathis) enter non-farm income.

```
┌─────────────────────────────────────┐
│  ← My Household Income              │
├─────────────────────────────────────┤
│                                     │
│  Who earns in your family?          │
│                                     │
│  ┌─ 👩 Wife — Sunita Devi ────────┐│
│  │  SHG: Jai Bhavani Group        ││
│  │  Monthly: ₹3,500               ││
│  │  Kirana Shop: ₹4,000/mo        ││
│  │  ✅ Verified by Sathi  [Edit]  ││
│  └─────────────────────────────────┘│
│                                     │
│  ┌─ 👨 You — Ramesh Kumar ────────┐│
│  │  Wage labor: ₹6,000/mo         ││
│  │  (Nov-May only, no farm work)   ││
│  │  MGNREGA: 80 days × ₹333       ││
│  │                        [Edit]   ││
│  └─────────────────────────────────┘│
│                                     │
│  ┌─ 👦 Son — Vikram ──────────────┐│
│  │  Remittance from Pune           ││
│  │  Monthly: ₹5,000               ││
│  │                        [Edit]   ││
│  └─────────────────────────────────┘│
│                                     │
│  ┌─ 👴 Father ────────────────────┐│
│  │  Old Age Pension: ₹1,000/mo    ││
│  │                        [Edit]   ││
│  └─────────────────────────────────┘│
│                                     │
│  Government Transfers               │
│  PM-KISAN: ₹6,000/year ✅          │
│  Rental: ₹12,000/year              │
│                                     │
│  ─────────────────────────────────  │
│  Total Non-Farm: ₹22,500/month     │
│  (₹2,70,000/year)                  │
│                                     │
│  [+ Add Income Source]              │
│                                     │
└─────────────────────────────────────┘
```

---

### 16.3 Farmer Web Dashboard (Next.js 16 — dashboard-farmer/)

Add a DRISHTI section to the existing farmer web portal:

```
dashboard-farmer/src/app/
├── dashboard/                    # Existing home
├── drishti/                      # NEW
│   ├── page.tsx                  # DRISHTI home — same layout as mobile
│   ├── pre-loan/
│   │   └── page.tsx              # Pre-loan scenario builder + results
│   ├── household-portfolio/
│   │   └── page.tsx              # Household portfolio builder + results
│   ├── household/
│   │   └── page.tsx              # Income/expense management
│   ├── insurance/
│   │   └── page.tsx              # Insurance comparison
│   ├── market-timing/
│   │   └── page.tsx              # Sell vs store
│   └── history/
│       └── page.tsx              # All past scenario runs
└── login/                        # Existing
```

Add sidebar navigation item: "दृष्टि — Foresight" with an eye icon, placed between Farm and Money sections.

---

### 16.4 Sathi Dashboard (Next.js 16 — dashboard-sathi/)

The Sathi is the **power user** of DRISHTI — they run scenarios with farmers during field visits. Their interface emphasizes guided flows and data collection.

```
dashboard-sathi/src/app/
├── dashboard/                    # Existing — add DRISHTI summary widget
├── drishti/                      # NEW
│   ├── page.tsx                  # DRISHTI home — farmer search + recent runs
│   ├── farmer/[farmerId]/
│   │   ├── page.tsx              # Farmer DRISHTI profile — snapshot + history
│   │   ├── household/
│   │   │   └── page.tsx          # Collect/edit household income + expenses
│   │   ├── pre-loan/
│   │   │   └── page.tsx          # Guided pre-loan scenario
│   │   ├── household-portfolio/
│   │   │   └── page.tsx          # Guided portfolio planning
│   │   ├── climate-stress/
│   │   │   └── page.tsx          # Climate stress testing
│   │   ├── insurance/
│   │   │   └── page.tsx          # Insurance comparison
│   │   └── market-timing/
│   │       └── page.tsx          # Sell vs store
│   └── reports/
│       └── page.tsx              # Aggregate scenario stats across visits
└── tasks/                        # Existing
```

**Sathi DRISHTI Home — Key Difference from Farmer**

The Sathi sees a farmer-search-first interface, not engine cards:

```
┌──────────────────────────────────────────────────────────────────┐
│  दृष्टि — Farmer Foresight Planning                              │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Search Farmer: [🔍 Name, phone, or ID____________]             │
│                                                                  │
│  ── Today's Field Visits ──                                      │
│  ┌──────────────────────────────────────────────────────┐        │
│  │ Ramesh Kumar — Varanasi     [Run Scenario →]          │        │
│  │ Last DRISHTI: 12 days ago | Household profile: ✅     │        │
│  ├──────────────────────────────────────────────────────┤        │
│  │ Sunita Devi — Jaunpur       [Run Scenario →]          │        │
│  │ Last DRISHTI: Never | Household profile: ❌ Needed    │        │
│  ├──────────────────────────────────────────────────────┤        │
│  │ Mohan Yadav — Ghazipur      [Run Scenario →]          │        │
│  │ Last DRISHTI: 3 days ago | Loan app pending           │        │
│  └──────────────────────────────────────────────────────┘        │
│                                                                  │
│  ── Household Data Collection Progress ──                        │
│  Farmers with complete profiles: 47/120 (39%)                    │
│  ████████░░░░░░░░░░░░░                                          │
│  Farmers needing updates (>30 days): 15                          │
│                                                                  │
│  ── Recent Scenario Runs ──                                      │
│  Ramesh Kumar — Pre-Loan ₹2L Paddy — Apr 10                    │
│  Mohan Yadav — Household Plan — Apr 9                           │
│  Vikram Singh — Insurance Compare — Apr 8                       │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

**Sathi Household Data Collection Flow**

When the Sathi taps "Household profile: ❌ Needed", they get a guided wizard:

```
Step 1/4: Family Members
  → Who lives in the household? (name, relation, age, occupation)

Step 2/4: Income Sources
  → For each earning member, add income sources
  → SHG details if spouse is a member
  → Quick presets: "MGNREGA", "PM-KISAN", "Pension"

Step 3/4: Monthly Expenses
  → Category-wise with smart defaults for the district
  → "Average family of 5 in Varanasi spends ₹6,500 on food"

Step 4/4: Review & Verify
  → Summary card with confidence levels
  → Sathi marks what they verified vs farmer-declared
  → [Save & Run First Scenario →]
```

---

### 16.5 Banker Dashboard (Next.js 16 — dashboard/)

The banker sees DRISHTI primarily through two lenses: individual loan risk assessment and portfolio stress testing.

```
dashboard/src/app/
├── dashboard/                    # Existing — add portfolio risk widget
├── drishti/                      # NEW
│   ├── page.tsx                  # DRISHTI home — portfolio overview
│   ├── portfolio-stress/
│   │   ├── page.tsx              # Portfolio stress testing builder
│   │   └── [runId]/
│   │       └── page.tsx          # Portfolio stress test results
│   ├── climate-stress/
│   │   └── page.tsx              # District-level climate scenario
│   └── farmer/[farmerId]/
│       └── page.tsx              # Individual farmer scenario history
├── farmer/                       # Existing
│   ├── [farmerId]/
│   │   ├── page.tsx              # Existing farmer detail
│   │   └── loan-application/
│   │       └── [appId]/
│   │           └── page.tsx      # Existing — EMBED DRISHTI widget here
└── login/                        # Existing
```

**Banker DRISHTI Home — Portfolio Focus**

```
┌──────────────────────────────────────────────────────────────────┐
│  दृष्टि — Portfolio Risk Intelligence                            │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ── Portfolio Health Summary ──                                  │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────┐    │
│  │ 487 Loans  │  │ 12 NPA     │  │ ₹4.85 Cr   │  │ 2.5%   │    │
│  │   Active   │  │  (2.5%)    │  │Outstanding │  │ At Risk │    │
│  └────────────┘  └────────────┘  └────────────┘  └────────┘    │
│                                                                  │
│  ── Run Portfolio Stress Test ──                                 │
│  ┌──────────────────────────────────────────────────────┐        │
│  │ What if monsoon is 25% below normal?                  │        │
│  │                                                       │        │
│  │ District: [Varanasi ▼]                                │        │
│  │ Rainfall:  ◄━━━━●━━━━━━━━━━━━━━━━━━━━━► -25%         │        │
│  │ Prices:    ◄━━━━━━━━●━━━━━━━━━━━━━━━━━► -10%         │        │
│  │                                                       │        │
│  │ Mode: [● Quick estimate] [○ Monte Carlo (500 runs)]   │        │
│  │                                                       │        │
│  │              [Run Stress Test →]                       │        │
│  └──────────────────────────────────────────────────────┘        │
│                                                                  │
│  ── Recent Stress Tests ──                                       │
│  ┌──────────────────────────────────────────────────────┐        │
│  │ Varanasi Drought -25% — Apr 10                        │        │
│  │ Result: +26 NPAs projected (₹27.5L additional risk)  │        │
│  │ 38 farmers need intervention       [View Details →]   │        │
│  └──────────────────────────────────────────────────────┘        │
│                                                                  │
│  ── Loan Applications with DRISHTI Attached ──                   │
│  ┌──────────────────────────────────────────────────────┐        │
│  │ Ramesh Kumar — ₹2L Paddy — DRISHTI: ✅ Low Risk      │        │
│  │ Sunita Devi — ₹1.5L Dairy — DRISHTI: ⚠️ Moderate     │        │
│  │ Mohan Yadav — ₹3L Vegetable — DRISHTI: ❌ High Risk  │        │
│  └──────────────────────────────────────────────────────┘        │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

---

### 16.6 Embedded Widgets (Inside Existing Module Flows)

These are lightweight DRISHTI components that appear inside other modules without requiring the user to navigate away.

#### Widget 1: Pre-Loan Risk Card (inside DICE Loan Application)

**Where:** Banker dashboard → Farmer → Loan Application detail page
**When:** Automatically generated when a farmer submits a loan application with a DRISHTI scenario attached, or banker clicks "Run Risk Simulation"

```
┌─ DRISHTI Risk Assessment ──────────────────────────────────────┐
│                                                                 │
│  Scenario: ₹2L Paddy Kharif — Rainfed — 3 acres               │
│                                                                 │
│  Good Season    ███████████████████████████  ₹93K profit        │
│  Average        ████████████████            ₹51K profit         │
│  Stress         ████                       -₹12K loss           │
│                                                                 │
│  EMI/Income: 16%  │  Breakeven Yield: 2,800 kg  │  Trust: Good │
│                                                                 │
│  Household resilience: Can survive 4.2 months without farm      │
│  income. Non-farm income covers 65% of all expenses.            │
│                                                                 │
│  [View Full Scenario →]                                         │
└─────────────────────────────────────────────────────────────────┘
```

#### Widget 2: Sell-or-Store Nudge (inside PULSE Market Screen)

**Where:** Farmer app → Money tab → Market prices for a commodity the farmer has harvested
**When:** After harvest record is logged in ROOTS and PULSE has price forecasts

```
┌─ दृष्टि — Should You Sell Today? ─────────────────────────────┐
│                                                                 │
│  Your 15 quintals of wheat @ ₹2,150/qt today                  │
│                                                                 │
│  Sell now:    ₹32,250                                          │
│  Store 60d:  ₹34,500 – ₹38,000 (70% probability)              │
│              minus ₹1,800 storage cost                          │
│              Net gain: ₹450 – ₹3,950                           │
│                                                                 │
│  [Run Full Simulation →]                                        │
└─────────────────────────────────────────────────────────────────┘
```

#### Widget 3: Insurance Nudge (inside DICE Loan Application — Farmer)

**Where:** Farmer app → Loans → During loan application flow, after crop selection
**When:** When farmer is applying for a crop loan and hasn't enrolled in insurance

```
┌─ दृष्टि — Protect Your Investment ────────────────────────────┐
│                                                                 │
│  ₹2L loan on rainfed paddy without insurance:                  │
│  28% chance of loss if monsoon is poor                         │
│                                                                 │
│  With PMFBY (₹3,200 premium):                                 │
│  Worst case reduced from -₹45K to -₹12K                       │
│                                                                 │
│  [See Full Comparison →]  [Add Insurance to Application]        │
└─────────────────────────────────────────────────────────────────┘
```

#### Widget 4: Household Health Summary (inside Sathi Task Verification)

**Where:** Sathi dashboard → Task completion for a farmer
**When:** When Sathi finishes a field visit/verification task

```
┌─ दृष्टि — Farmer Financial Snapshot ──────────────────────────┐
│                                                                 │
│  Ramesh Kumar — Varanasi                                       │
│  Farm Income: 48% │ Non-Farm: 52% │ Resilience: Moderate (68)  │
│                                                                 │
│  Income Streams: 12 │ Earning Members: 3/5                     │
│  Household data last updated: 12 days ago                      │
│                                                                 │
│  [Update Household Data] [Run New Scenario →]                   │
└─────────────────────────────────────────────────────────────────┘
```

#### Widget 5: DRISHTI Score on Banker Loan Inbox

**Where:** Banker dashboard → Loan inbox list view
**When:** Always visible for loan applications that have DRISHTI scenarios attached

```
Current loan inbox row:
│ Ramesh Kumar │ ₹2L │ Paddy │ Submitted │ Trust: Good │ [Review] │

New loan inbox row with DRISHTI:
│ Ramesh Kumar │ ₹2L │ Paddy │ Submitted │ Trust: Good │ DRISHTI: ✅ │ [Review] │
                                                          ↑
                                           Green = all 3 scenarios viable
                                           Yellow = stress scenario has risk
                                           Red = base scenario already risky
```

---

### 16.7 Shared Component Library

Build a shared set of DRISHTI UI components used across all 4 frontends:

```
shared/components/drishti/ (or per-app equivalent)
├── DrishtiScenarioCard.tsx          # Engine selection cards on home screen
├── DrishtiSlider.tsx                # Styled range slider for variable inputs
├── DrishtiCashFlowChart.tsx         # Monthly bar chart (green surplus / red deficit)
├── DrishtiScenarioCompare.tsx       # Side-by-side 3-scenario cards
├── DrishtiIncomeBreakdown.tsx       # Donut chart — farm vs non-farm income split
├── DrishtiIncomeTimeline.tsx        # Stacked area chart — monthly income by source
├── DrishtiResilienceGauge.tsx       # Circular gauge — financial resilience score
├── DrishtiRiskBadge.tsx             # Green/yellow/red badge for loan inbox
├── DrishtiHouseholdSummary.tsx      # Compact household income/expense card
├── DrishtiSMAMigrationChart.tsx     # Sankey or waterfall — SMA migration (banker)
├── DrishtiPortfolioHeatmap.tsx      # District heatmap — portfolio risk (banker)
└── DrishtiResultHeader.tsx          # Scenario result header with emoji + net amount
```

**Charting stack:** All charts use Recharts (already in your stack) for web dashboards. For React Native, use `react-native-chart-kit` or `victory-native` for the mobile cash flow chart.

---

### 16.8 Deep Link Architecture

Existing modules link into DRISHTI with pre-filled context using URL parameters / navigation params:

| Source Screen | Deep Link Target | Pre-filled Context |
|--------------|------------------|-------------------|
| DICE loan application form (farmer) | `/drishti/pre-loan?productId=5&amount=200000&crop=paddy` | Loan product, amount, crop from application |
| DICE loan detail (banker) | `/drishti/farmer/{id}?engine=pre_loan&loanAppId=123` | Farmer ID, loan application |
| PULSE price screen (farmer) | `/drishti/market-timing?commodity=wheat&quantity=15&currentPrice=2150` | Commodity, quantity from harvest record |
| ROOTS cultivation cycle complete | `/drishti/household-portfolio` | Current season results pre-loaded |
| INSURANCE enrollment screen | `/drishti/insurance-compare?crop=paddy&acreage=3&season=kharif` | Crop and acreage from application |
| Sathi task (farmer visit) | `/drishti/farmer/{id}/household` | Farmer profile pre-loaded |
| Banker loan inbox | `/drishti/farmer/{id}?engine=pre_loan&runId=xyz` | Specific scenario result |

---

### 16.9 Offline Support (Farmer Mobile App)

Since Sathis and farmers often work in low/no connectivity areas:

**What works offline:**
- Household income/expense data entry (queued for sync)
- Viewing previously loaded scenario results (cached in AsyncStorage)
- Browsing scenario history (cached)

**What requires connectivity:**
- Running new scenarios (requires backend computation)
- Loading latest PULSE/SAGE data for simulations

**Implementation:**
- Use the existing offline queue pattern from VYAPAR module (vendor transactions)
- Household income/expense edits go to local SQLite → sync when online
- Scenario results are cached with `run_uuid` as key in AsyncStorage
- Show "Last updated: X ago" indicator when offline

---

### 16.10 Frontend Build Timeline (aligned with backend phases)

| Backend Phase | Frontend Deliverables |
|--------------|----------------------|
| Phase 1 (Weeks 1-4) | Bottom tab addition. DRISHTI home screen (farmer + farmer-web). Pre-Loan builder + result screens. Pre-Loan embedded widget in banker loan review. |
| Phase 2 (Weeks 5-9) | Household income/expense entry screens (farmer + sathi). Sathi household data collection wizard. Household Portfolio builder + result screens. Sathi DRISHTI home with farmer search. Shared chart components (CashFlowChart, IncomeBreakdown, ResilienceGauge). |
| Phase 3 (Weeks 10-13) | Insurance comparison screen. Market timing screen + PULSE embedded widget. Scenario history + detail screens. Offline caching for results. |
| Phase 4 (Weeks 14-17) | Banker DRISHTI home + portfolio stress test builder. SMA migration chart + portfolio heatmap. DRISHTI risk badge on loan inbox. Intervention list UI. Deep link wiring across all modules. |

*End of DRISHTI System Design Document*
