# DRISHTI — Phase-by-Phase Implementation Prompts for Claude Code

> **How to use:** Open your project folder in Claude Code. The `CLAUDE.md` at the root will be auto-loaded, giving Claude Code full context about your codebase patterns. Then paste one phase prompt at a time. Complete and test each phase before moving to the next.

---

## Phase 1 — Foundation + Pre-Loan Engine (Weeks 1–4)

### Prompt 1.1: Database Tables & Sequelize Models

```
Read DRISHTI-SYSTEM-DESIGN.md sections on database tables. Create the following 9 Sequelize models in src/modules/drishti/models/ following the exact pattern in CLAUDE.md:

1. DrishtiScenarioTemplate.js — scenario_templates table
2. DrishtiFarmerSnapshot.js — farmer_snapshots table (includes all household income/expense fields)
3. DrishtiScenarioRun.js — scenario_runs table
4. DrishtiScenarioResult.js — scenario_results table
5. DrishtiScenarioComparison.js — scenario_comparisons table
6. DrishtiBenchmarkProfile.js — benchmark_profiles table
7. DrishtiPortfolioRun.js — portfolio_runs table
8. DrishtiHouseholdIncomeSource.js — household_income_sources table
9. DrishtiHouseholdExpense.js — household_expenses table

All tables must be prefixed with drishti_. Set up all associations (belongsTo, hasMany) between models. Then register them in the shared models index at src/shared/models/index.js following the pattern used by other modules.

Also create the SQL migration file with all 9 CREATE TABLE statements matching the design doc exactly.
```

### Prompt 1.2: Routes, Controller Shell & Validators

```
Read DRISHTI-SYSTEM-DESIGN.md API contracts section. Create:

1. src/modules/drishti/routes/drishtiRoutes.js — All routes for the 6 engines plus snapshot and template endpoints. Use authenticate middleware on all routes. Add roleCheck where the design doc specifies (banker-only routes).

2. src/modules/drishti/controllers/drishtiController.js — Controller with handler stubs for every route. Each handler should resolve the user, call the service (even though services aren't written yet), and return success(). Follow the exact controller pattern from CLAUDE.md.

3. Validators (all 8 files in src/modules/drishti/validators/):
   - scenarioValidator.js
   - preLoanValidator.js
   - householdPortfolioValidator.js
   - climateStressValidator.js
   - insuranceValidator.js
   - marketTimingValidator.js
   - bankerPortfolioValidator.js
   - snapshotValidator.js

Wire validation middleware into the routes. Register the drishti routes in the main app router (check how other modules are registered and follow the same pattern).
```

### Prompt 1.3: Snapshot Builder Service

```
Read DRISHTI-SYSTEM-DESIGN.md section on the snapshot-then-compute pattern. Implement:

src/modules/drishti/services/snapshotBuilder.js

This service creates a frozen snapshot of a farmer's profile by pulling data from:
- User/Farmer tables (demographics, land, location)
- ROOTS module (active activities, historical yields)
- TRUST module (credit score)
- DICE module (active loans)
- PULSE module (latest market prices for farmer's crops)
- SAGE module (weather forecast for farmer's location)
- Household income sources and expenses

The snapshot should be saved to drishti_farmer_snapshots and return the snapshot_uuid. Use the getDb() lazy-load pattern. Cache the snapshot in Redis with TTL of 1 hour (key: drishti:snapshot:{farmerId}).

Important: This service only READS from other module tables. It never writes to them.
```

### Prompt 1.4: Computation Primitives

```
Read DRISHTI-SYSTEM-DESIGN.md computation engine section. Implement these 6 core computation primitives in src/modules/drishti/services/computation/:

1. yieldProjector.js — Projects crop/dairy/fishery yield based on historical data, weather, and input levels. Uses simple regression or average-based projection.

2. priceForecaster.js — Forecasts commodity prices using PULSE market data. Uses moving averages and seasonal adjustments.

3. costEstimator.js — Estimates input costs (seeds, fertilizer, labor, feed, fuel) based on activity type and scale.

4. revenueCalculator.js — Combines yield * price projections to estimate gross revenue per activity.

5. cashFlowProjector.js — Builds month-by-month cash flow combining revenues, costs, loan EMIs, and household income/expenses.

6. riskScorer.js — Computes risk score (0-100) based on concentration, weather dependency, market volatility, and debt-to-income ratio.

Each file should export pure functions that take a snapshot object and scenario parameters, and return projections. No DB access in these files — they work entirely on the snapshot data passed to them.
```

### Prompt 1.5: Pre-Loan Engine

```
Read DRISHTI-SYSTEM-DESIGN.md Pre-Loan Scenario Modeling section. Implement:

1. src/modules/drishti/services/engines/preLoanEngine.js — The complete Pre-Loan Engine that:
   - Takes a farmer snapshot + proposed loan parameters (amount, tenure, interest rate, purpose)
   - Runs the computation primitives to project: monthly EMI, total interest, cash flow with vs without loan, debt-to-income ratio, break-even month
   - Generates a recommendation (SAFE / CAUTION / RISKY) with explanation text
   - Returns the full result object matching the API contract in the design doc

2. src/modules/drishti/services/drishtiService.js — The orchestrator service that:
   - Manages scenario lifecycle (create, run, get results, compare)
   - Calls snapshotBuilder to get/refresh farmer snapshot
   - Routes to the correct engine based on scenario type
   - Saves results to drishti_scenario_runs and drishti_scenario_results
   - Handles caching of results in Redis

Make sure the full flow works end-to-end: API request → route → controller → drishtiService → snapshotBuilder → preLoanEngine → computation primitives → save results → return response.
```

---

## Phase 2 — Household & Activity Portfolio (Weeks 5–8)

### Prompt 2.1: Household Income & Expense Services

```
Read DRISHTI-SYSTEM-DESIGN.md section on Household-First Economics and Engine #2. Implement:

1. src/modules/drishti/services/householdService.js — Aggregates all household income sources:
   - Farm income (from ROOTS activities)
   - Spouse SHG income
   - MGNREGA wages
   - Pension
   - Remittances from family
   - Petty business / shop income
   - Government transfers (PM-KISAN, DBT)
   - Rental income
   - Wage labor income
   Also aggregates household expenses across 8 categories (food, education, health, housing, transport, ceremonies, debt servicing, other).

2. src/modules/drishti/services/computation/householdIncomeProjector.js — Projects non-farm income growth with seasonal patterns and reliability scoring for each source.

3. src/modules/drishti/services/computation/householdExpenseProjector.js — Projects household expenses with inflation adjustments and seasonal spikes (festivals, school fees).

4. src/modules/drishti/services/computation/resilienceCalculator.js — Calculates financial resilience metrics:
   - Months survivable without farm income
   - Income diversification index (Herfindahl-Hirschman)
   - Single-point-of-failure identification
   - Emergency fund adequacy
```

### Prompt 2.2: Household Portfolio Engine

```
Read DRISHTI-SYSTEM-DESIGN.md Engine #2 section. Implement:

src/modules/drishti/services/engines/householdPortfolioEngine.js

This engine lets farmers explore what-if scenarios for their entire household economy:
- "What if I add dairy to my farm?"
- "What if my spouse joins an SHG?"
- "What if I shift 1 acre from paddy to vegetables?"

It should:
1. Take the farmer snapshot + proposed portfolio changes (add/remove/modify activities and income sources)
2. Project the modified household income and expenses over 12-36 months
3. Compare current vs proposed portfolio on: total income, diversification, risk, resilience
4. Generate ranked recommendations

Wire it into drishtiService.js as engine type 'household_portfolio'. Test the complete API flow.
```

---

## Phase 3 — Climate Stress + Insurance (Weeks 9–11)

### Prompt 3.1: Monte Carlo Simulator + Climate Stress Engine

```
Read DRISHTI-SYSTEM-DESIGN.md sections on Monte Carlo and Engine #3. Implement:

1. src/modules/drishti/services/computation/monteCarloSimulator.js — Generic Monte Carlo simulation engine that:
   - Accepts distribution parameters (mean, stddev, min, max) for multiple variables
   - Runs N iterations (default 1000) generating random scenarios
   - Returns percentile outcomes (P10, P25, P50, P75, P90) and probability distributions

2. src/modules/drishti/services/engines/climateStressEngine.js — Climate Stress Testing Engine that:
   - Takes farmer snapshot + climate scenario (drought, flood, delayed monsoon, heatwave)
   - Uses IMD weather data patterns from SAGE module
   - Applies yield impact curves per crop type per climate scenario
   - Runs Monte Carlo over yield and price distributions
   - Outputs: expected income under stress, probability of loan default, months of cash flow deficit, recommended mitigations

Wire into drishtiService.js as engine type 'climate_stress'.
```

### Prompt 3.2: Insurance Decision Engine

```
Read DRISHTI-SYSTEM-DESIGN.md Engine #4 section. Implement:

src/modules/drishti/services/engines/insuranceEngine.js

This engine helps farmers decide whether crop/livestock insurance (PMFBY, RWBCIS) is worth it:
1. Takes farmer snapshot + insurance product parameters (premium, sum insured, coverage triggers)
2. Simulates N scenarios using Monte Carlo for yield outcomes
3. Calculates: expected payout frequency, average payout amount, net benefit (payouts - premiums over 5 years)
4. Compares insured vs uninsured financial trajectory
5. Returns recommendation with confidence level and break-even analysis

Wire into drishtiService.js as engine type 'insurance_decision'.
```

---

## Phase 4 — Market Timing + Banker Portfolio (Weeks 12–14)

### Prompt 4.1: Market Timing Engine + Benchmark Service

```
Read DRISHTI-SYSTEM-DESIGN.md Engine #5 section. Implement:

1. src/modules/drishti/services/computation/benchmarkComparer.js — Compares farmer metrics against district/block/state benchmarks from drishti_benchmark_profiles table.

2. src/modules/drishti/services/benchmarkService.js — Manages benchmark profiles: loads district-level yield, price, and cost benchmarks from the database and Redis cache.

3. src/modules/drishti/services/engines/marketTimingEngine.js — Post-Harvest Market Timing Engine that:
   - Takes farmer snapshot + commodity, current quantity, storage capacity/cost
   - Pulls price trends and forecasts from PULSE
   - Simulates sell-now vs store-and-sell-later scenarios accounting for storage cost, wastage/spoilage, price appreciation probability
   - Returns: optimal sell window, expected price trajectory, storage ROI, risk of holding

Wire into drishtiService.js as engine type 'market_timing'.
```

### Prompt 4.2: Banker Portfolio Engine + RabbitMQ Worker

```
Read DRISHTI-SYSTEM-DESIGN.md Engine #6 and RabbitMQ sections. Implement:

1. src/modules/drishti/services/engines/bankerPortfolioEngine.js — Banker Portfolio Simulation that:
   - Takes a banker's portfolio filter (branch, district, crop, loan product)
   - Aggregates across multiple farmer snapshots
   - Runs stress scenarios (monsoon failure in region X, price crash in commodity Y)
   - Outputs: portfolio-level exposure, expected NPA rate, concentration risk, recommendations
   - For portfolios > 50 farmers, queue the simulation via RabbitMQ instead of running synchronously

2. src/modules/drishti/workers/portfolioSimulationConsumer.js — RabbitMQ consumer that:
   - Listens on 'drishti.portfolio.simulation' queue
   - Processes batch simulations asynchronously
   - Saves results to drishti_portfolio_runs table
   - Sends notification when complete

Wire into drishtiService.js as engine type 'banker_portfolio'. Add roleCheck('banker') on the route.
```

---

## Phase 5 — Frontend Integration + Polish (Weeks 15–17)

### Prompt 5.1: Scenario Templates Seed Data

```
Read DRISHTI-SYSTEM-DESIGN.md scenario templates section. Create a database seed file that populates drishti_scenario_templates with the predefined templates for all 6 engines:
- Pre-Loan: "Standard crop loan", "Dairy expansion loan", "Equipment purchase"
- Household Portfolio: "Add dairy", "Shift to horticulture", "SHG formation"
- Climate Stress: "Drought", "Flood", "Delayed monsoon", "Heatwave"
- Insurance: "PMFBY evaluation", "RWBCIS evaluation"
- Market Timing: "Sell now vs store" per major commodity
- Banker Portfolio: "Regional monsoon failure", "Commodity price crash"

Also seed drishti_benchmark_profiles with realistic district-level benchmarks for major crops in Maharashtra, Karnataka, and Madhya Pradesh.
```

### Prompt 5.2: Scenario Comparison API

```
Implement the scenario comparison feature in drishtiService.js:
- POST /drishti/comparisons — Create a comparison between 2-4 scenario runs
- GET /drishti/comparisons/:id — Get comparison results with side-by-side metrics

The comparison should auto-calculate deltas between scenarios on key metrics (total income, risk score, EMI burden, resilience months, diversification index) and highlight the trade-offs.

Also add GET /drishti/scenarios/:id/share — generates a shareable summary (for Sathi to share with farmer via WhatsApp/SMS using the existing Twilio integration).
```

---

## Tips for Using These Prompts

1. **Run one prompt at a time.** Wait for Claude Code to finish and test before moving to the next.
2. **Always reference the design doc.** Each prompt tells Claude Code to read `DRISHTI-SYSTEM-DESIGN.md` — this is intentional. The design doc has exact table schemas, API contracts, and pseudocode.
3. **Test incrementally.** After each prompt, ask Claude Code: "Write a quick test for [the thing we just built] and run it."
4. **If something doesn't match the pattern,** tell Claude Code: "Check how the trust module does this and follow the same pattern."
5. **For frontend work (Phase 5),** you'll want to work in the React Native and Next.js projects separately — those prompts are not included here as they depend on your current frontend structure.
