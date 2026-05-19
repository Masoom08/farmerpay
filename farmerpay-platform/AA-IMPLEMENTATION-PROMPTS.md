# AA — Phase-by-Phase Implementation Prompts for Claude Code

> **How to use:** Open your project folder in Claude Code. The `CLAUDE.md` at the root will be auto-loaded, giving Claude Code full context about your codebase patterns. Then paste one phase prompt at a time. Complete and test each phase before moving to the next.
>
> **Important:** V1 code already exists for all 3 layers (17 files in `src/integrations/accountAggregator/` and `src/modules/aa/`). These prompts build on top of V1 — adding missing tables, hardening services, adding tests, and building frontend screens.
>
> **Design doc:** `AA-SYSTEM-DESIGN-V2.md` contains the complete refined design. Every prompt references it.

---

## Phase 1 — Database Hardening + New Models (Foundation)

### Prompt 1.1: New Sequelize Models + Migration

```
Read AA-SYSTEM-DESIGN-V2.md sections 3.2 (New Tables) and 3.1 (V2 Changes). Create 3 new Sequelize models in src/modules/aa/models/ following the exact pattern in CLAUDE.md (timestamps: true, underscored: true, factory function export, static associate method):

1. src/modules/aa/models/AaTransaction.js
   - Table: aa_transactions
   - BIGINT id (high volume), transaction_uuid (VARCHAR 36 UNIQUE), farmer_id FK, consent_id FK, summary_id FK
   - txn_date DATE, txn_type ENUM('credit','debit'), amount DECIMAL(15,2), balance_after DECIMAL(15,2)
   - narration VARCHAR(500), reference VARCHAR(100), mode VARCHAR(30)
   - income_category VARCHAR(30) NULL, expense_category VARCHAR(30) NULL, classification_confidence DECIMAL(3,2) NULL
   - is_active BOOLEAN
   - Associations: belongsTo User, belongsTo AaConsent, belongsTo AaBankStatementSummary
   - Indexes: farmer_id, consent_id, txn_date, income_category, expense_category, composite (farmer_id, txn_date)

2. src/modules/aa/models/AaFinancialAnalysis.js
   - Table: aa_financial_analyses
   - analysis_uuid, farmer_id FK, consent_id FK
   - analysis_type ENUM('full','health_score_only','summary_only')
   - health_score DECIMAL(5,2), health_grade CHAR(1)
   - score_components JSON, income_summary JSON, expense_summary JSON, seasonality_data JSON, risk_flags JSON, bridge_data JSON
   - analysis_mode ENUM('raw_transactions','summary_fallback')
   - transaction_count INT, period_from DATE, period_to DATE
   - is_latest BOOLEAN, is_active BOOLEAN
   - Indexes: farmer_id, analysis_uuid, composite (farmer_id, is_latest)

3. src/modules/aa/models/AaConsentAuditLog.js
   - Table: aa_consent_audit_logs
   - BIGINT id (immutable audit log, high volume)
   - consent_id FK, farmer_id FK
   - event_type ENUM('consent_requested','consent_approved','consent_rejected','consent_revoked','consent_expired','data_fetched','data_fetch_failed','analysis_run','consent_renewed')
   - event_source ENUM('farmer','system','webhook','admin','scheduler')
   - provider VARCHAR(20), metadata JSON, ip_address VARCHAR(45)
   - Only created_at timestamp (immutable — no updated_at). Set updatedAt: false in model config.
   - Indexes: consent_id, farmer_id, event_type, created_at

Register all 3 new models in src/shared/models/index.js following the pattern used for AaConsent (import, init, add to db object).

Then create a SQL migration file at src/migrations/YYYYMMDD-aa-v2-new-tables.js that:
- Creates all 3 new tables
- ALTERs aa_consents to add 'setu' to the aa_provider ENUM
- ALTERs aa_consents to add columns: consent_handle VARCHAR(100), redirect_url TEXT, provider_consent_id VARCHAR(100), approved_at DATETIME, expires_at DATETIME, last_fetch_at DATETIME, fetch_count INT DEFAULT 0

Use the existing migration pattern from the project (check src/migrations/ for examples).
```

### Prompt 1.2: Update AaConsent Model for V2 Fields

```
Read the existing model at src/modules/sentinel/models/AaConsent.js. Update it to add the V2 columns defined in AA-SYSTEM-DESIGN-V2.md section 3.1:

- Add 'setu' to the aa_provider ENUM: ENUM('finvu', 'onemoney', 'cams', 'nsdl', 'setu')
- Add new fields:
  - consent_handle: STRING(100), nullable (AA provider's handle for this consent)
  - redirect_url: TEXT, nullable (URL farmer is redirected to for approval)
  - provider_consent_id: STRING(100), nullable (AA provider's internal ID)
  - approved_at: DATE, nullable (when consent was approved)
  - expires_at: DATE, nullable (consent expiry date)
  - last_fetch_at: DATE, nullable (last data fetch timestamp)
  - fetch_count: INTEGER, defaultValue 0 (number of data fetches done)

Add association to the new AaTransaction model: hasMany(models.AaTransaction, { foreignKey: 'consent_id', as: 'transactions' })
Add association to AaFinancialAnalysis: hasMany(models.AaFinancialAnalysis, { foreignKey: 'consent_id', as: 'analyses' })
Add association to AaConsentAuditLog: hasMany(models.AaConsentAuditLog, { foreignKey: 'consent_id', as: 'auditLogs' })

Don't break any existing associations.
```

---

## Phase 2 — Service Hardening + New Services

### Prompt 2.1: Webhook Verification + Consent Audit Logging

```
Read AA-SYSTEM-DESIGN-V2.md sections 6 (Webhook Security) and the consent_audit_logs table schema. Create these new services:

1. src/modules/aa/services/aaWebhookVerifier.js
   - Export: verifyWebhook(provider, headers, body) → { valid: boolean, reason?: string }
   - Setu: verify X-Setu-Signature header using HMAC-SHA256 with AA_SETU_WEBHOOK_SECRET
   - Finvu: verify X-Finvu-Signature header using HMAC-SHA256 with AA_FINVU_WEBHOOK_SECRET
   - Also check for webhook deduplication using Redis key aa:webhook:dedup:{eventId} (24h TTL)
   - If AA_ENABLED is false (dev mode), skip HMAC but still check dedup

2. src/modules/aa/services/aaAuditLogger.js
   - Export: logEvent({ consentId, farmerId, eventType, eventSource, provider, metadata, ipAddress })
   - Uses the AaConsentAuditLog model to create an immutable log entry
   - Async — fire-and-forget (wrapped in try/catch, never throws to caller)
   - Log to logger.info as well for structured logging

3. src/modules/aa/services/aaRateLimiter.js
   - Export: canFetch(farmerId) → { allowed: boolean, retryAfterSeconds?: number }
   - Export: recordFetch(farmerId)
   - Uses Redis key aa:fetch:cooldown:{farmerId} with TTL from config (default 60 minutes)
   - Also enforce daily limit: max 5 fetches per farmer per day using aa:fetch:daily:{farmerId}:{date}

Now update the existing aaConsentService.js to:
- Call aaAuditLogger.logEvent() after every state change (initiate, approve, reject, revoke)
- Store consent_handle and redirect_url in the AaConsent record when creating consent
- Call aaWebhookVerifier.verifyWebhook() at the start of processWebhook()

Update aaDataFetchService.js to:
- Call aaRateLimiter.canFetch() before starting a fetch
- Call aaRateLimiter.recordFetch() after successful fetch
- Update consent.last_fetch_at and consent.fetch_count after fetch
- Call aaAuditLogger.logEvent() after data_fetched or data_fetch_failed

Update aaRoutes.js webhook route to pass req.headers to the controller for HMAC verification.
```

### Prompt 2.2: Analysis Orchestrator + Raw Transaction Storage

```
Read AA-SYSTEM-DESIGN-V2.md sections on aa_transactions table and aa_financial_analyses table. Create:

src/modules/aa/services/aaAnalysisOrchestrator.js

This is the new central analysis engine that:
1. Takes farmerId + optional raw transactions
2. If raw transactions provided:
   a. Persist each transaction to aa_transactions table (bulk insert with classification columns)
   b. Run incomeClassifier.classifyAllCredits() on credit transactions
   c. Run expenseDetector.classifyAllDebits() on debit transactions  
   d. Update each aa_transaction row with income_category/expense_category/classification_confidence
   e. Run seasonalityMapper.buildSeasonalityMap() on all transactions
   f. Run financialHealthScorer.computeFinancialHealthScore() with full transaction data
3. If no raw transactions (summary-fallback mode):
   a. Load AaBankStatementSummary records for farmer
   b. Compute simplified scores from summary metrics (use existing computeFromSummary logic)
4. Persist the complete analysis to aa_financial_analyses table:
   - Mark any previous analysis for this farmer as is_latest = false
   - Create new record with is_latest = true
   - Store all component scores, income/expense summaries, seasonality data, risk flags
   - Pre-compute bridge_data JSON for all 5 modules (call each bridge method and store result)
5. Cache in Redis and return the analysis result
6. Call aaAuditLogger.logEvent() with event_type 'analysis_run'

Update aaDataFetchService.js fetchAndStore() to:
- After fetching data from AA provider, pass raw transactions to aaAnalysisOrchestrator.runAnalysis()
- The orchestrator handles transaction persistence and analysis (don't duplicate the logic)

Update aaCrossModuleBridge.js getAnalysis() to:
- First check aa_financial_analyses table for is_latest record
- If found and less than 12 hours old, return from DB (not just Redis)
- If not found, run aaAnalysisOrchestrator as before

Export functions: runAnalysis(farmerId, rawTransactions?), getLatestAnalysis(farmerId), getAnalysisHistory(farmerId, { page, limit })
```

### Prompt 2.3: Expanded Routes, Controller, and Validators

```
Read AA-SYSTEM-DESIGN-V2.md section 4 (API Endpoints). Update the existing files:

1. Update src/modules/aa/validators/aaValidator.js — add schemas for:
   - refreshAnalysisSchema: Joi.object({ force: Joi.boolean().default(false) })
   - transactionsQuerySchema: Joi.object({ page, limit, category, type: Joi.string().valid('credit','debit'), fromDate, toDate })
   - bulkAnalysisSchema: Joi.object({ farmerIds: Joi.array().items(Joi.number().integer()).min(1).max(100) })
   - farmerIdParam: Joi.object({ farmerId: Joi.number().integer().positive().required() })

2. Update src/modules/aa/controllers/aaController.js — add handlers:
   - getAnalysisHistory: GET /analysis/history — returns paginated past analyses
   - getTransactions: GET /analysis/transactions — returns paginated classified transactions
   - refreshAnalysis: POST /analysis/refresh — triggers re-analysis
   - getAdminStats: GET /admin/stats — AA adoption stats (requires banker/admin role)
   - getFarmerAnalysis: GET /admin/farmer/:farmerId/analysis — banker views farmer's analysis
   - triggerBulkAnalysis: POST /admin/bulk-analysis — queues batch analysis via RabbitMQ

3. Update src/modules/aa/routes/aaRoutes.js — add routes:
   - GET /analysis/history → getAnalysisHistory
   - GET /analysis/transactions → getTransactions (validate transactionsQuerySchema as query)
   - POST /analysis/refresh → refreshAnalysis
   - GET /admin/stats → roleCheck('banker', 'admin'), getAdminStats
   - GET /admin/farmer/:farmerId/analysis → roleCheck('banker'), getFarmerAnalysis
   - POST /admin/bulk-analysis → roleCheck('admin'), validate(bulkAnalysisSchema), triggerBulkAnalysis
```

---

## Phase 3 — Workers, Jobs, and DRISHTI Integration

### Prompt 3.1: RabbitMQ Re-Analysis Worker + Data Purge Job

```
Read AA-SYSTEM-DESIGN-V2.md sections 14 (RabbitMQ Queues) and 18 (Scheduled Jobs). Create:

1. src/modules/aa/workers/aaReAnalysisConsumer.js
   - Consume from queue 'aa.reanalysis'
   - Message format: { farmerId, consentId?, force? }
   - For each message: call aaAnalysisOrchestrator.runAnalysis(farmerId)
   - Handle errors gracefully — log and acknowledge (don't requeue failed jobs endlessly)
   - Also consume from 'aa.bulk.analysis' queue — same logic but expects { farmerIds: [] }
   - Process each farmer sequentially with 500ms delay between to avoid overwhelming AA provider

2. src/jobs/aaDataPurgeJob.js
   - Scheduled job using node-cron (check how other jobs in src/jobs/ are structured)
   - Runs daily at 2:00 AM
   - Deletes aa_transactions records where created_at < (now - 24 months)
   - Logs count of purged records
   - Export { start } function matching the pattern in other job files

3. src/jobs/aaConsentExpiryJob.js
   - Runs daily at 6:00 AM
   - Find all AaConsent records where consent_status = 'approved' AND expires_at < now
   - Update them to consent_status = 'expired', is_active = false
   - Log audit event for each expired consent
   - Future: trigger notification to farmer via Sathi (add TODO comment for now)

Register both jobs in src/app.js in the scheduled jobs section, following the try/catch pattern used by other jobs.
```

### Prompt 3.2: Wire AA → DRISHTI Snapshot Builder

```
Read AA-SYSTEM-DESIGN-V2.md section 11 (DRISHTI Integration). This is a critical integration point.

Read the existing DRISHTI snapshot builder at src/modules/drishti/services/snapshotBuilder.js. Update it to:

1. At the end of the data-gathering phase (after pulling from ROOTS, TRUST, DICE, PULSE, SAGE), check if AA data is available:
   - Import getDrishtiInputs from the AA cross-module bridge: require('../../aa/services/aaCrossModuleBridge')
   - Call getDrishtiInputs(farmerId) wrapped in try/catch (AA module is optional)
   - If AA data is available (not null), overlay it onto the snapshot:
     a. Replace self-reported household income with AA-observed income (aaData.householdIncome)
     b. Replace self-reported expenses with AA-observed expenses (aaData.householdExpense)
     c. Add aaData.seasonality to the snapshot for seasonal EMI scheduling
     d. Add aaData.emiCapacity for maximum EMI recommendation
   - If AA data is NOT available, keep the self-reported values (graceful fallback)

2. Add a field to the snapshot: aa_data_available: BOOLEAN (true if AA data was used)

3. Add a field to the snapshot: income_verification_source: ENUM('self_reported', 'account_aggregator', 'mixed')
   - 'account_aggregator' if full AA data replaced self-reported
   - 'mixed' if partial AA data was available
   - 'self_reported' if no AA data

This ensures DRISHTI scenarios automatically use verified bank data when available, making the digital twin significantly more accurate.

Important: Don't break the existing snapshot builder flow. The AA integration should be purely additive — if the AA module is not deployed or has errors, snapshotBuilder must still work exactly as before.
```

---

## Phase 4 — Tests

### Prompt 4.1: Analyzer Unit Tests

```
Read the existing test structure in the project (check __tests__/ or tests/ directories for patterns). Create comprehensive unit tests for all 4 Layer 2 analyzers:

1. src/modules/aa/__tests__/analyzers/incomeClassifier.test.js (~25 tests)
   - Test each of the 10 income categories with realistic Indian bank narrations
   - Test multi-match resolution (e.g., "PM-KISAN DBT" matches both govt_transfer patterns)
   - Test confidence scoring
   - Test the classifyAllCredits batch function
   - Test edge cases: empty narration, very long narration, non-English characters, numeric-only narration
   - Test specific patterns: AMUL DCS payment, APMC mandi receipt, PM-KISAN ₹2000, KCC disbursement

2. src/modules/aa/__tests__/analyzers/expenseDetector.test.js (~15 tests)
   - Test each of the 9 expense categories
   - Test EMI/NACH detection patterns
   - Test farm input brands (IFFCO, Coromandel, Bayer)
   - Test household patterns (LPG, electricity, ration)
   - Test edge cases similar to income classifier

3. src/modules/aa/__tests__/analyzers/seasonalityMapper.test.js (~15 tests)
   - Generate mock 12-month transaction sets for: Kharif farmer, Rabi farmer, Dual-season, Perennial (dairy)
   - Verify correct crop season detection for each
   - Test EMI recommendation logic (monthly vs seasonal_skip vs bullet)
   - Test peak month detection and cash-thin month identification
   - Test income regularity coefficient of variation calculation

4. src/modules/aa/__tests__/analyzers/financialHealthScorer.test.js (~15 tests)
   - Test score computation with known inputs — verify grade boundaries (A:80+, B:65-79, C:50-64, D:35-49, E:<35)
   - Test each component weight (cash flow 25%, balance 20%, diversity 15%, debt 20%, govt 10%, digital 10%)
   - Test perfect-score farmer vs struggling farmer vs new farmer with no data
   - Test module-specific output formatting (drishtiInputs, trustInputs, sentinelInputs)

Use Jest. Create a test helper file src/modules/aa/__tests__/helpers/mockTransactions.js that exports realistic mock transaction datasets for reuse across tests. Include:
- kharifFarmer: 12 months of paddy/rice sale income (Oct-Jan peaks), PM-KISAN quarterly, regular expenses
- dairyFarmer: regular monthly AMUL/DCS credits, daily expenses
- mixedFarmer: combination of farm + salary + govt + SHG income
- stressedFarmer: high bounce count, EMI defaults, deficit months
```

### Prompt 4.2: Service + Integration Tests

```
Create tests for the core services and API routes:

1. src/modules/aa/__tests__/services/aaConsentService.test.js (~15 tests)
   - Mock the AA provider client (setuClient) and Redis
   - Test initiateConsent: creates DB record, calls provider, returns redirect URL
   - Test initiateConsent with existing active consent (should return already_active)
   - Test processWebhook: status update, RabbitMQ queue publish, cache invalidation
   - Test revokeConsent: calls provider, updates DB, clears cache
   - Test normalizeStatus mapping for all provider statuses
   - Test dev mode (AA_ENABLED=false) with mock responses

2. src/modules/aa/__tests__/services/aaDataFetchService.test.js (~10 tests)
   - Mock provider client data session + fetch responses
   - Test fetchAndStore: session creation → polling → normalization → DB persist
   - Test partial-success: some accounts succeed, some fail
   - Test retry logic: data not ready → poll again → eventually completes
   - Test summary computation from raw transactions (computeSummary function)

3. src/modules/aa/__tests__/services/aaCrossModuleBridge.test.js (~15 tests)
   - Mock DB data (AaBankStatementSummary records)
   - Test each bridge method returns correctly formatted data:
     - getTrustInputs: has financialHealthScore, incomeVerification, debtBehavior, govtSchemeAccess
     - getDrishtiInputs: has householdIncome, householdExpense, seasonality, emiCapacity
     - getSentinelInputs: has cashFlowScore, riskFlags, emiSafeMonths, overallRisk
     - getDiceInputs: has verifiedMonthlyIncome, eligibility, repaymentIntelligence
     - getSathiInputs: has preFill, verificationStatus
   - Test null return when no AA data exists for farmer
   - Test computeFromSummary fallback mode

4. src/modules/aa/__tests__/routes/aaRoutes.test.js (~10 tests)
   - Use supertest to test API endpoints
   - Mock auth middleware (inject test user)
   - Test POST /aa/consent returns 201 with redirect URL
   - Test GET /aa/consent returns current status
   - Test GET /aa/analysis returns analysis or 404
   - Test GET /aa/bridge/trust returns TRUST-formatted data
   - Test GET /aa/bridge/invalid returns 400
   - Test POST /aa/webhook/:provider without auth succeeds
   - Test validation errors (missing required fields)

Run all tests with: npx jest src/modules/aa/__tests__/ --verbose
```

---

## Phase 5 — Frontend Integration + Polish

### Prompt 5.1: Farmer App Screens (React Native / Expo)

```
Read AA-SYSTEM-DESIGN-V2.md section 16.1 (Farmer App). Check the existing farmer app structure in the mobile/ or app/ directory for the React Native project structure, navigation patterns, and component conventions.

Create 3 screens and 4 components:

SCREENS:

1. AAConsentScreen.js — The entry point for AA onboarding
   - Explain what Account Aggregator is in simple terms (Hindi + English support via i18n if the app uses it)
   - Show benefits: "See your financial health score", "Get better loan terms", "Faster approval"
   - Provider selection (Setu default, show provider logos)
   - "Connect My Bank" button → calls POST /aa/consent → opens redirect URL in WebView or system browser
   - After redirect back, poll GET /aa/consent/:uuid every 3 seconds until approved/rejected
   - Show success/error state with animation
   - Integrate into the home screen as a card/tile (check how DRISHTI tile was added)

2. FinancialHealthScreen.js — Post-consent health dashboard
   - Large circular gauge showing 0-100 score with grade badge (A/B/C/D/E)
   - Color coding: A=green, B=light-green, C=yellow, D=orange, E=red
   - 6 component cards in a scrollable grid:
     - Cash Flow Stability (25%)
     - Balance Adequacy (20%)
     - Income Diversity (15%)
     - Debt Discipline (20%)
     - Govt Scheme Access (10%)
     - Digital Adoption (10%)
   - Each card shows the component score (0-100) and a one-line insight text
   - Pull-to-refresh triggers POST /aa/analysis/refresh
   - Data source: GET /aa/analysis/health-score

3. TransactionInsightsScreen.js — Income/expense breakdown
   - Two tabs: Income | Expenses
   - Income tab: Pie chart showing income by category (farm_sale, dairy, govt_transfer, etc.)
   - Expense tab: Pie chart showing expense by category
   - Below pie chart: Monthly bar chart (12 bars) showing income vs expense per month
   - Crop season badge: "Kharif Farmer" / "Rabi Farmer" / "Dual Season" / "Year-round"
   - EMI recommendation card at bottom: "Best months to pay EMI: Oct, Nov, Dec, Jan"
   - Data source: GET /aa/analysis

COMPONENTS:

1. HealthScoreGauge.js — Animated circular gauge using react-native-svg
   - Props: score (0-100), grade (A-E), size
   - Animated fill on mount

2. CategoryPieChart.js — Reusable pie chart for income/expense
   - Props: data (array of { category, amount, percentage }), colorScheme
   - Use react-native-svg or victory-native (check what the DRISHTI screens use)

3. MonthlyHeatmap.js — 12-month income vs expense bars
   - Props: monthlyData (array of 12 { month, income, expense })
   - Stacked or grouped bar chart

4. ConsentStatusBadge.js — Shows AA consent status
   - Props: status ('not_initiated', 'requested', 'approved', 'expired', 'revoked')
   - Color-coded badge with icon

Create the API helper: api/aaApi.js with functions: initiateConsent(), getConsentStatus(), getAnalysis(), getHealthScore(), refreshAnalysis() — following the pattern used by other API helpers in the app.
```

### Prompt 5.2: Banker Dashboard Pages (Next.js)

```
Read AA-SYSTEM-DESIGN-V2.md section 16.2 (Banker Dashboard). Check the existing banker dashboard structure for the Next.js project, page patterns, and component conventions. Look at how DRISHTI banker pages were built.

Create 2 pages and 4 components:

PAGES:

1. pages/banker/aa-overview.js — Portfolio-level AA insights
   - KPI cards at top: Total Farmers with AA, Average Health Score, Consent Rate %, High-Risk Count
   - Bar chart: AA adoption rate by branch (horizontal bars)
   - Histogram: Health score distribution (buckets: 0-20, 20-40, 40-60, 60-80, 80-100)
   - Table: Top 10 at-risk farmers (lowest health scores with risk flags)
   - Data source: GET /aa/admin/stats
   - Add this page to the banker sidebar navigation (check how DRISHTI pages were added)

2. pages/banker/farmer/[id]/aa.js — Individual farmer AA detail (banker view)
   - Same layout as farmer's own FinancialHealthScreen but read-only and more detailed
   - Health score gauge + all 6 components
   - Full transaction classification table (sortable, filterable by category)
   - Risk flags timeline with severity badges
   - Seasonality chart: 12-month heatmap
   - "Last updated" timestamp + "Refresh Analysis" button (calls POST /aa/admin/farmer/:id/refresh)
   - Link this from the existing farmer detail page in the banker dashboard
   - Data source: GET /aa/admin/farmer/:farmerId/analysis

COMPONENTS:

1. AAAdoptionChart.js — Recharts horizontal BarChart showing consent rates by branch
2. HealthScoreDistribution.js — Recharts histogram of farmer health scores
3. RiskFlagTimeline.js — Chronological list of risk flags with severity color badges
4. TransactionClassTable.js — Sortable, paginated table of classified transactions with category chips

Create the API helper: lib/aaApi.js (or wherever banker dashboard API helpers live) with functions: getAdminStats(), getFarmerAnalysis(farmerId), refreshFarmerAnalysis(farmerId).
```

### Prompt 5.3: Sathi Dashboard + Seed Data + Final Polish

```
Read AA-SYSTEM-DESIGN-V2.md section 16.3 (Sathi Dashboard). Create:

SATHI PAGES:

1. pages/sathi/aa-onboard.js — Guide farmer through AA consent
   - Step-by-step wizard (3 steps):
     Step 1: "What is Account Aggregator?" — Simple explanation with illustrations
     Step 2: "Choose your bank" — Show supported banks, select AA provider
     Step 3: "Open the link" — Generate consent URL, show QR code or share via WhatsApp
   - Track onboarding progress
   - After consent approved, auto-navigate to health score view

2. pages/sathi/aa-share.js — Share farmer's financial summary
   - Generate a WhatsApp-shareable text summary:
     "🌾 Financial Health Report — [Farmer Name]
      Score: [X]/100 (Grade [Y])
      Monthly Income: ₹[amount]
      Monthly Expense: ₹[amount]
      Crop Season: [Kharif/Rabi]
      Risk Level: [Low/Medium/High]
      Generated via FarmerPay AA"
   - "Share via WhatsApp" button using the existing Twilio/WhatsApp integration or deep link
   - "Copy to Clipboard" button

SEED DATA:

Create src/seeders/aa-seed-data.js that populates test data for development:
- 5 mock farmer AA consents (various statuses: approved, expired, revoked)
- 5 corresponding bank statement summaries with realistic Indian farmer financial profiles:
  - Farmer 1: Kharif paddy farmer, Maharashtra, PM-KISAN recipient, health score ~72
  - Farmer 2: Dairy farmer (AMUL DCS), Gujarat, regular monthly income, health score ~81
  - Farmer 3: Mixed farmer + MGNREGA, Madhya Pradesh, some bounces, health score ~55
  - Farmer 4: Fishery farmer, coastal AP, seasonal income, health score ~48
  - Farmer 5: Horticulture + SHG, Karnataka, diverse income, health score ~76
- Corresponding aa_financial_analyses records with pre-computed scores and bridge data
- 100 sample aa_transactions (20 per farmer) with realistic narrations and classifications

FINAL POLISH:

1. Update CLAUDE.md to add the AA module alongside DRISHTI in the "Latest completed module" section and add the AA file structure to the module listing.

2. Create the Swagger tag description for AA module (add to the swaggerOptions in app.js if needed).

3. Verify all files compile and the app starts without errors. Run: node -e "require('./src/modules/aa')" to check for import errors.
```

---

## Tips for Using These Prompts

1. **Run one prompt at a time.** Wait for Claude Code to finish and test before moving to the next.
2. **Always reference the design doc.** Each prompt tells Claude Code to read `AA-SYSTEM-DESIGN-V2.md` — this is intentional. The design doc has exact table schemas, API contracts, and component details.
3. **V1 code exists.** Prompts 2.x modify existing files — Claude Code should read them first and make surgical updates, not rewrite from scratch.
4. **Test incrementally.** After each prompt, ask Claude Code: "Write a quick test for [the thing we just built] and run it."
5. **If something doesn't match the pattern,** tell Claude Code: "Check how the drishti module does this and follow the same pattern."
6. **Phase 4 (tests) before Phase 5 (frontend).** This is intentional — backend must be solid before building UI on top.
7. **Frontend structure may vary.** Phase 5 prompts reference generic paths. When pasting, tell Claude Code: "Check the actual project structure for the farmer app / banker dashboard and place these files correctly."

---

## Phase Dependency Graph

```
Phase 1 (DB + Models)
    │
    ├──► Phase 2 (Service Hardening)
    │        │
    │        ├──► Phase 3 (Workers + DRISHTI Bridge)
    │        │        │
    │        │        └──► Phase 4 (Tests) ──► Phase 5 (Frontend)
    │        │
    │        └──► Phase 4 can start concurrently with Phase 3
    │
    └──► Phase 1.2 can run immediately after 1.1
```

**Estimated effort:** ~3–4 Claude Code sessions per phase, ~15–20 sessions total.
