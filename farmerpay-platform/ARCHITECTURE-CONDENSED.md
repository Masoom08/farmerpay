# FarmerPay Platform — Architecture Condensed Reference

> Last updated: 2026-04-13 | Full version: ARCHITECTURE.md

## Platform

Bank-linked agricultural lending platform for Indian market. Node.js 20 + Express 4, MySQL 8 + Sequelize 6, Redis 7, RabbitMQ 3, React Native/Expo 54 (mobile), Next.js 16 (dashboards).

## Modules (23)

| Module | Code | Tables | Purpose |
|--------|------|--------|---------|
| Auth | AUTH | 9 | MPIN + OTP login, JWT, Aadhaar step-up |
| Farmer | FARMER | 15 | Profile, KYC, address, bank accounts, activity subscriptions |
| ROOTS (Crop) | ROOTS | 30+ | Cultivation cycles, PoP, harvest, profitability tracking |
| ROOTS (Dairy) | ROOTS | 20+ | Herd register, milk production, v2 financial logbook |
| ROOTS (Fishery) | ROOTS | 18+ | Pond register, stocking, harvest, v2 logbook |
| ROOTS (Horti) | ROOTS | 8 | Orchards, plantings, harvests |
| DICE | DICE | 18 | Loan products, applications, disbursement, repayment, post-harvest |
| PULSE | PULSE | 9 | Mandi prices, forecasts, MSP, sell-or-store advisor |
| SAGE | SAGE | 7 | Weather, crop advisories, pest alerts, IMD integration |
| SENTINEL | SENTINEL | 19 | Loan health, SMA, EWS, income adequacy, recovery |
| TRUST | TRUST | 13 | Credit scoring questionnaire, score history |
| **DRISHTI** | **DRISHTI** | **9** | **Digital Twin — 6 scenario simulation engines** |
| INSURANCE | INSURANCE | 3 | PMFBY, livestock, POS referral |
| VYAPAR | VYAPAR | 18 | Vendor marketplace, transactions, commissions |
| POP | POP | 10 | Package of Practice — ICAR crop/dairy/fishery schedules |
| BANK | BANK | 6 | Finacle integration, loan import, field mapping |
| SATHI | SATHI | 5 | Field agent tasks, assignments, KPIs |
| COMPLIANCE | COMPLIANCE | 2 | Audit trails, document approval |
| AGRISTACK | AGRISTACK | 2 | Government land record verification |
| LOCATION | LOCATION | 11 | LGD states/districts/blocks/villages/panchayats |
| CHOICE | CHOICE | 7 | Intermediary management, commission ledger |
| ADMIN | ADMIN | 1 | Bank-ops admin dashboard |

## DRISHTI Module (Digital Twin)

### 6 Engines

| # | Engine | User Question | Users |
|---|--------|---------------|-------|
| 1 | Pre-Loan | "Should I take this loan?" | Farmer + Banker |
| 2 | Household Portfolio | "What should my household do?" | Farmer + Sathi |
| 3 | Climate Stress | "What if monsoon fails?" | Farmer + Banker |
| 4 | Insurance Decision | "Is PMFBY worth it?" | Farmer + Sathi |
| 5 | Market Timing | "Sell now or store?" | Farmer |
| 6 | Banker Portfolio | "What if drought hits my district?" | Banker |

### 11 Computation Primitives

yieldProjector, priceForecaster, costEstimator, revenueCalculator, cashFlowProjector, riskScorer, monteCarloSimulator, householdIncomeProjector, householdExpenseProjector, resilienceCalculator, benchmarkComparer

### 9 Database Tables

`drishti_scenario_templates`, `drishti_farmer_snapshots`, `drishti_scenario_runs`, `drishti_scenario_results`, `drishti_scenario_comparisons`, `drishti_benchmark_profiles`, `drishti_portfolio_runs`, `drishti_household_income_sources`, `drishti_household_expenses`

### 22 API Endpoints

`/api/v1/drishti/` — scenarios (6 POST engines + GET results + compare + share), templates, benchmarks, household CRUD, portfolio runs

### Key Patterns

- **Snapshot-then-compute**: Frozen farmer state from 9 modules → deterministic engine output
- **Read-only consumer**: Never writes to other modules' tables
- **Sync/async split**: Engines 1-5 sync (<3s), Engine 6 async via RabbitMQ (>50 farmers)
- **Redis-cached benchmarks**: District-level, refreshed nightly, 24h TTL
- **Monte Carlo**: Box-Muller sampling, seeded RNG, P10/P25/P50/P75/P90 percentiles
- **Household-first economics**: Models complete household (SHG, MGNREGA, pension, remittance, petty business)

### Frontend Integration

- **Farmer App**: 6 screens + 5 components + API lib, home tile + loan journey integration
- **Banker Dashboard**: Overview + portfolio stress pages, sidebar nav, Recharts components
- **Sathi Dashboard**: Guided household data collection wizard, insurance advisor, WhatsApp share

### Tests

230 tests across 8 suites (Phase 1-5), all passing in ~1s

## Key Statistics

| Metric | Value |
|--------|-------|
| Backend source files | ~750 |
| Feature modules | 23 |
| Sequelize models | 159 |
| Database tables | 220+ |
| API endpoint groups | 22+ |
| Mobile screens | 78 |
| RabbitMQ workers | 3 |
| Scheduled jobs | 8 |
| Supported languages | 11 (Bhashini NMT) |
| DRISHTI tests | 230 |

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Node.js 20, Express 4 |
| Database | MySQL 8, Sequelize 6 ORM |
| Cache | Redis 7 |
| Queue | RabbitMQ 3 |
| Mobile | React Native 0.81, Expo 54, TypeScript |
| Dashboard | Next.js 16, shadcn/ui, Recharts, Tailwind 4 |
| Auth | JWT (MPIN + OTP), Aadhaar step-up |
| Translation | Bhashini ULCA API (11 languages) |
| Weather | IMD via SAGE module |
| Prices | Agmarknet via PULSE module |
| Land | AgriStack/CERSAI |

## Auth Pattern

- MPIN (4-digit) for browsing — UPI-style, no passwords
- Aadhaar OTP step-up for financial transactions (loans, disbursement)
- JWT access + refresh tokens
- Role-based access: FARMER, AGENT, BANK_OFFICER, ADMIN, VENDOR
