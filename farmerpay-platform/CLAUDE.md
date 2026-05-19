# FarmerPay Platform — Architecture & Claude Code Context

## Project Overview

FarmerPay is a bank-linked agricultural lending platform for the Indian market. It serves farmers, field agents (Sathis), bankers, and vendors across agriculture, horticulture, dairy, fisheries, goatery, and poultry.

**Business Model:** NOT a general farmer app. It's a lending platform.
- **Phase 1:** Existing bank loan customers (pre-fill from Finacle CBS)
- **Phase 2:** Digital lending to new farmers (self-registration)

**Tech Stack:**
- **Backend:** Node.js 20 + Express 4, MySQL 8 + Sequelize 6, Redis 7 (caching), RabbitMQ 3 (async jobs)
- **Farmer App:** React Native 0.81 + Expo 54 + Hermes (NOT Next.js — ignore "use client" warnings)
- **Vendor App:** React Native 0.81 + Expo 54
- **Web Dashboards (3):** Next.js 16 + React 19 + shadcn/ui + Recharts + Tailwind 4
- **Auth:** 4-digit MPIN + OTP (UPI pattern). No passwords. Do not reintroduce passwords.

---

## Platform Scale

| Metric | Count |
|--------|-------|
| Backend modules | 25 |
| API endpoints | 541+ |
| Database models | 450+ |
| Service files | 180+ |
| Middleware | 10 |
| Scheduled jobs | 9 |
| Frontend apps | 5 |
| Farmer app screens | 90 |
| Dashboard pages | 49 (banker 31 + sathi 12 + farmer-web 6) |

---

## Backend Modules — Complete Inventory

Every module follows MVC + Service Layer:
```
src/modules/<module>/
├── routes/*.js            # Express router, Swagger JSDoc
├── controllers/*.js       # HTTP handling only (zero business logic)
├── services/*.js          # Business logic, DB access, caching
├── models/*.js            # Sequelize model definitions
├── validators/*.js        # Joi schemas
└── workers/               # (optional) RabbitMQ consumers
```

### Module Map

| Module | Endpoints | Models | Services | Purpose |
|--------|-----------|--------|----------|---------|
| **AUTH** | 13 | 9 | 2 | JWT tokens, OTP, MPIN, Aadhaar verification |
| **FARMER** | 41 | 24 | 9 | Farmer profiles, activity subscriptions, onboarding, KYC |
| **ROOTS/CROP** | 23 | 52 | 5 | Farm register, fields, cultivation cycles, PoP execution, harvest, sales |
| **ROOTS/DAIRY** | 40 | 22 | 12 | Herd register, animals, milk logs, breeding, health, V2 financial logbook |
| **ROOTS/FISHERY** | 38 | 20 | 14 | Ponds, vessels, stocking, trips, V2 financial logbook |
| **ROOTS/HORTI** | 9 | 8 | 1 | Orchards, plantings, harvests, input logs, irrigation |
| **POP** | 3 | 3 | 1 | Package of Practices — goatery/poultry stage templates & touchpoints |
| **DICE** | 44 | 34 | 11 | Loan discovery, eligibility, application, disbursement, gold loans, insurance |
| **TRUST** | 30 | 25 | 14 | Credit scoring, evidence collection, pillar engine, lending decisions |
| **SENTINEL** | 22 | 37 | 9 | Loan health, EWS alerts, SMA classification, recovery, fraud detection |
| **PULSE** | 17 | 11 | 7 | Mandi prices, MSP, forecasts, sell-store advisor, price alerts |
| **SAGE** | 16 | 12 | 2 | AI crop advisory, weather/pest alerts, field observations |
| **DRISHTI** | 21 | 9 | 21 | Digital Twin — 6 scenario engines, Monte Carlo, stress testing |
| **AA** | 15 | 3 | 11 | Account Aggregator V2 — bank statement analysis, 4 analyzers |
| **BANK** | 25 | 11 | 10 | Finacle integration, CSV portfolio import, NPA, cohort reports |
| **BANKER** | 20 | 0 | 3 | Banker dashboard data aggregation |
| **SATHI** | 17 | 21 | 5 | Field agent profiles, tasks, consents, offline sync, field verification |
| **CHOICE** | 27 | 8 | 7 | Sathi management, commissions, incentives, KPIs |
| **VYAPAR** | 35 | 27 | 6 | Vendor ecosystem, transactions, credit ledgers, inventory |
| **LOCATION** | 9 | 13 | 1 | LGD geographic hierarchy (states → districts → blocks → villages → PACS) |
| **INSURANCE** | 6 | 2 | 3 | Insurance products, PMFBY enrollment, POS referral |
| **READINESS** | 7 | 2 | 2 | Bank product eligibility, readiness audit |
| **COMPLIANCE** | 8 | 2 | 1 | Consent records, grievance management (RBI) |
| **AGRISTACK** | 1 | 0 | 0 | AgriStack land lookup |
| **ADMIN** | 17 | 1 | 0 | Bank-ops admin UI (EJS, session-based) |
| **NOTIFICATIONS** | 0 | 0 | 3 | SMS/push/email (RabbitMQ workers only) |

### Route Mounting (app.js)

```
/api/v1/auth          → auth
/api/v1/farmer        → farmer (profiles + activity-subscriptions)
/api/v1/roots         → roots/crop (crops, cycles, workbands, tasks, harvest, sales)
/api/v1/roots/dairy   → roots/dairy (v1 + v2)
/api/v1/roots/fishery → roots/fishery (v1 + v2)
/api/v1/roots/horticulture → roots/horticulture
/api/v1/farmer/pop    → pop (goatery/poultry PoP templates)
/api/v1/dice          → dice (loans, insurance)
/api/v1/trust         → trust (scoring, decisions)
/api/v1/sentinel      → sentinel (EWS, recovery)
/api/v1/pulse         → pulse (market prices)
/api/v1/sage          → sage (advisories)
/api/v1/drishti       → drishti (scenarios)
/api/v1/aa            → aa (account aggregator)
/api/v1/bank          → bank (portfolio, Finacle)
/api/v1/sathi         → sathi (field agents)
/api/v1/vyapar        → vyapar (vendors)
/api/v1/location      → location (LGD)
```

---

## Frontend Apps — Complete Inventory

### 1. Farmer App (Mobile)
**Path:** `farmer-app/` | **Stack:** Expo 54, React Native 0.81, Expo Router 6
**Screens:** 90 | **Components:** 12 | **Libs:** 14

Key screen groups:
- **Auth:** login, aadhaar-verify, forgot-password
- **Onboarding:** onboarding-crops, onboarding-variety, choice, setup-confirm
- **Crop:** activity-crop → cycle-detail (workband data entry with input/labor/harvest/sale forms)
- **Dairy:** activity-dairy → dairy-animals, dairy-logbook, dairy-log-cost, dairy-log-revenue, dairy-treatment, dairy-breeding, dairy-pnl
- **Fishery:** activity-fishery → fishery-ponds, fishery-vessels, fishery-trip, fishery-logbook, fishery-log-cost, fishery-log-revenue, fishery-pnl
- **Horti/Livestock:** activity-horti, activity-goatery, activity-poultry
- **Financial:** aa-consent, aa-health, aa-insights
- **DRISHTI:** drishti-home, drishti-pre-loan, drishti-climate, drishti-insurance, drishti-market, drishti-portfolio
- **Loans:** loan-journey, loan-apply, bank-loan-detail, borrowing-sources
- **Marketplace:** krishi-bazaar, add-vendor, vendor-detail, record-purchase

Key libraries: `api.ts` (REST client), `aa.ts`, `drishti.ts`, `ocrService.ts` (tesseract.js), `voiceInput.ts`, `biometric.ts`

### 2. Vendor App (Mobile)
**Path:** `vendor-app/` | **Stack:** Expo 54, React Native 0.81
**Screens:** 8 — login, catalog, record-sale, add-farmer, give-credit, farmers, credit

### 3. Banker Dashboard (Web)
**Path:** `dashboard/` | **Stack:** Next.js 16, React 19, shadcn/ui, Recharts, Tailwind 4
**Pages:** 31 — farmers, farmer detail, AA analysis, DRISHTI portfolio stress, TRUST scoring, loan inbox, asset quality, intelligence, compliance, insurance, gold-loan, ecosystem, market

### 4. Sathi Dashboard (Web)
**Path:** `dashboard-sathi/` | **Stack:** Next.js 16, React 19, shadcn/ui
**Pages:** 12 — farmer roster, work queue, AA onboarding, commissions, issues, nudges

### 5. Farmer Web Portal (Web)
**Path:** `dashboard-farmer/` | **Stack:** Next.js 16, React 19, shadcn/ui
**Pages:** 6 — dashboard, loans, insurance, my-sathi

---

## ROOTS Module — Farm Operations Tracking (105 models)

### Activity Modules

| Activity | Backend | API Prefix | Models | Frontend |
|----------|---------|------------|--------|----------|
| CROP | `roots/crop/` | `/roots/` | 52 | `cycle-detail.tsx` (workband data entry) |
| DAIRY | `roots/dairy/` | `/roots/dairy/v2/` | 22 | 7 sub-screens (logbook, animals, cost, revenue, treatment, pnl) |
| FISHERY | `roots/fishery/` | `/roots/fishery/v2/` | 20 | 7 sub-screens (ponds, vessels, trips, logbook, pnl) |
| HORTI | `roots/horticulture/` | `/roots/horticulture/` | 8 | `activity-horti.tsx` (orchards + cycles) |
| GOATERY | `pop/` (shared) | `/farmer/pop/GOATERY/` | 3 | `activity-goatery.tsx` |
| POULTRY | `pop/` (shared) | `/farmer/pop/POULTRY/` | 3 | `activity-poultry.tsx` |

### Crop Data Entry Architecture

**ALL crop input/labor/expense logging goes through task execution. No cycle-level quick-log endpoints exist.**

```
PackageOfPractice → PopWorkband → PopTask → PopTaskInput
                         ↓              ↓
               WorkbandExecution → TaskExecution → Input/Labor/MachineryLogs
```

Key endpoints:
- `GET /roots/cycles/:cycleId/workbands` — Enriched DTO (joins 6 levels: WorkbandExecution → PopWorkband, TaskExecution → PopTask → PopTaskInput → InputItem + InputUnit). Auto-initializes from PoP template on first call.
- `POST /roots/workbands/:wbId/execute` — Start stage: `{ startDate }`
- `POST /roots/tasks/:taskId/execute` — Log data: `{ startDate, inputs: [{inputItemId, quantityUsed, unitId, cost}], labor: [{laborType, laborCount, laborHours, wagePerDay}] }`
- `POST /roots/tasks/:taskId/complete` — `{ endDate, completionPercentage: 100 }`
- `POST /roots/cycles/:cycleId/harvest` → returns `{ harvestRecordId }` (store for sale endpoint)
- `POST /roots/harvest/:harvestRecordId/sales` — `{ saleDate, quantitySold, pricePerKg, buyerName }`

### PoP Framework (Goatery/Poultry)

Uses generic Package of Practices module — NOT ROOTS-specific backend:
- `GET /farmer/pop/:activityCode/progress` — Returns flat `stages[]` + `touchpoints[]` (frontend groups by `stageKey`)
- `POST /farmer/pop/:activityCode/touchpoints` — `{ touchpointNumber, status: "DONE" }` (NOT `touchpointId`/`isCompleted`)
- Herd/flock counts stored in `farmer_activity_subscriptions.notes` as `key=value` pairs (e.g., `stall_fed=20, grazing=15`)

### Response Format Notes

| Endpoint | Format |
|----------|--------|
| `listMyCycles` | camelCase DTO (`cycleId`, `cropName`, `varietyName`) |
| `getCycleWorkbands` | snake_case enriched DTO (`workband_name`, `task_name`, `workband_status`) |
| `getCycleSummary` | Raw Sequelize snake_case (`total_input_cost`, `total_other_expenses`, `total_sale_value`) |
| Dairy/Fishery v2 | camelCase DTOs |
| Horticulture orchards | camelCase DTO (`orchardId`, `orchardName`, `areaHectares` — NOT areaAcres) |
| PoP progress | camelCase model fields (`labelEn`, `nameEn`, `touchpointNumber`, `stageKey`) |

### Farmer App Activity Routing

In `farmer-app/app/(tabs)/index.tsx`, `ACTIVITY_META` maps:
- CROP → `/activity-crop`, DAIRY → `/activity-dairy`, FISHERY → `/activity-fishery`
- HORTI → `/activity-horti`, GOATERY → `/activity-goatery`, POULTRY → `/activity-poultry`

---

## TRUST Module — Credit Scoring (25 models, 14 services)

Evidence-based credit assessment with 5 scoring pillars:
- **Structure:** Questions → Sections → Pillars → Composite Score → Decision
- **Key endpoints:** `/trust/home`, `/trust/sections/:id/questions`, `/trust/responses`, `/trust/score`, `/trust/decisions`
- **Services:** scoringEngine, pillarEngine, decisionEngine, evidenceCollector, cibilBridge, leverageService
- **Tables:** `trust_questions`, `trust_responses`, `trust_score_calculations`, `trust_decisions`, `trust_evidence`

---

## DICE Module — Loan Origination (34 models, 11 services)

Full loan lifecycle: discovery → eligibility → application → disbursement → repayment
- **2-tier auth:** Tier-1 (browsing/calculators), Tier-2 (apply/consent/sign)
- **Key endpoints:** `/dice/products`, `/dice/eligibility`, `/dice/applications`, `/dice/loans/me`
- **Special:** Gold loan appraisal, post-harvest topups, input cost calculators, Scale of Finance admin
- **Tables:** `loan_applications`, `loan_products`, `loan_disbursements`, `loan_repayments`

---

## SENTINEL Module — Risk Monitoring (37 models, 9 services)

Loan health monitoring, early warning, and recovery:
- **Key endpoints:** `/sentinel/health`, `/sentinel/risk`, `/sentinel/alerts`, `/sentinel/recovery`
- **Services:** healthScoring, riskAnalysis, EWS, recovery, duplicateDetection, goldLoanMonitor, marketRiskScan
- **Tables:** `loan_health_snapshots`, `ews_alerts`, `sma_classification_logs`, `recovery_cases`

---

## PULSE Module — Market Intelligence (11 models, 7 services)

Mandi prices, MSP tracking, price forecasts, sell-store advisor:
- **Key endpoints:** `/pulse/commodities`, `/pulse/prices`, `/pulse/forecasts`, `/pulse/alerts`, `/pulse/sell-store`
- **Tables:** `pulse_commodities`, `pulse_price_records`, `pulse_price_forecasts`, `pulse_sell_recommendations`

---

## SAGE Module — Crop Advisory (12 models, 2 services)

AI-driven advisories combining ROOTS execution data + weather + soil health:
- **Key endpoints:** `/sage/feed/me`, `/sage/advisories`, `/sage/alerts`
- **Integration:** Vistaar/Beckn network (Krishi-DSS provider with 24 use cases)
- **Tables:** `sage_advisories`, `sage_alerts`, `sage_crop_health_observations`

---

## DRISHTI Module — Digital Twin (9 models, 21 services)

6 scenario simulation engines with Monte Carlo:
- Pre-Loan, Household Portfolio, Climate Stress, Insurance, Market Timing, Banker Portfolio
- **Key endpoints:** `/drishti/scenarios`, `/drishti/run`, `/drishti/compare`
- **Design doc:** `DRISHTI-SYSTEM-DESIGN.md`
- **Tables:** `drishti_scenario_runs`, `drishti_scenario_results`, `drishti_farmer_snapshots`

---

## AA Module — Account Aggregator V2 (3 models, 11 services)

Bank statement analysis via 4 analyzers:
- incomeClassifier (10 categories), expenseDetector (9 categories), seasonalityMapper, financialHealthScorer
- **Key endpoints:** `/aa/consent`, `/aa/analysis`, `/aa/insights`
- **Design doc:** `AA-SYSTEM-DESIGN-V2.md`
- **Tables:** `aa_transactions`, `aa_financial_analyses`, `aa_consent_audit_logs`

---

## Code Patterns

### Routes
```javascript
const router = express.Router();
router.use(authenticate);
router.get('/resource', controller.getResource);
router.post('/resource', validate(schema), controller.createResource);
```

### Controllers
```javascript
const resolveUserId = async (req) => {
  const user = await User.findOne({ where: { user_id: req.user.id, is_active: true } });
  if (!user) { const err = new Error('User not found'); err.statusCode = 404; throw err; }
  return user.id;
};
const getResource = async (req, res, next) => {
  try { const fid = await resolveUserId(req); const r = await service.get(fid);
    return success(res, { message: 'Done', data: r }); } catch (err) { next(err); }
};
```

### Services
```javascript
let db;
const getDb = () => { if (!db) db = require('../../../shared/models'); return db; };
// Always lazy-load DB to avoid circular deps
// Always map snake_case → camelCase in DTOs
// Always use transactions for multi-table writes
```

### Models
```javascript
ModelName.init({ ... }, {
  sequelize, modelName: 'ModelName', tableName: 'table_name',
  timestamps: true, underscored: true,
});
// Associations in static associate(models) {}
// All tables: snake_case, is_active boolean, created_at/updated_at
```

---

## Shared Utilities

| Import | Path | Usage |
|--------|------|-------|
| `{ success }` | `shared/utils/responseHelper` | HTTP response |
| `STATUS_CODES` | `shared/constants/statusCodes` | HTTP codes |
| `logger` | `shared/utils/logger` | Structured logging |
| `{ generateUUID }` | `shared/utils/uuidHelper` | UUID generation |
| `{ parsePagination, buildMeta }` | `shared/utils/paginationHelper` | Pagination |
| `{ setWithTTL, getKey, deleteKeys }` | `config/redis` | Redis caching |
| `{ authenticate }` | `middleware/auth` | JWT auth |
| `roleCheck` | `middleware/roleCheck` | RBAC |
| `validate` | `middleware/validate` | Joi validation |

---

## Middleware Stack

1. `auth.js` — JWT verification
2. `errorHandler.js` — Global error handling
3. `featureGate.js` — Feature flags
4. `language.js` — Language detection (X-Language header)
5. `rateLimiter.js` — Request rate limiting
6. `requestId.js` — Unique request ID
7. `requireAadhaarAuth.js` — Aadhaar step-up
8. `roleCheck.js` — Role-based access (FARMER, AGENT, ADMIN, BANKER)
9. `upload.js` — File upload (Multer)
10. `validate.js` — Joi schema validation

---

## Scheduled Jobs (9)

| Job | Purpose |
|-----|---------|
| dairyRecurringJob | Auto-generate recurring dairy cost/revenue entries |
| fisheryRecurringJob | Auto-generate recurring fishery entries |
| cropAdvisoryJob | Generate SAGE crop advisories |
| imdWeatherFetchJob | Fetch IMD weather data |
| bankNpaRecalcJob | Recalculate bank NPA classifications |
| pulseDailyIngestJob | Ingest daily mandi prices |
| pulseSentinelScanJob | PULSE → SENTINEL price risk scan |
| aaDataPurgeJob | Purge expired AA transaction data |
| aaConsentExpiryJob | Expire stale AA consents |

---

## Design Documentation

| File | Module | Content |
|------|--------|---------|
| `AA-SYSTEM-DESIGN-V2.md` | AA | 4 analyzers, 22 endpoints, 219 tests |
| `DRISHTI-SYSTEM-DESIGN.md` | DRISHTI | 6 engines, 22 endpoints, 230 tests |
| `ARCHITECTURE.md` | Platform | System architecture overview |
| `ARCHITECTURE-CONDENSED.md` | Platform | Condensed architecture |
| `BANK_SECURITY_DOCUMENTATION.md` | Bank | Finacle integration security |
| `docs/trust-v2-handoff-checklist.md` | Trust | V2 implementation checklist |
| `docs/PRODUCTION_READINESS.md` | Ops | Production readiness checklist |
| `docs/DEPLOYMENT_GUIDE.md` | Ops | Deployment instructions |

---

## Critical Conventions

1. **No circular imports.** Use `getDb()` lazy-load pattern in every service.
2. **Transactions for multi-table writes.** `seq.transaction()` with try/commit/catch/rollback.
3. **Snake_case in DB, camelCase in API.** DTOs must map between the two.
4. **UUID for external-facing IDs.** Internal IDs are auto-increment integers.
5. **No passwords.** MPIN + OTP only for farmer auth.
6. **Error convention:** `const err = new Error('msg'); err.statusCode = 4xx; err.errorCode = 'CODE'; throw err;`
7. **Redis cache invalidation.** Delete related cache keys on data changes.
8. **Crop data entry is task-level only.** No cycle-level quick-log — always through POST /roots/tasks/:taskId/execute.
9. **Goatery/Poultry use PoP framework.** No dedicated backend — `POST /farmer/pop/:code/touchpoints` with `{ touchpointNumber, status }`.
10. **React Native/Expo, not Next.js.** Farmer app uses Expo Router. Ignore "use client" lint warnings.
