# ROOTS ERP — System Design & Claude Code Implementation Prompts

> **Date:** 2026-04-16
> **Scope:** Complete implementation guide with executable Claude Code prompts
> **Reference:** ROOTS-ERP-BRAINSTORM.md

---

## Table of Contents

1. [System Architecture Overview](#1-system-architecture-overview)
2. [What Exists vs. What's New](#2-what-exists-vs-whats-new)
3. [Implementation Phases](#3-implementation-phases)
4. [Phase 1 Prompts — Core Variance Engine & Backend](#4-phase-1-prompts)
5. [Phase 2 Prompts — Farmer App UX](#5-phase-2-prompts)
6. [Phase 3 Prompts — Integrations (Banker, Sathi, VYAPAR)](#6-phase-3-prompts)
7. [Phase 4 Prompts — Cross-Module Signals (TRUST, SENTINEL, SAGE, PULSE)](#7-phase-4-prompts)
8. [Phase 5 Prompts — Dedicated Poultry & Goatery Modules](#8-phase-5-prompts)
9. [Phase 6 Prompts — Dairy & Horticulture Enhancements](#9-phase-6-prompts)
10. [Prompt Execution Order & Dependencies](#10-prompt-execution-order)

---

## 1. System Architecture Overview

```
FARMER APP (React Native/Expo)
  ├── Season-Start Setup Wizard (NEW)
  ├── Soil Health Card OCR (NEW)
  ├── CMS Pattern Workband Entry (MODIFY existing cycle-detail.tsx)
  ├── "Am I on Track?" Dashboard (NEW)
  ├── Photo Evidence Capture (ENHANCE existing)
  └── Smart Push Notifications (NEW)

BACKEND (Node.js/Express)
  ├── ROOTS Variance Engine (NEW service layer)
  │   ├── Timing Comparator
  │   ├── Quantity Comparator
  │   ├── Cost Comparator
  │   ├── Practice Comparator
  │   └── Compliance Scorer
  ├── Soil Health Card Service (NEW)
  ├── Soil-Adjusted PoP Modifier (NEW)
  ├── Missed Step Detector Job (NEW cron)
  ├── ROOTS Compliance Event Emitter (NEW)
  ├── Poultry Module (NEW — dedicated backend)
  ├── Goatery Module (NEW — dedicated backend)
  ├── Dairy PoP Engine (NEW service)
  ├── Horticulture Perennial Lifecycle (ENHANCE)
  └── VYAPAR-ROOTS Bridge Service (NEW)

DASHBOARDS
  ├── Banker: Portfolio ROOTS Compliance (NEW pages)
  ├── Banker: Farmer ROOTS Timeline (NEW panel)
  ├── Banker: Loan Utilization Quality (NEW section)
  ├── Sathi: ROOTS Verification Mode (NEW pages)
  └── Sathi: ROOTS KPI Panel (ENHANCE)

INTEGRATIONS (event-driven via RabbitMQ)
  ├── ROOTS → TRUST (compliance signals)
  ├── ROOTS → SENTINEL (red flags, EWS)
  ├── ROOTS → SAGE (variance-based advisories)
  ├── ROOTS → PULSE (cost-of-production baseline)
  ├── VYAPAR → ROOTS (auto cost capture)
  └── ROOTS → BANKER (compliance snapshots)
```

---

## 2. What Exists vs. What's New

### EXISTING (Reuse as-is or enhance)

| Component | Path | Status |
|-----------|------|--------|
| Crop PoP → Workband → Task → Execution stack | `src/modules/roots/crop/` | 52 models, mature |
| Dairy V2 logbook (cost/revenue/breeding/treatment) | `src/modules/roots/dairy/` | 22 models, mature |
| Fishery V2 logbook | `src/modules/roots/fishery/` | 20 models, mature |
| Horticulture basic orchards | `src/modules/roots/horticulture/` | 8 models, basic |
| PoP framework (goatery/poultry touchpoints) | `src/modules/pop/` | 3 models, generic |
| Farmer activity subscriptions | `src/modules/farmer/` | Working |
| Trust evidence collector (already reads ROOTS) | `src/modules/trust/services/evidenceCollector.js` | Working |
| Sentinel health scoring (has `zero_agri_activity`) | `src/modules/sentinel/services/healthScoringService.js` | Working |
| Banker analytics (has `rootsActivityAnalytics()`) | `src/modules/banker/services/bankerAnalyticsService.js` | Working |
| Sathi tasks & verification models | `src/modules/sathi/` | 10+ models |
| VYAPAR transactions & product catalog | `src/modules/vyapar/` | Working |
| SAGE advisory engine | `src/modules/sage/` | Working |
| PopComplianceSnapshot model | `src/modules/roots/crop/models/` | Exists |
| SoilHealthRecord model | `src/modules/roots/crop/models/` | Exists |
| TaskExecutionPhoto model | `src/modules/roots/crop/models/` | Exists |
| Tesseract.js OCR | `farmer-app/lib/ocrService.ts` | Exists |
| cycle-detail.tsx (workband data entry) | `farmer-app/app/(tabs)/cycle-detail.tsx` | 37KB, working |
| Banker roots-activity page | `dashboard/src/app/dashboard/roots-activity/page.tsx` | Working |
| Sathi queue & farmer pages | `dashboard-sathi/src/app/dashboard/` | Working |
| Scheduled jobs infrastructure | `src/jobs/` | 9 jobs running |
| RabbitMQ workers | `src/workers/` | 2 consumers |

### NEW (Must build)

| Component | Effort | Dependencies |
|-----------|--------|-------------|
| Variance computation service | Medium | Existing PoP + execution data |
| Soil-adjusted PoP modifier service | Medium | Existing SoilHealthRecord model |
| Compliance scoring service | Medium | Variance service |
| ROOTS compliance event emitter | Low | RabbitMQ (existing) |
| Missed step detector cron job | Low | Existing cycle + workband data |
| `roots_compliance_snapshots` table | Low | New migration |
| `roots_red_flags` table | Low | New migration |
| `roots_loan_utilization_tracking` table | Low | New migration |
| CMS pattern UI (modify cycle-detail.tsx) | Medium | Existing screen |
| Season-start setup wizard (farmer app) | Medium | Existing cycle creation flow |
| Soil Health Card OCR screen (farmer app) | Medium | Existing Tesseract.js |
| "Am I on Track?" dashboard (farmer app) | Medium | Variance service |
| Smart push notification job | Low | Existing notification workers |
| Banker compliance dashboard pages | Medium | Compliance snapshots |
| Sathi ROOTS verification mode | Medium | Existing task framework |
| VYAPAR-ROOTS bridge service | Medium | Existing VYAPAR events |
| Dedicated Poultry module | High | New module from scratch |
| Dedicated Goatery module | High | New module from scratch |
| Dairy PoP engine | Medium | Existing dairy V2 |
| Horticulture perennial lifecycle | Medium | Existing horti models |

---

## 3. Implementation Phases

```
Phase 1: Core Variance Engine & Database (Backend)     ← Foundation
Phase 2: Farmer App UX (Mobile)                        ← User-facing
Phase 3: Integrations (Banker, Sathi, VYAPAR)          ← Stakeholder views
Phase 4: Cross-Module Signals (TRUST, SENTINEL, SAGE)  ← Intelligence layer
Phase 5: Dedicated Poultry & Goatery Modules           ← New activity modules
Phase 6: Dairy & Horticulture Enhancements             ← Existing module upgrades
```

---

## 4. Phase 1 Prompts — Core Variance Engine & Backend

### PROMPT 1.1 — Database Migrations (New Tables)

```
PERSONA: You are a Senior Backend Engineer specializing in database design and Sequelize ORM. You write production-grade migrations with proper indexes, constraints, and rollback support.

CONTEXT:
You are working on the FarmerPay backend at /src. It is a Node.js 20 + Express 4 + MySQL 8 + Sequelize 6 project.
All tables use snake_case, have is_active boolean, created_at/updated_at timestamps.
External-facing IDs use UUID. Internal IDs are auto-increment integers.
Migration files go in /src/migrations/ with timestamp prefix format: YYYYMMDDHHMMSS-description.js
Sequelize CLI is used for migrations.

TASK:
Create 3 Sequelize migration files for new ROOTS ERP tables.

--- TABLE 1: roots_compliance_snapshots ---
Purpose: Stores per-activity compliance scores computed by the Variance Engine. Read by Banker dashboard, TRUST, and SENTINEL.

Columns:
- id: INT AUTO_INCREMENT PRIMARY KEY
- uuid: CHAR(36) NOT NULL UNIQUE
- farmer_id: INT NOT NULL (FK to farmers)
- activity_type: ENUM('CROP','DAIRY','FISHERY','HORTI','POULTRY','GOATERY') NOT NULL
- activity_reference_id: INT NOT NULL (cycle_id / herd_id / flock_id / orchard_id)
- overall_compliance_score: DECIMAL(5,2)
- timing_compliance_score: DECIMAL(5,2)
- quantity_compliance_score: DECIMAL(5,2)
- cost_compliance_score: DECIMAL(5,2)
- practice_compliance_score: DECIMAL(5,2)
- total_stages: INT DEFAULT 0
- completed_stages: INT DEFAULT 0
- missed_stages: INT DEFAULT 0
- delayed_stages: INT DEFAULT 0
- total_expected_cost: DECIMAL(12,2)
- total_actual_cost: DECIMAL(12,2)
- cost_variance_pct: DECIMAL(5,2)
- data_completeness_pct: DECIMAL(5,2)
- photo_evidence_count: INT DEFAULT 0
- sathi_verified: BOOLEAN DEFAULT FALSE
- soil_health_card_available: BOOLEAN DEFAULT FALSE
- snapshot_date: DATE NOT NULL
- season: VARCHAR(20) (e.g., 'kharif_2026')
- is_active: BOOLEAN DEFAULT TRUE
- created_at, updated_at: TIMESTAMP

Indexes: (farmer_id, activity_type, snapshot_date), (overall_compliance_score), (snapshot_date)

--- TABLE 2: roots_red_flags ---
Purpose: Triggered by variance engine when anomalies are detected. Consumed by banker dashboard and SENTINEL.

Columns:
- id: INT AUTO_INCREMENT PRIMARY KEY
- uuid: CHAR(36) NOT NULL UNIQUE
- farmer_id: INT NOT NULL
- loan_application_id: INT (nullable, FK to loan_applications)
- activity_type: ENUM('CROP','DAIRY','FISHERY','HORTI','POULTRY','GOATERY') NOT NULL
- activity_reference_id: INT NOT NULL
- flag_type: ENUM('NO_DATA_ENTRY','CRITICAL_STAGE_MISSED','COST_ANOMALY','YIELD_ANOMALY','PRACTICE_DEVIATION_SEVERE','LOAN_UTILIZATION_MISMATCH','BACKFILL_SUSPECTED','GPS_MISMATCH','SATHI_DISCREPANCY','DISTRESS_SIGNAL','MORTALITY_SPIKE','FEED_COST_SPIRAL') NOT NULL
- severity: ENUM('LOW','MEDIUM','HIGH','CRITICAL') NOT NULL
- description: TEXT
- evidence_json: JSON
- status: ENUM('OPEN','ACKNOWLEDGED','INVESTIGATING','RESOLVED','FALSE_POSITIVE') DEFAULT 'OPEN'
- acknowledged_by: INT (nullable)
- acknowledged_at: TIMESTAMP (nullable)
- resolution_notes: TEXT (nullable)
- is_active: BOOLEAN DEFAULT TRUE
- created_at, updated_at: TIMESTAMP

Indexes: (farmer_id, status), (severity, status), (loan_application_id)

--- TABLE 3: roots_loan_utilization_tracking ---
Purpose: Joins DICE loans with ROOTS activity to verify loan was used for farming.

Columns:
- id: INT AUTO_INCREMENT PRIMARY KEY
- uuid: CHAR(36) NOT NULL UNIQUE
- farmer_id: INT NOT NULL
- loan_application_id: INT NOT NULL (FK to loan_applications)
- cultivation_cycle_id: INT (nullable)
- loan_purpose: VARCHAR(100)
- sanctioned_amount: DECIMAL(12,2)
- disbursed_amount: DECIMAL(12,2)
- roots_total_input_cost: DECIMAL(12,2)
- vyapar_total_purchase: DECIMAL(12,2)
- total_verified_expenditure: DECIMAL(12,2)
- utilization_ratio: DECIMAL(5,2)
- utilization_quality: ENUM('GOOD','PARTIAL','POOR','SUSPICIOUS') NOT NULL
- assessment_date: DATE
- is_active: BOOLEAN DEFAULT TRUE
- created_at, updated_at: TIMESTAMP

Indexes: (farmer_id, loan_application_id), (utilization_quality)

CONVENTIONS:
- Use queryInterface.createTable() in up(), queryInterface.dropTable() in down()
- All ENUMs are MySQL ENUM type
- Add FOREIGN KEY constraints where applicable but use allowNull: true for optional FKs
- Follow existing migration patterns in /src/migrations/
```

---

### PROMPT 1.2 — Sequelize Models for New Tables

```
PERSONA: You are a Senior Backend Engineer specializing in Node.js ORM patterns. You write clean Sequelize models with proper associations, scopes, and instance methods following established project conventions.

CONTEXT:
You are working on the FarmerPay backend. Sequelize 6 with MySQL 8.
All models use: ModelName.init({...}, { sequelize, modelName, tableName, timestamps: true, underscored: true })
Associations go in static associate(models) {} method.
Models are organized by module. Place these in: src/modules/roots/crop/models/

EXISTING MODELS TO REFERENCE for pattern:
- src/modules/roots/crop/models/PopComplianceSnapshot.js (similar pattern)
- src/modules/roots/crop/models/CultivationCycle.js (for association patterns)

TASK:
Create 3 Sequelize model files:

1. RootsComplianceSnapshot.js
   - Table: roots_compliance_snapshots (from migration 1.1)
   - Associations: belongsTo Farmer (farmer_id)
   - Add instance method: isHighCompliance() → overall_compliance_score > 80
   - Add scope: byFarmer(farmerId), byActivity(type), activeInSeason(season)

2. RootsRedFlag.js
   - Table: roots_red_flags (from migration 1.1)
   - Associations: belongsTo Farmer, belongsTo LoanApplication (optional)
   - Add scope: open(), bySeverity(level), byFarmer(farmerId)

3. RootsLoanUtilizationTracking.js
   - Table: roots_loan_utilization_tracking (from migration 1.1)
   - Associations: belongsTo Farmer, belongsTo LoanApplication, belongsTo CultivationCycle (optional)
   - Add instance method: isAdequate() → utilization_ratio >= 0.4

CONVENTIONS:
- Use lazy-load pattern: let db; const getDb = () => { if (!db) db = require('../../../../shared/models'); return db; };
- Export model from shared/models/index.js (add to the model registry)
- All field names in model definition are snake_case (Sequelize underscored: true handles mapping)
- Add appropriate defaultValue for ENUM fields
```

---

### PROMPT 1.3 — Variance Computation Service (Core Engine)

```
PERSONA: You are a Senior Backend Engineer and domain expert in agricultural data systems. You build computation-heavy services with clean separation of concerns, precise numerical algorithms, and comprehensive edge-case handling. This is the most critical service in the ROOTS ERP — every other module depends on it.

CONTEXT:
You are working on the FarmerPay backend. This is the CORE service that everything else depends on.
Path: src/modules/roots/crop/services/varianceService.js (NEW file)

EXISTING CODE TO READ FIRST:
- src/modules/roots/crop/services/executionService.js — has getCycleWorkbands() that returns enriched workband DTOs joining 6 levels: WorkbandExecution → PopWorkband, TaskExecution → PopTask → PopTaskInput → InputItem + InputUnit
- src/modules/roots/crop/services/popComplianceService.js — has basic compliance tracking, build on top of this
- src/modules/roots/crop/models/PopWorkband.js — has days_from_sowing_start, days_from_sowing_end fields
- src/modules/roots/crop/models/PopTaskInput.js — has recommended_qty, input_item_id fields
- src/modules/roots/crop/models/PopCostBenchmark.js — has expected_cost_per_acre
- src/modules/roots/crop/models/WorkbandExecution.js — has start_date, end_date, status
- src/modules/roots/crop/models/TaskExecution.js — has start_date, completion_percentage
- src/modules/roots/crop/models/TaskExecutionInputLog.js — has quantity_used, cost, input_item_id
- src/modules/roots/crop/models/SoilHealthRecord.js — has extracted_values (JSON), field_id
- src/modules/roots/crop/models/CultivationCycle.js — has sowing_date, farmer_id, field_id

TASK:
Create varianceService.js with these methods:

1. computeTimingVariance(workbandExecution, popWorkband, sowingDate)
   - Calculate: window_start = sowingDate + pop.days_from_sowing_start
   - Calculate: window_end = sowingDate + pop.days_from_sowing_end
   - If no execution and today > window_end + 14 → MISSED (score: 0)
   - If within window → ON_TIME (score: 100)
   - If 1-7 days off → SLIGHT (score: 75)
   - If 8-14 days off → MODERATE (score: 40)
   - If >14 days off → SEVERE (score: 10)
   - Return: { type: 'timing', classification, score, days_off, direction: 'early'|'late'|'on_time'|'missed' }

2. computeQuantityVariance(taskExecutionInputLogs, popTaskInputs)
   - For each expected input: variance_pct = (actual - recommended) / recommended * 100
   - Classify: 0-10% → COMPLIANT (100), 10-25% → MILD (75), 25-50% → MODERATE (40), >50% → SEVERE (10)
   - Handle missing data (no entry) → MISSING (score: 0, but lower weight)
   - Return: array of { type: 'quantity', input_name, variance_pct, classification, score }

3. computeCostVariance(actualCosts, popCostBenchmark, areaAcres)
   - benchmark = popCostBenchmark.expected_cost_per_acre * areaAcres
   - variance_pct = (actual - benchmark) / benchmark * 100
   - Same classification bands as quantity
   - Return: { type: 'cost', variance_pct, classification, score, actual, benchmark }

4. computePracticeVariance(taskExecutions, popTasks)
   - For each expected task: check if executed, partially executed, skipped, or missed
   - Check input substitution: actual input_item_id != expected input_item_id
   - Return: array of { type: 'practice', task_name, status: 'COMPLIANT'|'SUBSTITUTED'|'PARTIAL'|'SKIPPED'|'MISSED', score }

5. computeWorkbandScore(timingVar, quantityVars, costVar, practiceVars)
   - Weighted: timing 30% + quantity 25% + cost 15% + practice 30%
   - Return: { workband_score, timing_score, quantity_score, cost_score, practice_score }

6. computeCycleComplianceScore(cycleId)
   - THE MAIN METHOD. Fetches all data for a cycle, computes all variances, rolls up.
   - Workband weights: CRITICAL (sowing, fertilization, harvest) = 3, IMPORTANT (pest, irrigation) = 2, STANDARD (weeding, thinning) = 1
   - Compute data_completeness_pct
   - Apply confidence adjustment: >80% complete → full, 60-80% → ×0.8, 40-60% → ×0.6, <40% → don't score
   - Upsert result into roots_compliance_snapshots table
   - Return: full compliance object

7. applySoilAdjustment(popTaskInputs, soilHealthRecord)
   - If soil data exists for the field, adjust recommended quantities:
     - N low (<250 kg/ha) → +20% nitrogen fertilizer
     - N high (>500) → -15% nitrogen
     - P low (<11) → +25% phosphatic
     - K high (>280) → -15% potassic
     - pH acidic (<5.5) → add lime recommendation
     - pH alkaline (>8.5) → add gypsum recommendation
     - Low OC (<0.5%) → increase FYM recommendation
     - Zinc deficient → add ZnSO4
   - Return: adjusted popTaskInputs array

CONVENTIONS:
- Use lazy-load pattern for DB: let db; const getDb = () => { ... }
- Use transactions for multi-table writes
- Map snake_case DB fields → camelCase in returned DTOs
- Log with shared/utils/logger
- Use generateUUID from shared/utils/uuidHelper for new records
- All score values are 0-100
```

---

### PROMPT 1.4 — Red Flag Detection Service

```
PERSONA: You are a Senior Backend Engineer with expertise in anomaly detection and risk signal systems. You build pattern-matching services that detect data anomalies, fraud indicators, and operational red flags with configurable thresholds and clear evidence trails.

CONTEXT:
FarmerPay backend, Node.js + Sequelize. 
Path: src/modules/roots/crop/services/redFlagService.js (NEW file)

DEPENDS ON:
- varianceService.js (Prompt 1.3) — for compliance scores
- RootsRedFlag model (Prompt 1.2)
- RootsComplianceSnapshot model (Prompt 1.2)
- Existing: CultivationCycle, WorkbandExecution, TaskExecution, TaskExecutionInputLog models

TASK:
Create redFlagService.js with these detection methods. Each method checks for a specific anomaly pattern and creates a RootsRedFlag record if detected.

1. detectNoDataEntry(farmerId, activityType, activityRefId)
   - Check: no WorkbandExecution or TaskExecution entries for 30+ days on an active cycle
   - Flag type: NO_DATA_ENTRY, severity: HIGH (30-45 days) or CRITICAL (>45 days)
   - Evidence JSON: { last_entry_date, days_since_last, cycle_status, loan_linked: boolean }

2. detectCriticalStageMissed(cycleId)
   - Check: sowing, basal fertilization, or harvest workband window closed with no execution
   - Flag type: CRITICAL_STAGE_MISSED, severity: HIGH
   - Evidence JSON: { stage_name, window_start, window_end, days_overdue }

3. detectCostAnomaly(cycleId)
   - Check: total actual cost >150% or <30% of benchmark for completed stages
   - Flag type: COST_ANOMALY, severity: MEDIUM (150-200%) or HIGH (>200% or <30%)
   - Evidence JSON: { actual_cost, expected_cost, variance_pct, stage_breakdown }

4. detectYieldAnomaly(cycleId, harvestRecordId)
   - Check: reported yield >2 standard deviations above district average for crop/variety
   - Needs: district yield averages (can compute from existing harvest records)
   - Flag type: YIELD_ANOMALY, severity: MEDIUM
   - Evidence JSON: { claimed_yield, district_avg, std_dev, z_score }

5. detectBackfillPattern(farmerId, cycleId)
   - Check: 3+ workband executions created on the same calendar day for past stages
   - Flag type: BACKFILL_SUSPECTED, severity: MEDIUM
   - Evidence JSON: { entries_on_same_day, stages_affected, entry_date }

6. detectLoanUtilizationMismatch(farmerId, loanApplicationId)
   - Check: loan disbursed 30+ days ago but ROOTS + VYAPAR verified expenditure <20% of loan amount
   - Flag type: LOAN_UTILIZATION_MISMATCH, severity: HIGH
   - Evidence JSON: { loan_amount, disbursed_date, roots_cost, vyapar_cost, utilization_pct }
   - Upsert into roots_loan_utilization_tracking table

7. runAllDetections(farmerId)
   - Run all applicable detections for a farmer's active activities
   - Deduplicate: don't create duplicate flags (check existing open flags)
   - Return: array of newly created flags

CONVENTIONS:
- Lazy-load DB pattern
- Use transactions
- Emit RabbitMQ event 'roots_red_flag_created' after creating a flag (for SENTINEL and banker notification)
- Use existing logger
```

---

### PROMPT 1.5 — Missed Step Detector Cron Job

```
PERSONA: You are a Backend Engineer specializing in batch processing and scheduled jobs. You write reliable cron jobs that process large datasets in batches, handle failures gracefully per-record, and integrate with notification and event systems.

CONTEXT:
FarmerPay backend. Scheduled jobs are in src/jobs/.
Existing jobs pattern: export async function, called by node-cron in src/app.js or src/scheduler.js.
See existing: src/jobs/cropAdvisoryJob.js for the pattern.

TASK:
Create src/jobs/rootsMissedStepDetectorJob.js

Purpose: Daily cron (run at 6 AM IST) that:
1. Finds all active CultivationCycles (status = 'ACTIVE')
2. For each cycle, calculates current_day = today - sowing_date
3. Fetches PopWorkbands for the cycle's PoP
4. For each workband where window has closed (current_day > days_from_sowing_end + 7):
   - Check if WorkbandExecution exists
   - If NO execution exists:
     a. Call redFlagService.detectCriticalStageMissed(cycleId) for critical stages
     b. Call varianceService to update compliance score
     c. Generate SAGE advisory: "You may have missed [workband_name]. Here's what to do now."
        Use existing: src/modules/sage/services/sageService.js to create advisory
     d. Send push notification to farmer using existing notification worker
        Publish to RabbitMQ queue: 'notification_push' with payload { farmerId, title, body, data: { screen: 'cycle-detail', cycleId } }
     e. If farmer has assigned Sathi, create SathiTask for follow-up

Register this job in the scheduler alongside existing jobs.

CONVENTIONS:
- Batch process: fetch in pages of 100 cycles
- Use logger for progress: "Processing batch X of Y"
- Handle errors per-cycle (don't let one cycle failure stop the batch)
- Track metrics: { cyclesChecked, missedStepsFound, advisoriesGenerated, notificationsSent }
```

---

### PROMPT 1.6 — ROOTS Compliance Event Emitter

```
PERSONA: You are a Backend Engineer specializing in event-driven architecture and message queues. You design reliable RabbitMQ event producers with proper exchange topology, routing keys, and integration hooks into existing service flows.

CONTEXT:
FarmerPay backend. RabbitMQ is used for async events.
Existing pattern: src/workers/auditConsumer.js for consuming. Publishing uses src/config/rabbitmq.js.

TASK:
Create src/modules/roots/crop/services/complianceEventEmitter.js

Purpose: After any workband execution, task execution, or compliance score update, emit events to RabbitMQ so that TRUST, SENTINEL, and BANKER modules can react.

Methods:

1. emitComplianceUpdate(farmerId, activityType, activityRefId, complianceSnapshot)
   - Publish to exchange: 'roots_events', routing key: 'compliance.updated'
   - Payload: { farmerId, activityType, activityRefId, overallScore, timingScore, quantityScore, costScore, practiceScore, dataCompleteness, snapshotDate, season }

2. emitRedFlagCreated(redFlag)
   - Publish to exchange: 'roots_events', routing key: 'redflag.created'
   - Payload: { flagId, farmerId, flagType, severity, description, loanApplicationId }

3. emitStageCompleted(farmerId, cycleId, workbandName, stageScore)
   - Publish to exchange: 'roots_events', routing key: 'stage.completed'
   - Payload: { farmerId, cycleId, workbandName, stageScore, completedAt }

4. emitStageMissed(farmerId, cycleId, workbandName)
   - Publish to exchange: 'roots_events', routing key: 'stage.missed'
   - Payload: { farmerId, cycleId, workbandName, windowEnd, missedAt }

Integration points — call these emitters from:
- executionService.js: after workband/task execution → emitStageCompleted + emitComplianceUpdate
- varianceService.computeCycleComplianceScore(): after score update → emitComplianceUpdate
- redFlagService: after creating flag → emitRedFlagCreated
- rootsMissedStepDetectorJob: after detecting miss → emitStageMissed

Modify the existing executionService.js to call these emitters at the right points.
Read executionService.js first to understand the execution flow, then add the emitter calls.

CONVENTIONS:
- Use existing RabbitMQ connection from config/rabbitmq.js
- Use assertExchange with type 'topic' for routing
- Include timestamp and correlationId in message properties
- JSON serialize payloads
```

---

## 5. Phase 2 Prompts — Farmer App UX

### PROMPT 2.1 — Soil Health Card OCR Service (Backend)

```
PERSONA: You are a Backend Engineer with expertise in OCR data processing and validation pipelines. You build services that parse unstructured OCR output into structured domain objects, validate with range checks and cross-field consistency, and expose clean REST APIs for mobile clients.

CONTEXT:
FarmerPay backend. The farmer app already has Tesseract.js (lib/ocrService.ts).
However, the heavy OCR processing and validation should happen on the backend.
Path: src/modules/roots/crop/services/soilHealthCardService.js (NEW file)

EXISTING TO READ:
- src/modules/roots/crop/models/SoilHealthRecord.js — already exists, has field_id linkage
- Check its current columns and add any missing ones via a migration if needed

TASK:
Create soilHealthCardService.js with methods:

1. processOcrResult(farmerId, fieldId, ocrText, imageUrl)
   - Parse OCR text to extract structured soil parameters:
     - Nitrogen (N) in kg/ha
     - Phosphorus (P) in kg/ha
     - Potassium (K) in kg/ha
     - pH value
     - Electrical Conductivity (EC) in dS/m
     - Organic Carbon (OC) in %
     - Secondary: Sulphur (S)
     - Micro: Zinc (Zn), Iron (Fe), Manganese (Mn), Copper (Cu), Boron (B) in ppm
     - Soil type if mentioned
     - Card ID / Sample Number
     - Date of testing
   - Use regex patterns to find labeled values in OCR output
   - Return: { extractedValues: {}, confidenceScores: {} }

2. validateExtractedValues(extractedValues)
   - Range checks:
     - N: 50-600 kg/ha plausible
     - P: 1-100 kg/ha plausible
     - K: 50-800 kg/ha plausible
     - pH: 3.5-10.5 plausible
     - OC: 0.05-5.0% plausible
     - EC: 0.01-10.0 dS/m plausible
   - Cross-field consistency: pH 4.0 + high calcium = likely error
   - Return: { isValid, errors: [], warnings: [] }

3. classifyParameters(extractedValues)
   - Classify each parameter:
     - N: Low (<250), Medium (250-500), High (>500) kg/ha
     - P: Low (<11), Medium (11-25), High (>25) kg/ha
     - K: Low (<110), Medium (110-280), High (>280) kg/ha
     - pH: Acidic (<6.5), Neutral (6.5-7.5), Alkaline (>7.5)
     - OC: Low (<0.5), Medium (0.5-0.75), High (>0.75) %
   - Return: { classifications: { n_status: 'LOW', p_status: 'MEDIUM', ... } }

4. saveSoilHealthRecord(farmerId, fieldId, extractedValues, classifications, imageUrl, confidenceScores)
   - Upsert into SoilHealthRecord (one per field, update if re-captured)
   - Set valid_until = card_date + 3 years
   - Return: saved record

5. getSoilAdjustedRecommendations(fieldId, popTaskInputs)
   - Fetch SoilHealthRecord for field
   - If exists, apply adjustments (same logic as varianceService.applySoilAdjustment)
   - Return: { adjusted: true/false, adjustments: [], adjustedInputs: [] }

Also create API endpoints:
- POST /api/v1/roots/soil-health — Upload OCR result + image, returns extracted & classified values
- GET /api/v1/roots/fields/:fieldId/soil-health — Get soil health for a field
- PUT /api/v1/roots/soil-health/:recordId/verify — Farmer confirms/edits extracted values

Add routes to existing executionRoutes.js or create soilHealthRoutes.js.
Add Joi validators for all endpoints.
```

---

### PROMPT 2.2 — Season-Start Setup Wizard (Farmer App)

```
PERSONA: You are a Senior Mobile Frontend Engineer specializing in React Native and Expo. You build accessible, offline-capable multi-step wizards for low-literacy rural users in India. You prioritize large touch targets, bilingual UI (Hindi/English), and graceful degradation on low-end Android devices.

CONTEXT:
FarmerPay farmer app: React Native 0.81, Expo 54, Expo Router 6, Hermes engine.
Path: farmer-app/app/(tabs)/
NOT Next.js. Uses Expo Router file-based routing. Ignore "use client" warnings.
API client: farmer-app/lib/api.ts (REST client with auth headers)

EXISTING TO READ FIRST:
- farmer-app/app/(tabs)/onboarding-crops.tsx — current crop onboarding flow
- farmer-app/app/(tabs)/onboarding-variety.tsx — variety selection
- farmer-app/app/(tabs)/cycle-detail.tsx — current workband execution entry (37KB)
- farmer-app/lib/ocrService.ts — existing Tesseract.js OCR service
- farmer-app/lib/api.ts — REST client pattern

TASK:
Create farmer-app/app/(tabs)/setup-season.tsx — a 4-step wizard:

Step 1: Crop Selection
- Show farmer's existing activity subscriptions (from GET /api/v1/farmer/activity-subscriptions)
- Let them pick crop + variety from existing dropdowns
- If new crop, allow adding via search
- Pre-fill from last season's cycle if available

Step 2: Field Selection  
- Show farmer's registered fields (from GET /api/v1/roots/fields?farmerId=X)
- Allow selecting existing field or registering new one
- Show field area in acres (existing FieldAreaAcres component)

Step 3: Soil Health Card (NEW — most important new screen)
- Show value proposition: "A Soil Health Card helps us give you EXACT fertilizer recommendations for YOUR field"
- Camera button: "Take Photo of Soil Health Card"
- On photo capture:
  - Run Tesseract.js OCR locally for quick preview
  - Upload image to backend: POST /api/v1/roots/soil-health
  - Show extracted values with color-coded indicators (Red=Low, Green=Good, Yellow=Deficient)
  - Show what it means: "Your soil is low in Nitrogen — we'll recommend 20% more urea"
  - Editable fields for farmer to correct OCR errors
  - "Looks correct ✅" / "Edit values ✏️" buttons
- If farmer has existing SHC for this field: show "Using your soil data from [date]. Update? [Keep / New Photo]"
- Skip option: "Don't have one? [Skip for now]" with info about where to get one

Step 4: Confirm & Start
- Summary: Crop, Variety, Field (area), Soil adjustments applied
- "Start Season" button
- POST /api/v1/roots/cycles — creates CultivationCycle with PoP auto-attached
- If soil data captured, PoP recommendations are soil-adjusted
- Navigate to cycle-detail.tsx for the new cycle

DESIGN:
- Large touch targets (48px minimum)
- Hindi/English bilingual labels
- Progress indicator (dots: ● ● ○ ○)
- Each step is a scrollable card, not a new screen navigation
- Offline-capable: queue API calls if no network
- Use existing color scheme from the app (check app/_layout.tsx for theme)
```

---

### PROMPT 2.3 — CMS Pattern for Workband Execution (Modify cycle-detail.tsx)

```
PERSONA: You are a Senior Mobile Frontend Engineer specializing in React Native UX refactors. You modify large existing screens without breaking functionality, adding new interaction patterns (Confirm/Modify/Skip) while preserving offline support, backward compatibility, and existing data flows. You read the full file before making changes.

CONTEXT:
FarmerPay farmer app. The cycle-detail.tsx screen is the primary workband data entry screen (37KB).
Path: farmer-app/app/(tabs)/cycle-detail.tsx

READ THIS FILE FIRST. It's large (37KB). Understand the current flow:
- It fetches workbands via GET /roots/cycles/:cycleId/workbands
- Shows workband list with expansion for task details
- Has input logging forms for task execution

TASK:
Modify cycle-detail.tsx to implement the CMS (Confirm/Modify/Skip) pattern.

CURRENT: Blank forms where farmer enters all data from scratch.
NEW: Pre-filled forms with 3 action buttons per workband stage.

For each workband that is in its active window (or overdue):

Show a card with:
┌─────────────────────────────────────────┐
│  🌾 [Stage Name]: [Workband Name]       │
│                                          │
│  Recommended: [PoP recommendation text]  │
│  Estimated cost: ₹[benchmark]/acre       │
│                                          │
│  If soil-adjusted, show:                 │
│  "Adjusted for your soil: [adjustment]"  │
│                                          │
│  ┌────────┐ ┌─────────┐ ┌─────────┐    │
│  │ ✅ Done │ │ ✏️ Changed│ │ ⏭️ Skipped│  │
│  └────────┘ └─────────┘ └─────────┘    │
│                                          │
│  📷 Add photo (optional)                 │
└─────────────────────────────────────────┘

Button behaviors:

"✅ Done" (1 tap):
- Auto-creates WorkbandExecution with start_date = today
- Auto-creates TaskExecution for each PopTask with recommended values as actuals
- Copies PopTaskInput recommended quantities as actual quantities used
- Copies PopCostBenchmark as actual cost
- Sets completionPercentage = 100
- Calls POST /roots/workbands/:wbId/execute + POST /roots/tasks/:taskId/execute for each task
- Show brief success animation, move to next stage

"✏️ Changed" (edit mode):
- Expand to show pre-filled editable fields:
  - Input type (dropdown, pre-selected from PoP)
  - Quantity (numeric, pre-filled with recommended, editable)
  - Cost (numeric, pre-filled with benchmark, editable)
  - Date (calendar, default today)
- Only changed fields are sent to API
- "Save" button submits

"⏭️ Skipped":
- Show optional reason picker: [Cost] [Weather] [Not needed] [Forgot] [Other]
- Creates execution with status = SKIPPED, completionPercentage = 0
- Logs skip reason in notes field

Camera button on all three:
- Opens camera (use existing expo-camera setup)
- Captures GPS coordinates
- Uploads via POST with taskExecutionId linkage
- Shows thumbnail after capture

Visual states for completed stages:
- ✅ Green checkmark for on-time completion
- 🟡 Amber for late completion
- 🔴 Red for missed stages
- ⏭️ Grey for skipped

Keep existing cycle summary, harvest, and sale sections intact.
Add: Compliance score display at top of screen (from GET /roots/cycles/:cycleId/compliance).

IMPORTANT:
- Do NOT break existing functionality
- Keep offline support: queue API calls with expo-sqlite if offline
- All changes should be backward compatible with existing data
- Use existing component library patterns from the app
```

---

### PROMPT 2.4 — "Am I on Track?" Farmer Dashboard

```
PERSONA: You are a Mobile Frontend Engineer who builds data-rich dashboard screens for rural users. You design visual indicators (traffic-light colors, progress bars, score circles) that communicate complex compliance data simply. You create both the backend API endpoint and the React Native screen.

CONTEXT:
FarmerPay farmer app (React Native, Expo 54, Expo Router 6).
Path: farmer-app/app/(tabs)/farm-health.tsx (NEW screen)
Also add navigation entry in farmer-app/app/(tabs)/index.tsx (home screen)

EXISTING TO READ:
- farmer-app/app/(tabs)/index.tsx — home screen, has ACTIVITY_META routing map
- farmer-app/lib/api.ts — API client

TASK:
Create farm-health.tsx — a single-screen dashboard answering "Am I on Track?"

Backend API needed (add to executionRoutes.js or create new route):
GET /api/v1/roots/farmer/me/health-summary
Returns: {
  activities: [{
    type: 'CROP',
    name: 'Paddy - Kharif 2026',
    cycleId: 123,
    overallScore: 82,
    scoreColor: 'green', // green >80, amber 60-80, red <60
    currentStage: 5,
    totalStages: 10,
    stageStatuses: ['completed','completed','completed','delayed','completed','current','upcoming','upcoming','upcoming','upcoming'],
    nextAction: { name: 'Second Top Dressing', dueInDays: 8 },
    financials: { spent: 8200, expected: 7500, variancePct: 9.3 },
    soilHealthAvailable: true,
    alerts: ['Stage 4 was delayed by 5 days']
  }, {
    type: 'DAIRY',
    name: 'Dairy Herd',
    overallScore: 75,
    ...
  }],
  farmHealthScore: 79, // weighted average across all activities
  pendingActions: 2,
  unreadAdvisories: 3
}

Screen layout:

Top: "🌾 Your Farm Health: [79/100] [🟢]"
- Large circular score indicator

Per-activity cards (scrollable):
┌─────────────────────────────────────┐
│ 🌾 Paddy — Kharif 2026  Score: 82 🟢│
│                                      │
│ Timeline: ● ● ● 🟡 ● ○ ○ ○ ○ ○    │
│           1 2 3  4  5 6 7 8 9 10    │
│                                      │
│ Next: Second Top Dressing in 8 days  │
│ 💰 Spent: ₹8,200 (Expected: ₹7,500)│
│                                      │
│ [View Details →]                     │
└─────────────────────────────────────┘

Bottom: Quick actions
- "📷 Quick Photo" — open camera, auto-attach to current stage
- "📋 Pending Entries (2)" — navigate to entries needing attention
- "💡 Advisories (3)" — navigate to SAGE feed

Navigation:
- Tapping a card → navigate to cycle-detail.tsx for that cycle
- Add tab or prominent button on home screen to reach this page

DESIGN:
- Traffic-light color scheme (green/amber/red)
- Large numbers, minimal text
- Works in both Hindi and English
- Pull-to-refresh
```

---

### PROMPT 2.5 — Smart Push Notification Job

```
PERSONA: You are a Backend Engineer specializing in notification systems and user engagement. You build intelligent scheduled jobs that send contextual, stage-aware push notifications based on crop lifecycle data, with batch processing and rate limiting to prevent RabbitMQ flooding.

CONTEXT:
FarmerPay backend. Notifications use RabbitMQ worker: src/workers/ and notification services.
Existing: src/modules/notifications/ has SMS/push/email services.

TASK:
Create src/jobs/rootsStageNotificationJob.js

Purpose: Daily cron (8 AM IST) that sends stage-appropriate push notifications to farmers.

Logic:
1. Find all active CultivationCycles
2. For each cycle, compute current_day = today - sowing_date
3. Match current_day against PopWorkband windows:
   a. If a workband window STARTS within next 3 days:
      → Send: "🌾 Your [crop] is at [stage]. Time for [workband_name]. Tap to log."
      → Deep link data: { screen: 'cycle-detail', cycleId, workbandId }
   b. If a workband window is CURRENTLY OPEN and no execution exists:
      → Send: "🌾 [workband_name] is due now. Quick tap to confirm you've done it."
   c. If a workband window CLOSED 3 days ago with no execution:
      → Send: "⚠️ Did you complete [workband_name]? It's not too late to log it."
   d. If a stage was completed today (WorkbandExecution created today):
      → Send: "✅ Great! [workband_name] logged. Your compliance score: [X]/100"

Notification format:
- Push to RabbitMQ queue: 'notification_push'
- Payload: { farmerId, type: 'roots_stage_reminder', title, body, data: { screen, cycleId, workbandId } }

Also send for livestock activities:
- Dairy: daily morning reminder (7 AM) if no milk log for yesterday: "🐄 Log yesterday's milk yield — takes 30 seconds"
- Poultry: daily reminder if no daily log: "🐔 Quick daily check — deaths, feed, eggs"

Batch processing: process 100 farmers at a time, with 100ms delay between batches to avoid RabbitMQ flooding.

Register job in scheduler.
```

---

## 6. Phase 3 Prompts — Integrations

### PROMPT 3.1 — Banker Dashboard: Portfolio ROOTS Compliance Page

```
PERSONA: You are a Full-Stack Engineer building both the backend analytics APIs (Node.js/Express/Sequelize) and the frontend dashboard (Next.js 16/React 19/shadcn/ui/Recharts). You create data-rich portfolio views for banking professionals with proper filtering, aggregation, and interactive charts.

CONTEXT:
FarmerPay banker dashboard: Next.js 16, React 19, shadcn/ui, Recharts, Tailwind 4.
Path: dashboard/src/app/dashboard/

EXISTING TO READ FIRST:
- dashboard/src/app/dashboard/roots-activity/page.tsx — existing ROOTS activity page
- dashboard/src/app/dashboard/farmers/[id]/page.tsx — existing farmer detail page
- src/modules/banker/services/bankerAnalyticsService.js — existing banker analytics
- src/modules/banker/routes/bankerRoutes.js — existing routes

TASK:
This has TWO parts: Backend API + Frontend Page.

--- PART A: Backend API ---

Add to src/modules/banker/services/bankerAnalyticsService.js:

1. getRootsPortfolioCompliance(bankerId, filters)
   - filters: { season, crop, branch, page, limit }
   - Query roots_compliance_snapshots joined with farmers, grouped by compliance bands
   - Return: { summary: { total_farmers, high_compliance, moderate, low, insufficient_data, avg_score, soil_health_card_pct }, crop_breakdown: [], trend: [] }

2. getRootsRedFlags(bankerId, filters)
   - filters: { severity, status, page, limit }
   - Query roots_red_flags for farmers in banker's portfolio
   - Join farmer name, loan info
   - Return: { flags: [], summary: { critical, high, medium, low } }

3. getRootsVsRepayment(bankerId)
   - Cross-query: roots_compliance_snapshots JOIN loan_repayments
   - Group by compliance band → compute on-time repayment rate per band
   - Return: { correlation: { high_compliance_repayment_rate, moderate, low, no_data } }

4. getBranchCompliance(branchIds)
   - Aggregate compliance by branch
   - Return: { branches: [{ branch, avg_score, farmer_count, red_flag_count }] }

5. getFarmerRootsTimeline(farmerId)
   - Detailed per-stage timeline for a specific farmer
   - Join: compliance snapshots + workband executions + task executions + photos + sathi verifications + vyapar purchases + soil health record
   - Return the full farmer ROOTS profile (see brainstorm section 12A.3 for exact response format)

Add routes to bankerRoutes.js:
- GET /banker/portfolio/roots-compliance
- GET /banker/portfolio/roots-red-flags
- GET /banker/portfolio/roots-vs-repayment
- GET /banker/portfolio/branch-compliance
- GET /banker/portfolio/farmers/:farmerId/roots-timeline
- GET /banker/portfolio/farmers/:farmerId/roots-evidence?stage=X
- POST /banker/portfolio/roots-red-flags/:flagId/acknowledge

Add Joi validators for all query parameters.

--- PART B: Frontend Dashboard Page ---

Create: dashboard/src/app/dashboard/roots-compliance/page.tsx

Layout (use shadcn/ui components):
1. Top row: 5 KPI cards (Total Farmers, Avg Score, Low Compliance Count, Open Red Flags, SHC %)
2. Second row: Compliance Distribution bar chart (Recharts BarChart, stacked green/amber/red/grey)
3. Third row (2 columns):
   - Left: Crop-wise Compliance (horizontal bar chart)
   - Right: Compliance vs Repayment (bar chart showing correlation)
4. Fourth row: Branch Comparison table (shadcn/ui Table)
5. Bottom: Red Flags table with severity badges, farmer links, acknowledge buttons

Use:
- shadcn/ui Card, Table, Badge, Button, Select (for filters)
- Recharts for charts (BarChart, LineChart, PieChart)
- Tailwind 4 for layout
- Filters at top: Season dropdown, Crop dropdown, Branch dropdown

Each farmer name in tables links to: /dashboard/farmers/[farmerId]

Create also: dashboard/src/app/dashboard/roots-compliance/loading.tsx (skeleton loader)
```

---

### PROMPT 3.2 — Banker Dashboard: Farmer ROOTS Timeline Panel

```
PERSONA: You are a Frontend Engineer specializing in Next.js dashboards with complex data visualization. You enhance existing pages by adding collapsible detail panels with timeline views, evidence galleries, and multi-source data aggregation — all using shadcn/ui and Tailwind 4.

CONTEXT:
FarmerPay banker dashboard. Next.js 16, shadcn/ui, Tailwind 4.
Path: dashboard/src/app/dashboard/farmers/[id]/page.tsx (MODIFY existing)

READ FIRST:
- dashboard/src/app/dashboard/farmers/[id]/page.tsx — understand current farmer detail layout
- The API endpoint GET /banker/portfolio/farmers/:farmerId/roots-timeline was created in Prompt 3.1

TASK:
Add a new collapsible panel to the existing farmer detail page called "ROOTS Operational Profile".

Panel sections:

1. Soil Health Profile (if available):
   - SHC capture date, field name
   - NPK values with color badges (Red=Low, Green=High, Yellow=Medium)
   - pH, OC, Zinc status
   - PoP adjustments listed: "N fert +20%", "K fert -15%"

2. Active Activity Timeline (for each activity — crop, dairy, etc.):
   - Activity header: crop name, season, area, compliance score badge
   - Stage timeline: numbered circles with status colors (green ✅, amber 🟡, red 🔴, grey ○)
   - Expandable per-stage detail:
     - Recommended vs actual
     - Timing badge
     - Cost variance badge
     - Photo count
     - Sathi verified badge
     - VYAPAR purchase linkage if any
     - Farmer notes

3. Financial Summary:
   - Total spent vs expected, variance %
   - Expected yield based on compliance

4. Loan Utilization Section:
   - Loan amount, disbursed date
   - ROOTS verified cost + VYAPAR verified cost
   - Utilization ratio with quality badge (GOOD/PARTIAL/POOR/SUSPICIOUS)
   - Gap analysis note

5. TRUST ROOTS Component:
   - Score and weight in total TRUST
   - Positive signals (bullets)
   - Negative signals (bullets)

6. Action buttons at bottom:
   - "View Photo Evidence" → modal with photo gallery
   - "View VYAPAR Purchases" → modal/drawer
   - "Assign Sathi Task" → calls POST /sathi/tasks
   - "View SENTINEL Risk" → link to sentinel page

Use shadcn/ui: Accordion (for collapsible sections), Badge, Card, Table, Dialog (for photo modal)
Use Tailwind: flex layout, responsive grid
```

---

### PROMPT 3.3 — Sathi ROOTS Verification Mode

```
PERSONA: You are a Full-Stack Engineer building field-agent tools. You create both backend verification services (task creation, evidence collection, discrepancy reporting) and frontend verification UI (split-screen compare views, photo capture, GPS-stamped checklists) for the Sathi dashboard. You understand that Sathis work on mobile browsers in rural areas with intermittent connectivity.

CONTEXT:
FarmerPay Sathi dashboard: Next.js 16, React 19, shadcn/ui, Tailwind 4.
Path: dashboard-sathi/src/app/dashboard/

EXISTING TO READ:
- dashboard-sathi/src/app/dashboard/queue/page.tsx — task queue
- dashboard-sathi/src/app/dashboard/farmers/[farmerId]/page.tsx — farmer detail
- src/modules/sathi/services/taskService.js — task management
- src/modules/sathi/models/SathiTask.js — task model

TASK:
Two parts: Backend additions + Frontend pages.

--- PART A: Backend ---

1. Add new task type 'roots_field_verification' to SathiTask model (if not already an enum value, add migration)

2. Create src/modules/sathi/services/rootsVerificationService.js:
   - createRootsVerificationTask(farmerId, triggerReason, specificConcerns[])
     → Creates SathiTask with:
       - task_type: 'roots_field_verification'
       - priority: based on trigger severity
       - Auto-generated checklist (JSON) based on concerns
       - assigned_to: farmer's assigned Sathi (from ChoiceAssignment)
   
   - completeVerification(taskId, verificationData)
     → verificationData: { fieldPhotoUrl, gps, cropStanding, estimatedStage, farmerInterview, discrepancies[], assistedEntries[] }
     → Creates SathiEvidenceBundle with all evidence items
     → Updates roots_compliance_snapshots.sathi_verified = true
     → If discrepancies found: creates RootsRedFlag with type SATHI_DISCREPANCY
   
   - getVerificationChecklist(farmerId, cycleId)
     → Generates checklist based on farmer's current ROOTS status
     → Returns: items with evidence_type requirements

3. Add API endpoints to sathiRoutes.js:
   - POST /sathi/roots-verification — create verification task
   - GET /sathi/roots-verification/:taskId/checklist — get verification checklist
   - POST /sathi/roots-verification/:taskId/complete — submit verification results
   - POST /sathi/roots-verification/:taskId/assisted-entry — log data on behalf of farmer

4. Wire up auto-task creation: In complianceEventEmitter.js, when emitRedFlagCreated is called with severity HIGH or CRITICAL, auto-call createRootsVerificationTask for the farmer's assigned Sathi.

--- PART B: Frontend ---

1. Enhance queue page: dashboard-sathi/src/app/dashboard/queue/page.tsx
   - Add "ROOTS Alerts" section at top showing roots_field_verification tasks
   - Show: farmer name, village, concern description, priority badge
   - "Start Task ▶" button

2. Create: dashboard-sathi/src/app/dashboard/roots-verify/[taskId]/page.tsx
   - Split-screen layout:
     - Left: "What farmer reported" — ROOTS data summary (stages, scores, gaps)
     - Right: "What you see in field" — verification form
   - Verification checklist with checkboxes
   - Each item: checkbox + evidence type (photo required, GPS required, text note)
   - Photo capture with GPS auto-stamp
   - Assisted data entry section: for each missed stage, "Did farmer do this?" [Yes/No] with editable fields
   - Discrepancy report section at bottom
   - "Complete Verification ✅" button

3. Add Sathi KPI panel showing ROOTS metrics:
   - Verifications completed / target
   - Farmers with 80%+ compliance / total assigned
   - SHC captured count
   - Commission earned from ROOTS activities
```

---

### PROMPT 3.4 — VYAPAR-ROOTS Bridge Service

```
PERSONA: You are a Senior Backend Engineer specializing in cross-module integration and event-driven data pipelines. You build bridge services that listen to domain events (vendor transactions) and map them to another domain (farm cost entries) with category matching, stage correlation, and confidence scoring. You also build RabbitMQ consumers.

CONTEXT:
FarmerPay backend. VYAPAR module handles vendor transactions.
Path: src/modules/roots/crop/services/vyaparRootsBridgeService.js (NEW)

EXISTING TO READ:
- src/modules/vyapar/models/VendorTransaction.js
- src/modules/vyapar/models/VendorTransactionItem.js
- src/modules/vyapar/models/VendorProductCatalog.js — has product category field
- src/modules/vyapar/services/transactionService.js — understand transaction creation flow
- src/modules/roots/crop/models/TaskExecutionInputLog.js
- src/modules/roots/crop/models/CultivationCycle.js
- src/modules/roots/dairy/models/DairyCostEvent.js

TASK:
Create vyaparRootsBridgeService.js — auto-links vendor purchases to ROOTS cost entries.

Category mapping:
const CATEGORY_MAP = {
  'FERTILIZER':       { target: 'task_input_log', roots_category: 'fertilizer' },
  'PESTICIDE':        { target: 'task_input_log', roots_category: 'pesticide' },
  'INSECTICIDE':      { target: 'task_input_log', roots_category: 'pesticide' },
  'FUNGICIDE':        { target: 'task_input_log', roots_category: 'pesticide' },
  'HERBICIDE':        { target: 'task_input_log', roots_category: 'herbicide' },
  'SEED':             { target: 'task_input_log', roots_category: 'seed' },
  'MICRONUTRIENT':    { target: 'task_input_log', roots_category: 'micronutrient' },
  'GROWTH_REGULATOR': { target: 'task_input_log', roots_category: 'growth_regulator' },
  'FYM_COMPOST':      { target: 'task_input_log', roots_category: 'organic_manure' },
  'ANIMAL_FEED':      { target: 'dairy_cost_event', roots_category: 'feed' },
  'POULTRY_FEED':     { target: 'poultry_cost', roots_category: 'feed' },
  'VETERINARY':       { target: 'treatment_event', roots_category: 'medicine' },
  'MACHINERY_HIRE':   { target: 'machinery_log', roots_category: 'machinery' },
};

Methods:

1. processTransaction(vendorTransaction)
   - Called when a new VendorTransaction is created
   - Find farmer's active activities (CultivationCycle, DairyHerdRegister, etc.)
   - For each transaction item:
     a. Map VYAPAR product category → ROOTS category via CATEGORY_MAP
     b. If target is 'task_input_log': find the current/next workband that expects this input type (match input category + check if within stage window)
     c. If matched to a stage: create TaskExecutionInputLog with source='VYAPAR', vendor_transaction_item_id
     d. If no stage match: create as unassigned cycle expense (CultivationCycleExpenseSummary or equivalent)
     e. For dairy/poultry: create DairyCostEvent or PoultryCostEvent respectively
   - Tag all entries: { source: 'VYAPAR', vendor_transaction_id, auto_mapped: true }
   - Return: { mapped_items: [], unmapped_items: [], notifications: [] }

2. notifyFarmer(farmerId, mappedItems)
   - Push notification: "Your purchase of [item] (₹[cost]) at [vendor] has been added to your [crop/dairy] expenses."

3. unlinkTransaction(farmerId, transactionItemId, reason)
   - Farmer disputes auto-link: remove the ROOTS cost entry, keep audit trail
   - Mark transaction item as unlinked with reason

4. getSuggestedLinks(farmerId, transactionId)
   - For unmapped items, suggest possible activity/stage links
   - Return: [{ transactionItemId, suggestions: [{ activityType, activityName, stageName, confidence }] }]

Integration:
- Create a RabbitMQ consumer: src/workers/vyaparRootsBridgeConsumer.js
  - Listen on queue: 'vyapar_transaction_created'
  - Call processTransaction for each message
- Modify VYAPAR transactionService.js to publish to this queue after creating a transaction

Add API endpoints:
- POST /api/v1/roots/vyapar-link/unlink — farmer unlinks a transaction
- GET /api/v1/roots/vyapar-link/suggestions?transactionId=X — get link suggestions
```

---

## 7. Phase 4 Prompts — Cross-Module Signals

### PROMPT 4.1 — ROOTS → TRUST Integration

```
PERSONA: You are a Senior Backend Engineer specializing in credit scoring systems and behavioral analytics. You integrate operational farm data into a multi-pillar trust scoring engine, computing weighted signals from farming discipline metrics and wiring them through RabbitMQ event consumers into the existing scoring pipeline.

CONTEXT:
FarmerPay backend. TRUST module does credit scoring.
Path: src/modules/trust/services/evidenceCollector.js (MODIFY existing)

EXISTING TO READ:
- src/modules/trust/services/evidenceCollector.js — already imports FarmRegister, has ROOTS_LAND_VERIFIED feature
- src/modules/trust/services/pillarEngine.js — pillar scoring
- src/modules/trust/services/scoringEngine.js — composite scoring
- src/modules/roots/crop/models/RootsComplianceSnapshot.js (from Prompt 1.2)

TASK:
Enhance the TRUST module to consume ROOTS compliance data as a scoring pillar.

1. In evidenceCollector.js, add method: collectRootsEvidence(farmerId)
   - Fetch latest RootsComplianceSnapshot for each of the farmer's active activities
   - Compute aggregated ROOTS trust signals:
     - data_entry_consistency: % of expected entries actually logged (weight: 15%)
     - timing_compliance: avg timing score across all stages (weight: 20%)
     - practice_adherence: avg practice score (weight: 20%)
     - cost_rationality: is cost within expected range? (weight: 15%)
     - advisory_responsiveness: from SAGE — did farmer act on advisories? (weight: 10%)
     - variance_trend: comparing current vs previous season compliance (weight: 10%)
     - evidence_quality: photo count, GPS stamps, Sathi verifications (weight: 5%)
     - multi_livelihood_bonus: if all activities >70% compliance, +5 points (weight: 5%)
   - Return: { rootsTrustScore: 0-100, breakdown: {}, signals: { positive: [], negative: [] } }

2. In pillarEngine.js, integrate ROOTS score into appropriate pillar (likely P4: Operational/Behavioral)
   - Add roots_trust_score as a weighted input
   - Weight: 25% of total trust score (configurable)

3. Create RabbitMQ consumer: src/workers/rootsTrustConsumer.js
   - Listen on exchange: 'roots_events', routing key: 'compliance.updated'
   - On message: re-compute ROOTS trust component for the farmer
   - Update trust_score_calculations if score changed significantly (>5 points)

4. Handle missing data:
   - If farmer has <40% data completeness: don't include ROOTS in trust score, flag as "Insufficient Operational Data"
   - If farmer has no ROOTS data at all: skip ROOTS pillar, note in trust explanation

5. Temporal trust building:
   - Season 1: ROOTS weight = 10% of total trust
   - Season 2: ROOTS weight = 20%
   - Season 3+: ROOTS weight = 25%
   - Track number of completed seasons in roots_compliance_snapshots
```

---

### PROMPT 4.2 — ROOTS → SENTINEL Integration

```
PERSONA: You are a Backend Engineer specializing in risk monitoring and early warning systems. You enhance the SENTINEL loan health scoring to consume ROOTS compliance signals and red flags, creating EWS alerts that help bankers identify at-risk loans before they become NPAs.

CONTEXT:
FarmerPay backend. SENTINEL module monitors loan health.
Path: src/modules/sentinel/

EXISTING TO READ:
- src/modules/sentinel/services/healthScoringService.js — has zero_agri_activity signal
- src/modules/sentinel/services/ewsService.js — early warning system
- src/modules/sentinel/models/EwsAlert.js
- src/modules/sentinel/models/RedFlagEvent.js

TASK:
Enhance SENTINEL to consume ROOTS red flags and compliance events.

1. In healthScoringService.js, add new scoring signals:
   - roots_compliance_low: if overall_compliance_score < 50 → risk factor +15
   - roots_critical_stage_missed: if any CRITICAL_STAGE_MISSED red flag → risk factor +20
   - roots_cost_anomaly: if COST_ANOMALY red flag → risk factor +10
   - roots_loan_utilization_poor: if utilization_quality = 'POOR' or 'SUSPICIOUS' → risk factor +25
   - roots_no_data_extended: if NO_DATA_ENTRY red flag with >45 days → risk factor +20
   - roots_backfill_suspected: if BACKFILL_SUSPECTED → risk factor +5 (soft signal)
   - roots_sathi_discrepancy: if SATHI_DISCREPANCY → risk factor +15

2. In ewsService.js, add ROOTS-triggered early warnings:
   - When roots_red_flag_created event is received (from RabbitMQ):
     - If severity CRITICAL → create EwsAlert with priority HIGH
     - If severity HIGH → create EwsAlert with priority MEDIUM
     - Auto-trigger SMA classification review if loan is linked

3. Create RabbitMQ consumer: src/workers/rootsSentinelConsumer.js
   - Listen on exchange: 'roots_events', routing keys: 'redflag.created', 'stage.missed'
   - On red flag: call ewsService to create/update EWS alert
   - On stage missed: update health scoring for the farmer's loan

4. In the existing loan health snapshot computation, include ROOTS compliance score as a positive/negative factor:
   - High compliance (>80) → health bonus
   - Low compliance (<50) → health penalty
   - Use the compliance snapshot from roots_compliance_snapshots
```

---

### PROMPT 4.3 — ROOTS → SAGE Advisory Integration

```
PERSONA: You are a Backend Engineer specializing in advisory/recommendation engines for agriculture. You build personalized advisory generation that transforms farming variance data (delays, deviations, soil deficiencies) into actionable, farmer-friendly recommendations with priority-based delivery through push notifications and in-app feeds.

CONTEXT:
FarmerPay backend. SAGE module generates crop advisories.
Path: src/modules/sage/

EXISTING TO READ:
- src/modules/sage/services/cropAdvisoryEngine.js — existing advisory generation
- src/modules/sage/services/sageService.js — advisory CRUD
- src/modules/sage/models/SageAdvisory.js

TASK:
Enhance SAGE to generate personalized advisories from ROOTS variance data.

1. In cropAdvisoryEngine.js, add method: generateVarianceBasedAdvisories(farmerId)
   - Fetch farmer's active cycles and latest compliance snapshots
   - For each variance detected:
     a. Timing variance (delayed stage):
        → Advisory: "Your [crop] is [X] days behind on [stage]. [Corrective action based on PoP]"
     b. Skipped practice:
        → Advisory: "You skipped [practice]. Watch for [consequence]. [Mitigation suggestion]"
     c. Input substitution:
        → Advisory: "You used [actual] instead of [recommended]. [Dosage adjustment needed]"
     d. Quantity under-application + low soil nutrient:
        → Advisory: "Your soil is already low in [nutrient] AND you applied less than recommended. [Critical supplemental dose needed]"
     e. Quantity over-application + high soil nutrient:
        → Advisory: "Your soil already has high [nutrient]. The extra [input] you applied is wasteful. Skip [nutrient] next stage."
     f. Livestock mortality spike:
        → Advisory: "🚨 [X] deaths in [Y] days. Check for [disease symptoms]. [Emergency action]"
     g. Feed deviation:
        → Advisory: "Feed conversion ratio is [X] vs standard [Y]. [Feed quality/quantity adjustment]"
     h. Vaccination overdue:
        → Advisory: "[Vaccine] was due [X] days ago. Schedule immediately. [Risk if delayed]"

2. Priority classification:
   - CRITICAL → push notification + SMS
   - HIGH → push notification
   - MEDIUM → in-app advisory feed
   - LOW → weekly digest

3. Create RabbitMQ consumer: src/workers/rootsSageConsumer.js
   - Listen on exchange: 'roots_events', routing keys: 'compliance.updated', 'stage.missed', 'redflag.created'
   - On compliance update: check for new variances, generate advisories
   - On stage missed: generate corrective advisory immediately

4. Personalization depth based on data history:
   - Season 1: generic + stage-based advisories
   - Season 2: variance-based corrections + comparative ("Last season you did X, this time try Y")
   - Season 3+: pattern-based + predictive ("Based on your 3 seasons, you perform best when...")
```

---

### PROMPT 4.4 — ROOTS → PULSE Post-Harvest Integration

```
PERSONA: You are a Backend Engineer specializing in agricultural market intelligence and financial decision support. You build services that combine cost-of-production data from ROOTS with market prices and forecasts from PULSE to generate personalized sell/store/split recommendations, factoring in loan EMI obligations and storage costs.

CONTEXT:
FarmerPay backend. PULSE module handles market intelligence.
Path: src/modules/pulse/

EXISTING TO READ:
- src/modules/pulse/services/ — existing price and forecast services
- src/modules/roots/crop/models/CultivationCycleExpenseSummary.js
- src/modules/roots/crop/models/HarvestRecord.js, HarvestSaleRecord.js

TASK:
Create src/modules/pulse/services/rootsPulseIntegrationService.js

Purpose: Use ROOTS cost-of-production data to personalize PULSE sell/store recommendations.

Methods:

1. getBreakEvenPrice(farmerId, cycleId)
   - Fetch: total cost from CultivationCycleExpenseSummary (or compute from TaskExecutionInputLogs + LaborLogs)
   - Fetch: actual yield from HarvestRecord
   - Calculate: breakeven_price = total_cost / total_yield_kg
   - Return: { breakEvenPrice, totalCost, totalYieldKg, costPerAcre }

2. getPersonalizedSellRecommendation(farmerId, cycleId)
   - Get: break-even price from above
   - Get: current mandi price from existing PULSE price service
   - Get: 30-day forecast from existing PULSE forecast service
   - Get: farmer's loan EMI due date from DICE (if loan-linked)
   - Get: storage cost estimate (if warehouse available from VYAPAR)
   - Compute recommendation:
     If current_price > breakeven × 1.3 AND no urgent EMI → "Good time to sell. Profit margin: X%"
     If forecast shows >10% rise in 30 days AND storage available → "Consider storing [X]Q for 30 days. Expected gain: ₹Y"
     If EMI due within 15 days → "Sell [Z]Q now to cover EMI of ₹[amount]. Store remaining."
   - Return: { recommendation, breakEvenPrice, currentPrice, forecastPrice, storageCost, emiDueDate, emiAmount, suggestedSplitSellQty, suggestedStoreQty }

3. getYieldAdjustmentFactor(farmerId, cycleId)
   - Compute: adjustment based on compliance score
   - compliance >85% → factor 1.05, 70-85% → 1.00, 50-70% → 0.85, <50% → 0.70
   - Additional: pest/disease event → ×0.90, late sowing → ×0.92, missed fertilization → ×0.88
   - Return: { factor, reasons: [] }

Add API endpoint:
- GET /api/v1/pulse/farmer/me/sell-recommendation?cycleId=X
  → Returns personalized sell/store recommendation with full financial context
```

---

## 8. Phase 5 Prompts — Dedicated Poultry & Goatery Modules

### PROMPT 5.1 — Poultry Module: Models & Migrations

```
PERSONA: You are a Senior Backend Engineer building a new domain module from scratch. You design normalized database schemas for livestock management with proper relationships, create Sequelize models with associations and scopes, and write clean migrations. You follow the exact patterns established by the existing Dairy module (src/modules/roots/dairy/) for consistency.

CONTEXT:
FarmerPay backend. Creating a dedicated Poultry module to replace the generic PoP touchpoint framework.
Path: src/modules/roots/poultry/ (NEW directory)

Follow the same structure as dairy module: src/modules/roots/dairy/ for file organization patterns.

TASK:
Create the directory structure and all model files + migration:

Directory: src/modules/roots/poultry/
├── models/
│   ├── PoultryFlock.js
│   ├── PoultryDailyLog.js
│   ├── PoultryHealthEvent.js
│   ├── PoultryCostEvent.js
│   ├── PoultryRevenueEvent.js
│   ├── PoultryBatchSummary.js
│   └── PoultryPopTemplate.js
├── services/
├── controllers/
├── routes/
└── validators/

Models specification:

1. PoultryFlock
   Table: poultry_flocks
   Columns: id, uuid, farmer_id (FK), batch_name, bird_type ENUM('BROILER','LAYER','COUNTRY','DUCK','QUAIL'), breed VARCHAR(100), placement_date DATE, initial_count INT, current_count INT, avg_initial_weight_g INT, status ENUM('ACTIVE','COMPLETED','TERMINATED'), completion_date DATE NULL, shed_type VARCHAR(50), farm_register_id INT NULL, notes TEXT NULL, is_active, created_at, updated_at

2. PoultryDailyLog
   Table: poultry_daily_logs
   Columns: id, uuid, flock_id (FK), log_date DATE, mortality_count INT DEFAULT 0, feed_consumed_kg DECIMAL(8,2), water_consumed_liters DECIMAL(8,2) NULL, egg_count INT NULL (layers), sample_weight_g INT NULL (weekly for broilers), temperature_high DECIMAL(4,1) NULL, temperature_low DECIMAL(4,1) NULL, humidity_pct INT NULL, disease_observed BOOLEAN DEFAULT FALSE, disease_notes TEXT NULL, photo_url VARCHAR(500) NULL, is_active, created_at, updated_at
   Unique index: (flock_id, log_date)

3. PoultryHealthEvent
   Table: poultry_health_events
   Columns: id, uuid, flock_id (FK), event_date DATE, event_type ENUM('VACCINATION','DISEASE','MEDICATION','DEWORMING','CULLING'), vaccine_name VARCHAR(100) NULL, disease_name VARCHAR(100) NULL, medicine_name VARCHAR(100) NULL, dosage VARCHAR(100) NULL, birds_affected INT NULL, cost DECIMAL(10,2) NULL, administered_by VARCHAR(100) NULL, notes TEXT NULL, is_active, created_at, updated_at

4. PoultryCostEvent
   Table: poultry_cost_events
   Columns: id, uuid, flock_id (FK), event_date DATE, category ENUM('FEED','MEDICINE','LABOR','ENERGY','CHICK_PURCHASE','EQUIPMENT','LITTER','TRANSPORT','OTHER'), description VARCHAR(255) NULL, amount DECIMAL(10,2) NOT NULL, quantity DECIMAL(10,2) NULL, unit VARCHAR(20) NULL, is_recurring BOOLEAN DEFAULT FALSE, recurring_frequency ENUM('DAILY','WEEKLY','MONTHLY') NULL, source ENUM('FARMER','SATHI','VYAPAR','AUTO') DEFAULT 'FARMER', vendor_transaction_id INT NULL, is_active, created_at, updated_at

5. PoultryRevenueEvent
   Table: poultry_revenue_events
   Columns: id, uuid, flock_id (FK), event_date DATE, category ENUM('EGG_SALE','BIRD_SALE','MANURE_SALE','OTHER'), quantity DECIMAL(10,2), unit VARCHAR(20), rate_per_unit DECIMAL(10,2), total_amount DECIMAL(10,2), buyer_name VARCHAR(200) NULL, buyer_type ENUM('TRADER','RETAIL','HOTEL','MARKET','OTHER') NULL, is_active, created_at, updated_at

6. PoultryBatchSummary
   Table: poultry_batch_summaries
   Columns: id, uuid, flock_id (FK), summary_date DATE, cumulative_mortality INT, mortality_rate_pct DECIMAL(5,2), cumulative_feed_kg DECIMAL(10,2), fcr DECIMAL(5,3) NULL (feed conversion ratio), avg_weight_g INT NULL, total_egg_count INT NULL, egg_production_pct DECIMAL(5,2) NULL, total_cost DECIMAL(12,2), total_revenue DECIMAL(12,2), profit_per_bird DECIMAL(8,2) NULL, cost_per_bird DECIMAL(8,2) NULL, is_active, created_at, updated_at

7. PoultryPopTemplate
   Table: poultry_pop_templates
   Columns: id, uuid, bird_type ENUM('BROILER','LAYER'), breed VARCHAR(100) NULL, week_number INT, expected_feed_g_per_bird INT, expected_weight_g INT NULL (broilers), expected_egg_pct DECIMAL(5,2) NULL (layers), expected_mortality_pct DECIMAL(5,2), vaccination_due VARCHAR(200) NULL, notes TEXT NULL, is_active, created_at, updated_at

Create ONE migration file with all 7 tables.
Register all models in shared/models/index.js.
Add associations in each model's associate() method:
- PoultryFlock hasMany DailyLog, HealthEvent, CostEvent, RevenueEvent, BatchSummary
- PoultryFlock belongsTo Farmer (via farmer_id)
```

---

### PROMPT 5.2 — Poultry Module: Services, Controllers, Routes

```
PERSONA: You are a Senior Backend Engineer building the full service/controller/route/validator layer for a new livestock module. You write business logic services with analytics computation (FCR, mortality rates, batch economics), REST controllers following the resolveUserId pattern, Express routes with auth + validation middleware, and Joi schemas. You follow the exact patterns from the Dairy V2 module for consistency.

CONTEXT:
FarmerPay backend. Poultry module models were created in Prompt 5.1.
Path: src/modules/roots/poultry/

REFERENCE: Follow patterns from src/modules/roots/dairy/services/dairyV2Controller.js and related dairy V2 services.

TASK:
Create the full service, controller, route, and validator layer for Poultry.

--- SERVICES ---

1. flockService.js
   - createFlock(farmerId, data) — create new flock batch
   - getFlockById(flockId) — single flock with latest summary
   - listFarmerFlocks(farmerId, filters) — all flocks, paginated, with batch summary stats
   - updateFlock(flockId, data) — update flock details
   - completeFlock(flockId, completionDate) — mark batch as completed
   - getFlockDashboard(flockId) — overview with key metrics (current count, FCR, mortality rate, daily avg)

2. dailyLogService.js
   - createDailyLog(flockId, data) — log daily data (auto-update current_count on mortality)
   - getDailyLogs(flockId, dateRange) — paginated daily logs
   - getLatestLog(flockId) — most recent entry
   - Auto-compute on save: current_count = previous_count - mortality_count

3. batchAnalyticsService.js
   - computeFCR(flockId) — Feed Conversion Ratio: cumulative_feed / cumulative_weight_gain
   - computeMortalityRate(flockId) — cumulative_deaths / initial_count × 100
   - computeEggProductionPct(flockId, week) — (total_eggs / total_birds / 7) × 100
   - computeCostPerBird(flockId) — sum costs / current_count
   - computeRevenuePerBird(flockId) — sum revenue / initial_count
   - generateBatchSummary(flockId) — create/update PoultryBatchSummary
   - Called automatically after each dailyLog creation

4. popComparisonService.js
   - compareToStandard(flockId) — compare actuals vs PoultryPopTemplate
   - Returns: { mortality: { actual, expected, status }, fcr: { actual, expected, status }, weight: { actual, expected, status }, eggPct: { actual, expected, status } }
   - Status: EXCELLENT / ON_TRACK / BELOW_STANDARD / CRITICAL

5. alertService.js
   - checkMortalitySpike(flockId) — daily mortality >1% → RED alert, cumulative >5% → warning
   - checkFCRDeterioration(flockId) — FCR >2.0 at week 6 (broilers) → flag
   - checkEggDrop(flockId) — production drop >10% in a week → flag
   - checkWeightLag(flockId) — weight <80% of standard curve → flag
   - Called by dailyLogService after each log entry

--- CONTROLLER ---

poultryController.js — standard REST handlers:
- Flock CRUD (create, get, list, update, complete)
- Daily log (create, list)
- Health events (create, list)
- Cost events (create, list)
- Revenue events (create, list)
- Batch summary (get, refresh)
- PoP comparison (get)
- Alerts (list active)
- Use resolveUserId pattern from other controllers
- Use success() response helper

--- ROUTES ---

poultryRoutes.js — mount at /api/v1/roots/poultry
- POST / — createFlock
- GET /me — listMyFlocks (farmer's flocks)
- GET /:flockId — getFlockDetail
- PUT /:flockId — updateFlock
- POST /:flockId/complete — completeFlock
- POST /:flockId/daily-log — createDailyLog
- GET /:flockId/daily-logs — getDailyLogs
- POST /:flockId/health-events — createHealthEvent
- GET /:flockId/health-events — getHealthEvents
- POST /:flockId/costs — createCostEvent
- GET /:flockId/costs — getCostEvents
- POST /:flockId/revenue — createRevenueEvent
- GET /:flockId/revenue — getRevenueEvents
- GET /:flockId/summary — getBatchSummary
- GET /:flockId/pop-comparison — getPopComparison
- GET /:flockId/alerts — getAlerts
- GET /:flockId/dashboard — getFlockDashboard

All routes: authenticate middleware + validate middleware with Joi schemas.
Register routes in app.js: app.use('/api/v1/roots/poultry', poultryRoutes)

--- VALIDATORS ---

poultryValidator.js — Joi schemas for all endpoints.
Key validations:
- bird_type must be valid enum
- mortality_count >= 0 and <= current_count
- feed_consumed_kg > 0
- cost amount > 0
- egg_count >= 0
```

---

### PROMPT 5.3 — Goatery Module (Models, Services, Routes)

```
PERSONA: You are a Senior Backend Engineer building a complete livestock management module from scratch — models, migrations, services, controllers, routes, and validators in a single pass. You design individual-animal-level tracking (unlike batch-based Poultry), with breeding lifecycle management, growth tracking against breed standards, and herd economics. Follow existing Dairy module patterns for animal-level tracking and Poultry module patterns for the overall module structure.

CONTEXT:
FarmerPay backend. Creating dedicated Goatery module, similar to Poultry (Prompt 5.1 & 5.2).
Path: src/modules/roots/goatery/ (NEW directory)

Follow Poultry module structure. Reference dairy module for animal-level tracking patterns.

TASK:
Create the complete Goatery module in one prompt: models + migration + services + controller + routes + validators.

--- MODELS (9 tables, 1 migration) ---

1. GoatHerd: id, uuid, farmer_id, herd_name, herd_type ENUM('STALL_FED','GRAZING','MIXED'), primary_breed, location_village, farm_register_id NULL, total_animals INT, status ENUM('ACTIVE','INACTIVE'), is_active, created_at, updated_at

2. GoatAnimal: id, uuid, herd_id (FK), tag_id VARCHAR(50) UNIQUE, name VARCHAR(100) NULL, breed, sex ENUM('MALE','FEMALE'), dob DATE NULL, approximate_age_months INT NULL, weight_kg DECIMAL(6,2) NULL, dam_id INT NULL (self-ref FK), sire_id INT NULL (self-ref FK), purchase_date DATE NULL, purchase_cost DECIMAL(10,2) NULL, source VARCHAR(200) NULL, status ENUM('ACTIVE','SOLD','DEAD','TRANSFERRED'), status_date DATE NULL, photo_url VARCHAR(500) NULL, notes TEXT NULL, is_active, created_at, updated_at

3. GoatGrowthLog: id, uuid, animal_id (FK), log_date DATE, weight_kg DECIMAL(6,2), body_condition_score INT (1-5), notes TEXT NULL, photo_url VARCHAR(500) NULL, is_active, created_at, updated_at

4. GoatHealthEvent: id, uuid, animal_id INT NULL (FK, NULL=herd-wide), herd_id (FK), event_date DATE, event_type ENUM('VACCINATION','DEWORMING','DISEASE','TREATMENT','INJURY'), vaccine_name VARCHAR(100) NULL, disease_name VARCHAR(100) NULL, medicine_name VARCHAR(100) NULL, vet_name VARCHAR(200) NULL, cost DECIMAL(10,2) NULL, birds_affected INT NULL, notes TEXT NULL, is_active, created_at, updated_at

5. GoatBreedingEvent: id, uuid, doe_id (FK to GoatAnimal), buck_id INT NULL (FK to GoatAnimal), service_date DATE, service_type ENUM('NATURAL','AI'), expected_kidding_date DATE NULL (service_date + 150 days), actual_kidding_date DATE NULL, kid_count INT NULL, kid_details JSON NULL, complications TEXT NULL, cost DECIMAL(10,2) NULL, status ENUM('SERVICED','CONFIRMED','KIDDED','FAILED'), is_active, created_at, updated_at

6. GoatFeedLog: id, uuid, herd_id (FK), log_date DATE, feed_type ENUM('GRAZING','DRY_FODDER','GREEN_FODDER','CONCENTRATE','MINERAL_MIX','OTHER'), quantity_kg DECIMAL(8,2) NULL, grazing_hours DECIMAL(4,1) NULL, cost DECIMAL(10,2) NULL, notes TEXT NULL, is_active, created_at, updated_at

7. GoatCostEvent: id, uuid, herd_id (FK), event_date DATE, category ENUM('FEED','MEDICINE','LABOR','TRANSPORT','SHELTER','EQUIPMENT','BREEDING','OTHER'), amount DECIMAL(10,2), description VARCHAR(255) NULL, source ENUM('FARMER','SATHI','VYAPAR','AUTO') DEFAULT 'FARMER', vendor_transaction_id INT NULL, is_active, created_at, updated_at

8. GoatRevenueEvent: id, uuid, herd_id (FK), animal_id INT NULL (FK), event_date DATE, category ENUM('LIVE_SALE','MEAT_SALE','MANURE_SALE','MILK_SALE','OTHER'), quantity DECIMAL(10,2) NULL, unit VARCHAR(20) NULL, rate_per_unit DECIMAL(10,2) NULL, total_amount DECIMAL(10,2), buyer_name VARCHAR(200) NULL, sale_weight_kg DECIMAL(6,2) NULL (for live sale), is_active, created_at, updated_at

9. GoatPopTemplate: id, uuid, breed VARCHAR(100), sex ENUM('MALE','FEMALE'), age_months_start INT, age_months_end INT, expected_weight_kg DECIMAL(6,2), daily_feed_requirement_kg DECIMAL(4,2), vaccination_schedule JSON, deworming_interval_days INT, expected_kidding_rate DECIMAL(3,2) NULL (does only), notes TEXT NULL, is_active, created_at, updated_at

--- SERVICES ---

1. herdService.js — CRUD, herd composition analytics (count by sex/age group, breed distribution)
2. animalService.js — individual animal lifecycle (register, update weight, transfer, mark sold/dead)
3. breedingService.js — breeding calendar, auto-compute expected kidding date, reproductive efficiency (kidding rate, kid survival, inter-kidding interval)
4. healthService.js — vaccination schedule adherence check, disease tracking, deworming calendar
5. economicsService.js — cost per animal, revenue per animal, herd NPV estimate, monthly P&L summary
6. popComparisonService.js — growth rate vs breed standard, feed efficiency vs standard, mortality rate assessment

--- ROUTES (mount at /api/v1/roots/goatery) ---

Standard CRUD for: herds, animals, growth logs, health events, breeding events, feed logs, cost events, revenue events.
Plus: GET /:herdId/dashboard, GET /:herdId/pop-comparison, GET /:herdId/economics

--- CONTROLLER & VALIDATORS ---

Standard patterns. Key validator rules:
- weight_kg realistic by breed (Black Bengal 15-20 adult, Jamunapari 60-80)
- kid_count typically 1-4
- body_condition_score 1-5

Register routes in app.js: app.use('/api/v1/roots/goatery', goateryRoutes)
```

---

## 9. Phase 6 Prompts — Dairy & Horticulture Enhancements

### PROMPT 6.1 — Dairy PoP Engine

```
PERSONA: You are a Backend Engineer with domain expertise in dairy science and livestock benchmarking. You build a breed-specific Package of Practices (PoP) engine that compares actual dairy performance (yield, feed, health, reproduction) against breed standards, computes compliance scores, and generates actionable alerts. You enhance the existing mature Dairy V2 module without breaking any existing functionality.

CONTEXT:
FarmerPay backend. Dairy module V2 already has mature logbook architecture (22 models).
Path: src/modules/roots/dairy/services/ (ADD new service)

EXISTING TO READ:
- src/modules/roots/dairy/models/ — all dairy models
- src/modules/roots/dairy/services/dairyAnimalV2Service.js — animal management
- src/modules/roots/dairy/services/dairyWeeklySummaryService.js — weekly aggregation

TASK:
Create src/modules/roots/dairy/services/dairyPopEngine.js

Purpose: Breed-specific dairy PoP (Package of Practices) for comparison and variance detection.

1. Create migration + model: DairyPopTemplate
   Table: dairy_pop_templates
   Columns: id, uuid, breed VARCHAR(100), lactation_stage ENUM('EARLY','MID','LATE','DRY'), expected_daily_yield_liters DECIMAL(5,2), expected_feed_kg_per_day DECIMAL(5,2), expected_feed_cost_per_day DECIMAL(8,2), expected_lactation_length_days INT, expected_calving_interval_days INT, vaccination_schedule JSON, deworming_schedule JSON, expected_calf_mortality_pct DECIMAL(5,2), notes TEXT, is_active, created_at, updated_at

2. Seed data for common breeds:
   - HF Crossbred: 8-12 L/day peak, 270-305 days lactation, 365-400 calving interval
   - Murrah Buffalo: 6-8 L/day, 300-320 days, 400-450 interval
   - Gir Cow: 4-6 L/day, 250-280 days, 380-420 interval
   - Jersey Cross: 8-10 L/day, 270-300 days, 370-400 interval

3. Methods in dairyPopEngine.js:

   a. computeYieldVariance(animalId, dateRange)
      - Compare actual daily milk yield vs breed × lactation stage expected
      - Determine lactation stage from last calving date
      - Return: { actual_avg, expected_avg, variance_pct, status }

   b. computeFeedEfficiency(herdId, dateRange)
      - Feed cost per liter = total feed cost / total milk yield
      - Compare to breed benchmark
      - Return: { cost_per_liter, benchmark, variance_pct, status }

   c. checkVaccinationCompliance(herdId)
      - Compare vaccination records against breed schedule
      - Return: { scheduled: [], completed: [], overdue: [], compliance_pct }

   d. checkReproductiveEfficiency(herdId)
      - Calving interval: time between consecutive calvings
      - Conception rate: successful breedings / total attempts
      - Return: { avg_calving_interval, expected, calf_mortality_rate, status }

   e. computeDairyComplianceScore(herdId)
      - Weighted: feed_compliance 25% + health_compliance 30% + reproductive_compliance 20% + production_efficiency 25%
      - Upsert into roots_compliance_snapshots with activity_type='DAIRY'
      - Return: compliance score object

   f. generateDairyAlerts(herdId)
      - Yield drop: 3 consecutive days >20% below 7-day average
      - Feed cost spike: weekly cost >30% above benchmark
      - Vaccination overdue: past schedule window
      - Breeding window: heat detection (last calving + 60 days)
      - Dry-off reminder: calving date + 270 days approaching
      - Mortality: any death triggers Sathi follow-up

Add route: GET /api/v1/roots/dairy/:herdId/pop-comparison
Add route: GET /api/v1/roots/dairy/:herdId/compliance-score
```

---

### PROMPT 6.2 — Horticulture Perennial Lifecycle Enhancement

```
PERSONA: You are a Backend Engineer with domain expertise in perennial crop management (mango, citrus, coconut, banana). You enhance the existing Horticulture module to support multi-year lifecycle tracking (establishment → juvenile → peak bearing → senescence), seasonal cycle overlays, canopy health observations, and year-over-year yield trend analysis. You add new models and enhance existing services without breaking current functionality.

CONTEXT:
FarmerPay backend. Horticulture module has basic structure (8 models).
Path: src/modules/roots/horticulture/

EXISTING TO READ:
- src/modules/roots/horticulture/models/ — all 8 models
- src/modules/roots/horticulture/services/horticultureService.js

TASK:
Enhance horticulture to support perennial crop lifecycles (mango, citrus, coconut, banana, etc.).

1. Migration: Add columns to horticulture_orchards table:
   - lifecycle_stage ENUM('ESTABLISHMENT','JUVENILE','PEAK_BEARING','SENESCENCE') DEFAULT 'ESTABLISHMENT'
   - planting_year INT
   - expected_first_bearing_year INT
   - tree_count INT
   - tree_spacing_m DECIMAL(4,2)
   - irrigation_type ENUM('DRIP','SPRINKLER','FLOOD','RAINFED')
   - intercrop_details JSON NULL

2. Create new models:

   HorticultureSeasonalCycle
   Table: horticulture_seasonal_cycles
   Columns: id, uuid, orchard_id (FK), year INT, season VARCHAR(20), cycle_type ENUM('PRUNING','FLOWERING','FRUITING','HARVEST','DORMANT','INTERCROP'), start_date DATE, end_date DATE NULL, pop_id INT NULL, compliance_score DECIMAL(5,2) NULL, status ENUM('PLANNED','ACTIVE','COMPLETED'), is_active, created_at, updated_at

   HorticultureCanopyObservation
   Table: horticulture_canopy_observations
   Columns: id, uuid, orchard_id (FK), observation_date DATE, flowering_intensity ENUM('NONE','LOW','MEDIUM','HIGH','VERY_HIGH') NULL, fruiting_intensity ENUM('NONE','LOW','MEDIUM','HIGH') NULL, canopy_health ENUM('HEALTHY','STRESSED','DISEASED','DAMAGED') NULL, pest_observed VARCHAR(200) NULL, photo_url VARCHAR(500) NULL, notes TEXT NULL, is_active, created_at, updated_at

   HorticultureYieldRecord
   Table: horticulture_yield_records
   Columns: id, uuid, orchard_id (FK), harvest_year INT, total_yield_kg DECIMAL(10,2), yield_per_tree_kg DECIMAL(8,2), quality_grade VARCHAR(20) NULL, market_price_per_kg DECIMAL(8,2) NULL, total_revenue DECIMAL(12,2) NULL, is_active, created_at, updated_at

3. Enhance horticultureService.js:
   - getOrchardLifecycleView(orchardId) — returns orchard with multi-year yield trend, lifecycle stage, current seasonal cycle
   - recordSeasonalActivity(orchardId, cycleData) — pruning, flowering, harvest observations
   - recordCanopyObservation(orchardId, observationData) — photo + health assessment
   - computeYieldTrend(orchardId) — year-over-year yield analysis
   - getPerennialComplianceScore(orchardId) — compliance based on seasonal activity adherence

4. Update routes: add endpoints for seasonal cycles, canopy observations, yield records.
```

---

## 10. Prompt Execution Order & Dependencies

```
EXECUTION ORDER:
═══════════════

PHASE 1 — FOUNDATION (execute sequentially)
  1.1  Database Migrations (new tables)           ← run first, no deps
  1.2  Sequelize Models                            ← needs 1.1
  1.3  Variance Computation Service                ← needs 1.2, core engine
  1.4  Red Flag Detection Service                  ← needs 1.3
  1.5  Missed Step Detector Cron Job               ← needs 1.3, 1.4
  1.6  Compliance Event Emitter                    ← needs 1.3, 1.4

PHASE 2 — FARMER UX (can partially parallelize)
  2.1  Soil Health Card Service (backend)          ← needs 1.1 (SoilHealthRecord)
  2.2  Season-Start Setup Wizard (mobile)          ← needs 2.1 backend API
  2.3  CMS Pattern (modify cycle-detail.tsx)       ← needs 1.3 (variance data)
  2.4  "Am I on Track?" Dashboard (mobile)         ← needs 1.3 (compliance scores)
  2.5  Smart Push Notification Job                 ← needs 1.5 pattern

PHASE 3 — STAKEHOLDER VIEWS (can partially parallelize)
  3.1  Banker Compliance Dashboard (backend+web)   ← needs 1.3, 1.4
  3.2  Banker Farmer Timeline Panel (web)          ← needs 3.1 backend APIs
  3.3  Sathi Verification Mode (backend+web)       ← needs 1.4 (red flags)
  3.4  VYAPAR-ROOTS Bridge Service                 ← needs 1.2 (models)

PHASE 4 — CROSS-MODULE (all need Phase 1)
  4.1  ROOTS → TRUST integration                   ← needs 1.3, 1.6
  4.2  ROOTS → SENTINEL integration                ← needs 1.4, 1.6
  4.3  ROOTS → SAGE integration                    ← needs 1.3, 1.6
  4.4  ROOTS → PULSE integration                   ← needs 1.3

PHASE 5 — NEW MODULES (independent of Phase 2-4)
  5.1  Poultry Models & Migrations                 ← independent
  5.2  Poultry Services, Controllers, Routes       ← needs 5.1
  5.3  Goatery Module (full)                       ← independent of 5.1/5.2

PHASE 6 — ENHANCEMENTS (independent of Phase 5)
  6.1  Dairy PoP Engine                            ← needs existing dairy models
  6.2  Horticulture Perennial Lifecycle            ← needs existing horti models

PARALLELIZATION OPPORTUNITIES:
  - Phases 5 and 6 can run in parallel with Phases 3 and 4
  - Within Phase 3: prompts 3.1 and 3.4 can run in parallel
  - Within Phase 4: all four prompts can run in parallel (all read from Phase 1 outputs)
  - Prompts 5.1 and 5.3 are fully independent
```

---

## Appendix: Prompt Sizing Guide

| Prompt | Estimated Tokens | Complexity | Notes |
|--------|-----------------|------------|-------|
| 1.1 | ~800 | Low | Migration boilerplate |
| 1.2 | ~600 | Low | Model definitions |
| 1.3 | ~1200 | High | Core engine, most complex |
| 1.4 | ~800 | Medium | Detection patterns |
| 1.5 | ~500 | Low | Cron job pattern |
| 1.6 | ~600 | Medium | Event system |
| 2.1 | ~800 | Medium | OCR + validation |
| 2.2 | ~800 | Medium | Multi-step wizard |
| 2.3 | ~900 | High | Modifying large existing file |
| 2.4 | ~600 | Medium | New screen + API |
| 2.5 | ~500 | Low | Notification patterns |
| 3.1 | ~1000 | High | Backend + frontend |
| 3.2 | ~700 | Medium | UI panel |
| 3.3 | ~900 | High | Backend + frontend |
| 3.4 | ~800 | Medium | Bridge service |
| 4.1 | ~700 | Medium | Integration wiring |
| 4.2 | ~600 | Medium | Integration wiring |
| 4.3 | ~700 | Medium | Advisory generation |
| 4.4 | ~600 | Medium | Price integration |
| 5.1 | ~900 | Medium | 7 models + migration |
| 5.2 | ~1000 | High | Full module scaffold |
| 5.3 | ~1200 | High | Full module scaffold |
| 6.1 | ~800 | Medium | PoP engine + alerts |
| 6.2 | ~700 | Medium | Lifecycle models |

**Total: 24 prompts across 6 phases**

Each prompt is designed to be:
- Self-contained (includes all context needed)
- References existing files to read first
- Specifies exact file paths and conventions
- Under ~1200 tokens of task instruction (within Claude Code's effective working range)
- Produces testable, runnable code
