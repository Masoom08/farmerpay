# FarmerPay — Intent Validation and Product Design Audit

**Date:** April 5, 2026
**Classification:** Internal — Product Architecture Review
**Purpose:** Validate whether the system implementation matches the stated business intent

---

## 1. Intent Summary

### 1.1 Stated Objective (From Proposal Document)

The FarmerPay proposal to banks states the platform is a **"Repayment as a Service"** system designed to:

> "Prevent NPAs before they occur through continuous farmer engagement, real-time monitoring, and proactive intervention."

The document promises banks:
- Real-time early warning system identifying potential defaults **90 days in advance**
- 1-2.5% reduction in pilot portfolio NPAs
- 40-60% reduction in loan processing time
- Real-time visibility into farm operations
- Daily farmer engagement through advisories

### 1.2 Core Behaviour Change Intent

The platform's fundamental design principle, per the proposal, is:

1. **Track** whether the farmer follows Package of Practices (PoP)
2. **Compare** actual activities and spending against expected
3. **Nudge** the farmer in real-time: "You are on track" or "You are off track"
4. **Alert** the banker when deviations indicate repayment risk
5. **Intervene** before the loan becomes an NPA

### 1.3 Implicit Promise to Banks

The proposal tells banks: "We will give you unprecedented visibility into farm operations." This implies:
- A banker dashboard showing farmer-level compliance
- Cost tracking (actual vs budget)
- Activity compliance scoring
- Predictive NPA indicators tied to farm behaviour

---

## 2. Ideal System vs Actual System

### 2.1 What the System SHOULD Have (Per Intent)

#### Farmer Side

| Feature | Required? | Purpose |
|---------|-----------|---------|
| PoP compliance tracker | Mandatory | Show farmer their adherence to recommended practices |
| Activity timeline (expected vs actual) | Mandatory | Visual comparison of planned vs done |
| Input cost tracker (actual vs budget) | Mandatory | "You have spent Rs 12,000 of Rs 15,000 input budget" |
| On-track / Off-track status | Mandatory | Simple red/green signal |
| Deviation alerts | Mandatory | "You are 5 days late on weeding" |
| Actionable nudges | Mandatory | "Apply urea now — you are in the right window" |
| Harvest readiness score | Important | "Your crop is 85% ready based on growth stage" |

#### Banker Side

| Feature | Required? | Purpose |
|---------|-----------|---------|
| Farmer-level risk dashboard | Mandatory | See which farmers are on-track vs off-track |
| Portfolio compliance view | Mandatory | "73% of your portfolio is PoP-compliant" |
| Early warning alerts | Mandatory | "Farmer X has skipped 3 tasks — risk increasing" |
| Cost deviation reports | Mandatory | "Farmer Y has overspent 40% on inputs" |
| Predictive NPA score | Mandatory | "Based on behaviour, 12 farmers are high-risk" |
| Loan utilisation tracking | Important | "Farmer Z received Rs 50K loan, spent Rs 30K on inputs" |

### 2.2 What the System ACTUALLY Has

#### Farmer Side (Implemented)

| Feature | Status | Notes |
|---------|--------|-------|
| Task logging (what farmer did) | Built | WorkbandExecution, TaskExecution models |
| Input usage logging | Built | TaskExecutionInputLog with quantities and costs |
| Labour logging | Built | TaskExecutionLaborLog with hours and costs |
| Expense tracking | Built | TaskExecutionExpense + CultivationCycleExpenseSummary |
| Expected budgets | Built | CultivationCyclePlanning with expected yield, cost, profit |
| Actual vs expected profit | Built | CultivationCycleProfitability with variance |
| Benchmarking | Built | CultivationCycleBenchmarking vs district averages |
| Market prices (PULSE) | Built | PriceCard, PriceTrendChart, sell-vs-store comparison |
| Weather/pest advisories (SAGE) | Built | SageAdvisory, SageAlert models |
| Harvest recording | Built | HarvestRecord with quality grade and loss tracking |
| Sale recording | Built | HarvestSaleRecord with buyer, price, net value |

#### Farmer Side (NOT Implemented)

| Feature | Status | Impact |
|---------|--------|--------|
| PoP compliance score | Missing | Farmer does not know if they are following best practices |
| Actual vs expected timing comparison | Missing | No "you are 5 days late on spraying" |
| On-track / Off-track signal | Missing | No simple status indicator |
| Deviation alerts | Missing | Farmer is not warned when they deviate |
| Behavioural nudges | Missing | No "apply urea now" type actionable pushes |
| Input cost vs budget comparison | Missing | Farmer cannot see "spent 80% of budget" |
| Loan utilisation visibility | Missing | Farmer does not see how loan maps to farm spending |

#### Banker Side (Implemented)

| Feature | Status | Notes |
|---------|--------|-------|
| Nothing | Nothing | Zero banker-facing analytics exist in the codebase |

#### Banker Side (NOT Implemented)

| Feature | Status | Impact |
|---------|--------|--------|
| Farmer risk dashboard | Missing | Banker has no visibility into farmer behaviour |
| Portfolio compliance view | Missing | Banker cannot see which farmers are at risk |
| Early warning system | Missing | The "90-day advance warning" promised to banks does not exist |
| Cost deviation alerts | Missing | Banker cannot detect loan fund diversion |
| Predictive NPA scoring | Missing | No behavioural NPA prediction |
| Loan utilisation tracking | Missing | Banker cannot verify end-use of funds |

---

## 3. Module-wise Analysis

| Module | Intended Function (Proposal) | Farmer Analytics Provided | Banker Analytics Provided | Gap |
|--------|------------------------------|--------------------------|--------------------------|-----|
| **DICE** | "Streamlined loan origination, dynamic credit scoring" | Loan application, topup loan, repayment schedule | None | No dynamic scoring; no banker dashboard |
| **SAGE** | "Hyperlocal crop advisories protecting yields... early warning of potential repayment issues" | Weather alerts, pest alerts, market price alerts, storage recommendations | None | Advisories exist but are NOT linked to PoP compliance or loan repayment risk |
| **PULSE** | "Real-time market intelligence maximizing farmer income... objective validation of farmer revenue" | Price forecasts, sell-vs-store simulator, mandi comparison | None | Market intelligence is strong but NOT linked to loan repayment capacity |
| **ROOTS** | "Comprehensive farm ERP... unprecedented visibility into farm operations... early identification of production issues" | Task logging, input/labour/cost tracking, harvest recording | None | Data capture is good but NO analytics layer — raw data exists, no insights generated |
| **TRUST** | "Dynamic creditworthiness assessment... early warning system identifies high-risk accounts 90 days in advance" | Trust score (questionnaire-based) | None | Score is self-reported survey, not behavioural. No 90-day early warning system exists. PULSE/DICE signals feed in but are non-blocking |
| **CHOICE** | "Ground-level execution through trained intermediary network" | Not implemented | Not implemented | Module is a stub (1 file, no models, no routes) |

---

## 4. Gap Analysis

### 4.1 The Fundamental Gap

The proposal promises **"Repayment as a Service"** — a system that actively prevents NPAs through behavioural monitoring and intervention.

The implementation delivers **"Data Collection as a Service"** — a system that collects farm data but does not analyse it for compliance, does not generate behavioural insights, and does not provide any banker-facing analytics.

### 4.2 Missing Farmer Analytics

| What's Missing | Why It Matters |
|---------------|---------------|
| PoP compliance score | Farmer has no idea if they are farming correctly |
| "On track / Off track" status | No simple signal to guide behaviour |
| Task timing deviation alerts | Farmer is not told when they are late |
| Input cost vs budget view | Farmer cannot manage spending against loan |
| Crop-stage-linked nudges | No "it's time to fertilise" based on growth stage |
| Loan-linked financial planning | No "you need Rs X from harvest to repay Rs Y loan" |

### 4.3 Missing Banker Analytics

| What's Missing | Why It Matters |
|---------------|---------------|
| Entire banker dashboard | The primary value proposition to banks is missing |
| Early warning system | The "90-day advance warning" does not exist |
| Portfolio-level compliance view | Banker cannot segment farmers by risk |
| Cost deviation alerts | Cannot detect loan fund diversion |
| Predictive NPA scoring | No statistical model linking behaviour to default |

### 4.4 Missing Behavioural Nudging

The system has SAGE (advisory engine) but it broadcasts generic advisories. It does NOT:
- Tie advisories to the farmer's specific PoP schedule
- Alert based on missed tasks or late activities
- Compare the farmer's actual spending to their budget
- Generate "you are off track" warnings based on behaviour

### 4.5 Missing Financial Linkage

The system does NOT connect:
- Loan amount to expected farm expenditure plan
- Farm activity tracking to loan utilisation verification
- Harvest revenue to repayment capacity estimation
- PoP compliance to credit risk assessment

---

## 5. Critical Findings

### Question 1: Does FarmerPay track farmer activities vs PoP?

**Partial.** ROOTS records what the farmer did (tasks, inputs, labour). PoP templates define what the farmer should do (timing, inputs, costs). But there is NO comparison logic. The two data sets exist in isolation. No compliance score is computed.

### Question 2: Does it compare actual vs expected spending?

**No.** CultivationCyclePlanning has budgets. CultivationCycleExpenseSummary has actuals. CultivationCycleProfitability has a variance field. But the getCycleSummary API simply returns these side-by-side without computing deviation alerts, on-track/off-track status, or budget utilisation percentages.

### Question 3: Does it provide "on-track / off-track" signals?

**No.** This feature does not exist anywhere in the codebase.

### Question 4: Are analytics farmer-facing, banker-facing, or backend-only?

**Farmer-facing (partial).** PULSE market intelligence is well-built and farmer-facing. SAGE advisories are farmer-facing but generic. ROOTS data is captured but returned as raw data, not insights. There are ZERO banker-facing analytics.

### Question 5: Is the system advisory-only or behaviour-enforcing?

**Advisory-only.** SAGE sends advisories. The farmer can ignore them. There is no feedback loop measuring whether the farmer acted on advice. The `action_taken_by_farmer` field exists in the SageAdvisory model but is never populated by any business logic.

### Question 6: Can this system realistically reduce NPA?

**Not in its current state.** The system can collect good data. But data collection alone does not reduce NPAs. NPA reduction requires:
1. Turning data into actionable insights (missing)
2. Delivering those insights to farmers as behavioural nudges (missing)
3. Delivering risk signals to bankers for early intervention (missing)
4. Closing the loop: tracking whether interventions changed outcomes (missing)

---

## 6. Scores

| Dimension | Score (0-10) | Reason |
|----------|-------------|--------|
| Intent clarity | 9 | The proposal document clearly articulates the NPA reduction mission and behavioural change strategy |
| Data capture depth | 8 | ROOTS captures granular task, input, labour, and cost data. PoP templates define expectations. Harvest and sale tracking exists |
| Farmer analytics depth | 4 | PULSE market intelligence is strong. But no PoP compliance view, no on-track/off-track, no cost-vs-budget, no behavioural nudges |
| Banker analytics depth | 0 | Zero banker-facing analytics, dashboards, or early warning system. The primary deliverable to banks does not exist |
| Behavioural nudging strength | 2 | SAGE sends generic advisories. No PoP-linked nudges, no timing alerts, no spending alerts |
| NPA reduction capability | 2 | Data foundation exists but the analytics, nudging, and banker-alerting layers required for NPA reduction are absent |
| Implementation vs intent alignment | 3 | Strong data models but the intelligence layer connecting data to NPA prevention is not built |

---

## 7. Required Design Changes

### 7.1 What Must Be Added for Farmers

#### A. PoP Compliance Dashboard (Priority: P0)

Build a farmer-facing view showing:
- Current crop stage (based on days from sowing)
- Tasks completed vs tasks expected (progress bar)
- Compliance percentage: "You have completed 7 of 10 tasks for this stage"
- Next required action with deadline: "Apply DAP fertiliser by October 15"
- Colour-coded status: Green (on-track), Yellow (at risk), Red (off-track)

**Implementation:** Create `PopComplianceService` that:
1. Reads PoP template (PopWorkband, PopTask, PopTaskInput)
2. Reads actual execution (WorkbandExecution, TaskExecution, TaskExecutionInputLog)
3. Computes timing deviation, input compliance, task completion
4. Returns a compliance score (0-100) and status (on_track/at_risk/off_track)

#### B. Cost vs Budget Tracker (Priority: P0)

Build a farmer-facing view showing:
- Total budget (from CultivationCyclePlanning): "Your input budget is Rs 15,000"
- Spent so far (from CultivationCycleExpenseSummary): "You have spent Rs 9,200"
- Remaining: "Rs 5,800 remaining for this season"
- Category breakdown: inputs, labour, machinery
- Alert if overspending: "You have exceeded your input budget by 20%"

#### C. Behavioural Nudge Engine (Priority: P1)

Extend SAGE to generate PoP-linked nudges:
- Trigger: Task due date approaching but not marked complete
- Message: "Weeding is due this week (Stage 3). Complete it to stay on track."
- Trigger: Input cost exceeds budget category by 20%+
- Message: "Your input spending is Rs 3,000 over budget. Review your purchases."
- Trigger: Harvest window approaching based on sowing date + crop duration
- Message: "Your wheat is expected to mature in 15 days. Start preparing for harvest."

#### D. Loan Repayment Planner (Priority: P1)

Show farmer:
- "Your loan is Rs 50,000"
- "Expected harvest value (from PULSE): Rs 75,000"
- "Expected costs remaining: Rs 8,000"
- "Expected net income: Rs 67,000"
- "Repayment capacity: Rs 50,000 (sufficient)"

### 7.2 What Must Be Added for Bankers

#### A. Banker Risk Dashboard (Priority: P0)

This is the most critical missing piece. Build:

**Portfolio Summary View:**
- Total farmers in portfolio: 200
- On-track: 145 (72.5%)
- At risk: 35 (17.5%)
- Off-track: 20 (10%)
- Average PoP compliance: 78%
- Average cost deviation: +12%

**Farmer-Level Detail:**
- Farmer name, crop, sowing date, current stage
- PoP compliance score (0-100)
- Cost deviation (% over/under budget)
- TRUST score + PULSE forecast
- Risk classification: Low / Medium / High / Critical
- Last activity date (engagement indicator)

**Early Warning System:**
- Flag farmers who have:
  - Skipped 2+ consecutive PoP tasks
  - Exceeded budget by 30%+
  - Not logged any activity for 14+ days
  - Crop health reported as "poor"
  - PULSE forecast shows price decline for their crop
- Each warning linked to recommended intervention

#### B. Predictive NPA Model (Priority: P1)

Build a scoring model that combines:
- PoP compliance score (40% weight)
- Cost deviation (20% weight)
- TRUST credit score (15% weight)
- PULSE price trajectory (15% weight)
- Engagement frequency (10% weight)

Output: "NPA probability: 15% — Medium Risk"

### 7.3 What Must Be Redesigned

#### A. TRUST Score Engine

Current: Survey-based questionnaire with self-reported answers.
Required: Behavioural score incorporating actual farm execution data.

Add signals:
- PoP compliance percentage from ROOTS (signal weight: 15%)
- Cost deviation from budget (signal weight: 10%)
- Activity engagement frequency (signal weight: 5%)
- Historical repayment behaviour (signal weight: 10%)

These should replace some of the self-reported survey questions with verified behavioural data.

#### B. SAGE Advisory Engine

Current: Generic weather and pest advisories broadcast to all farmers.
Required: Personalised, PoP-linked, crop-stage-specific advisories.

Redesign to:
1. Check farmer's current crop stage (days from sowing)
2. Check upcoming PoP tasks from their template
3. Check which tasks are overdue or approaching
4. Generate personalised advisory: "Based on your wheat crop (Day 45), apply first irrigation this week per your PoP schedule."

#### C. CHOICE Module

Current: Stub (1 file, no implementation).
Required: Full intermediary management system.

The proposal promises 20-30 trained intermediaries per bank. This module should track:
- Intermediary assignments
- Field visit logs
- Farmer engagement records
- Performance metrics (farmers onboarded, compliance rate of assigned farmers)

---

## 8. Final Verdict

### ⚠️ Partially aligned — Major gaps exist

**The data foundation is solid.** ROOTS captures granular farm execution data. PoP templates define expectations. PULSE provides market intelligence. SAGE has an advisory framework. TRUST has a scoring engine.

**But the intelligence layer is missing.** The platform collects data like a farm ERP but does not analyse it for the specific purpose it was built for: NPA prevention through behavioural nudging and banker alerting.

**The banker deliverable — the primary value proposition — does not exist.** Zero banker-facing analytics. No dashboard. No early warning system. No portfolio compliance view. This is the most critical gap.

**The farmer experience is data-entry, not insight-driven.** Farmers log activities but receive no feedback on whether they are doing well. The "on-track / off-track" signal that would drive behaviour change is absent.

**Bottom line:** FarmerPay has built a good data collection engine and a strong market intelligence module (PULSE). But it has not yet built the analytics and nudging layer that transforms this data into NPA reduction. The proposal promises "Repayment as a Service" — the implementation delivers "Data Collection as a Service."

**To fulfil the stated intent, two things must be built urgently:**
1. **PoP Compliance Engine** — compare actual farm execution to expected, compute compliance score, generate deviation alerts
2. **Banker Risk Dashboard** — surface farmer-level compliance, cost deviations, and early warning signals to lending officers

Without these, the platform cannot deliver on its core promise to partner banks.

---

*This assessment is based on analysis of the FarmerPay proposal document (November 2025) and the actual codebase on branch feature/phase6-sage-pulse.*
