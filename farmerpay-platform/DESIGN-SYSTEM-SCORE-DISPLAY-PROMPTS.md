# Score Display Pattern — Implementation Prompt Playbook

**Pair with:** `DESIGN-SYSTEM-SCORE-DISPLAY.md`
**Target agent:** Claude Code (or any capable coding agent) working in this repo
**Execution mode:** Run prompts in order. Each prompt is self-contained and names its files, conventions, and acceptance criteria. Verify after each step before moving on.

---

## How to use this file

Every prompt in this playbook follows the same shape:

1. **Goal** — one sentence.
2. **Context to read first** — exact files the agent must read before editing.
3. **What to build** — scoped deliverables with file paths.
4. **Conventions to follow** — pointers into `CLAUDE.md`.
5. **Out of scope** — explicit guardrails.
6. **Acceptance criteria** — verifiable outcomes.
7. **Verification step** — command(s) to run before declaring done.

Paste one prompt at a time. Do not batch — the verification step after each prompt is load-bearing because later prompts depend on earlier contracts being correct.

**Before the first prompt:** point the agent at both design docs:

> Read `CLAUDE.md`, `DESIGN-SYSTEM-SCORE-DISPLAY.md`, `AA-SYSTEM-DESIGN-V2.md`, and `DRISHTI-SYSTEM-DESIGN.md` before starting. These are the source of truth for conventions, module boundaries, and the pattern being implemented. Do not invent new conventions.

---

## Phase 0 — Tokens and shared primitives

### Prompt 0.1 — Add decision and band design tokens

**Goal:** Introduce the `decision.*` and `band.*` token families so downstream components have stable references.

**Context to read first:**
- `DESIGN-SYSTEM-SCORE-DISPLAY.md` → "New / updated tokens" section
- The existing shared design-token location (search for `tokens`, `theme`, or `colors` under `shared/` and the farmer app and banker dashboard token files)

**What to build:**
- Add `decision.approve`, `decision.conditional`, `decision.refer`, `decision.decline` color tokens (light + dark values from the design doc).
- Add `band.strong`, `band.building`, `band.low` semantic bands with i18n-ready label keys (`band.strong.label`, etc.).
- Export both families from whatever the project's central token module is.
- Update the token documentation file if one exists; otherwise add a short README next to the token definitions.

**Conventions to follow:**
- Do not hardcode hex values in components later — everything must resolve through the token module.
- `decision.decline` is neutral grey, not red. Red stays reserved for SENTINEL fraud flags.

**Out of scope:**
- Do not rename or remove any existing tokens.
- Do not change typography or spacing tokens.

**Acceptance criteria:**
- Token families exported and typed (if TypeScript).
- Light and dark values present for each decision token.
- No hex values introduced outside the token file.

**Verification:**
- Grep for the new token names — they should only be defined in one place and imported elsewhere.
- Build the farmer app and banker dashboard; both should compile with no new warnings.

---

## Phase 1 — Backend: Readiness service and permission gating

### Prompt 1.1 — Create `readinessService.js`

**Goal:** Add a single service that composes TRUST + FHS + role into the role-appropriate projection.

**Context to read first:**
- `CLAUDE.md` → "Pattern: Services"
- `src/modules/aa/services/aaCrossModuleBridge.js`
- `src/modules/trust/` (find how the TRUST score is exposed)
- `src/modules/aa/services/analyzers/financialHealthScorer.js`

**What to build:**
- New module: `src/modules/readiness/` with the standard layout (routes, controller, service, validator).
- `readinessService.js` exports:
  - `getLoanReadinessState(farmerId, { role })` → returns `{ state, band: {trust, fhs}, coachingPriority, reasons[], stalenessFlags }` shaped to the caller's role.
  - Role projections:
    - `farmer` → full state, TRUST + FHS bands, numeric scores only if `showNumericScores` preference is true.
    - `sathi` → state, TRUST band + number, **no FHS fields**, `coachingPriority` derived from TRUST + behavioural + state.
    - `banker` → state, both bands, both numeric scores, component breakdowns, matrix cell, recommended action.
- Threshold lookup: read `T_cutoff` and `F_cutoff` from a `bank_product_config` source (create a stub table read if the table doesn't exist yet; note it as a follow-up).
- Redis caching via `setWithTTL` / `getKey` / `deleteKeys`. Cache key must include role so a Sathi-role cache cannot be served to a farmer or banker.

**Conventions to follow:**
- Lazy DB loading (`getDb()`).
- Snake_case in DB, camelCase in returned DTOs.
- Throw `err.statusCode` + `err.errorCode` on missing inputs (e.g., `READINESS_TRUST_MISSING`, `READINESS_FHS_MISSING`).
- Use `logger.info/warn/error` — never `console.log`.

**Out of scope:**
- Do not modify TRUST or FHS scoring logic. Read-only consumers.
- Do not add any write endpoints here — readiness is derived, not stored.

**Acceptance criteria:**
- Calling with `role: 'sathi'` returns an object where FHS numeric + band + components are absent (not null — absent keys).
- Calling with `role: 'farmer'` where `showNumericScores` is false returns bands but not numeric scores.
- Calling with `role: 'banker'` returns all fields plus a `matrixCell` field of `approve | conditional | refer | decline`.
- Cache keys: `readiness:{farmerId}:{role}:{showNumericScores}`.

**Verification:**
- Write a unit test per role that asserts the shape of the returned object.
- Assert that serializing the Sathi response to JSON does not contain the strings "fhs", "financialHealth", or raw transaction fields.

---

### Prompt 1.2 — Enforce role gating at the bridge layer

**Goal:** Make it structurally impossible for a Sathi role to receive FHS from any path.

**Context to read first:**
- `src/modules/aa/services/aaCrossModuleBridge.js`
- `middleware/roleCheck.js`

**What to build:**
- In `aaCrossModuleBridge`, every exported function that returns FHS or transaction-derived data must accept a `{ callerRole }` argument and throw `403 READINESS_ROLE_FORBIDDEN` if `callerRole === 'sathi'`.
- Add a helper `assertRoleAllowed(role, allowedRoles)` used by each function.
- Update controllers that call the bridge to pass `req.user.role` through.

**Conventions to follow:**
- Standard error-throwing convention (`err.statusCode`, `err.errorCode`).
- Do not rely on UI filtering — this is the last line of defence.

**Out of scope:**
- Do not change the bridge's external contract for farmer or banker roles.

**Acceptance criteria:**
- Calling any FHS-returning bridge function with `callerRole: 'sathi'` throws 403.
- Controllers explicitly pass role; no default fallbacks.

**Verification:**
- Unit tests per exported function asserting the 403 for Sathi.
- Grep to confirm every bridge export has a role check.

---

### Prompt 1.3 — Routes and controller for readiness

**Goal:** Expose the readiness state over HTTP with role-aware responses.

**Context to read first:**
- `CLAUDE.md` → "Pattern: Routes" and "Pattern: Controllers"

**What to build:**
- `src/modules/readiness/routes/readinessRoutes.js` — authenticated routes:
  - `GET /readiness/:farmerUuid` — returns role-shaped readiness.
  - `GET /readiness/:farmerUuid/why` — returns the drill-down (reasons, component contributions, next steps).
- `src/modules/readiness/controllers/readinessController.js` — uses `resolveUserId` pattern for farmer self-queries; for banker and Sathi queries, resolves target farmer by UUID with the appropriate role check.
- `src/modules/readiness/validators/readinessValidator.js` — Joi schema for the farmer UUID path param.
- Swagger JSDoc above each route.

**Conventions to follow:**
- All routes via `router.use(authenticate)`.
- Bankers and Sathis must hit `roleCheck('banker')` / `roleCheck('sathi')` when querying another farmer.
- Response format: `success(res, { message, data, meta?, statusCode? })`.

**Out of scope:**
- Do not add write endpoints.
- Do not add admin or export endpoints in this phase.

**Acceptance criteria:**
- A farmer querying another farmer's UUID receives 403.
- A Sathi response JSON contains no FHS fields.
- A banker response includes `matrixCell` and both bands.

**Verification:**
- Integration tests: one per role, asserting status codes and field presence/absence.

---

## Phase 2 — Farmer app

### Prompt 2.1 — `<LoanReadinessBadge>` component

**Goal:** Build the single-state home-screen badge.

**Context to read first:**
- `DESIGN-SYSTEM-SCORE-DISPLAY.md` → "Pattern 1 — Farmer App"
- The farmer app's existing screen and component structure (likely `apps/farmer/src/screens/Home` and `apps/farmer/src/components`)
- Existing i18n setup for the farmer app

**What to build:**
- `apps/farmer/src/components/readiness/LoanReadinessBadge.tsx`
  - Props: `state: 'ready' | 'almost' | 'notReady' | 'needsData'`, `onPress?: () => void`.
  - Icon + color token + localized label from `i18n` keys (`readiness.state.ready`, etc.).
  - Minimum touch target 48×48 dp.
  - Accessibility label announcing state + "Tap for details".
- i18n strings added for English, Hindi, Marathi, Telugu, Kannada, Odia (placeholder if translations unavailable — mark with `// TODO: translation`).

**Conventions to follow:**
- No hardcoded colors — use `decision.*` and `semantic.*` tokens.
- No color-only signaling — every state has icon + label.

**Out of scope:**
- Do not wire to the backend yet. Use a static prop in this prompt.
- Do not build the drill-down view in this prompt.

**Acceptance criteria:**
- Component renders for all four states in a Storybook or equivalent preview.
- Snapshot or visual regression coverage per state.
- Screen reader announces correct string per state.

**Verification:**
- Run the farmer app; render the badge on a test screen with each state.
- Run a11y linter (if configured) on the component.

---

### Prompt 2.2 — `<ReadinessWhy>` drill-down screen

**Goal:** Second-level screen that shows both scores as contributing factors with qualitative bands.

**Context to read first:**
- The readiness API contract from Prompt 1.3
- The farmer app navigation stack

**What to build:**
- `apps/farmer/src/screens/readiness/ReadinessWhyScreen.tsx`
  - Fetches `GET /readiness/:farmerUuid/why`.
  - Renders TRUST row (band + optional number), FHS row (band + optional number), "What will help" action list.
  - Honors a `showNumericScores` user preference (default off for new users).
  - Adds settings toggle for `showNumericScores` in the profile/settings screen.
- Route registration in the farmer app navigator.

**Conventions to follow:**
- All strings via i18n.
- Loading/error/empty states present.

**Out of scope:**
- Do not surface component-level FHS breakdown on this screen — that is banker-only.

**Acceptance criteria:**
- When `showNumericScores` is false, no numeric scores appear.
- "What will help" routes to either the Sathi contact flow or the AA consent flow, depending on `stalenessFlags`.

**Verification:**
- Manual QA with the toggle on and off.
- Snapshot test per variant (scores shown / hidden / stale FHS).

---

### Prompt 2.3 — Home screen integration

**Goal:** Replace any existing dual-score display on the farmer home screen with the new badge.

**Context to read first:**
- Current home screen in the farmer app.

**What to build:**
- Remove TRUST + FHS side-by-side display (if present).
- Place `<LoanReadinessBadge>` above the fold, wired to readiness API.
- `onPress` navigates to `ReadinessWhyScreen`.

**Out of scope:**
- Do not remove any other home-screen tiles (DRISHTI, Vyapar, Sathi, etc.).

**Acceptance criteria:**
- Only the single readiness badge shows the readiness concept on the home screen.
- Old dual-score component is deleted (not commented out) if it was only used on home.

**Verification:**
- Screen test + manual QA on a device emulator.

---

## Phase 3 — Sathi dashboard

### Prompt 3.1 — Remove FHS from Sathi views

**Goal:** Strip any FHS rendering from the Sathi dashboard.

**Context to read first:**
- The Sathi Next.js dashboard (likely `apps/sathi/`).
- Find every reference to `financialHealth`, `fhs`, or the FHS score in the Sathi codebase.

**What to build:**
- Delete FHS columns, cards, and drill-downs from Sathi farmer lists and detail screens.
- Replace with a `<CoachingPriority>` badge fed from the readiness API (`coachingPriority` field).

**Conventions to follow:**
- If a component was shared between Sathi and banker, fork it — do not weaken the banker view.

**Out of scope:**
- Do not change farmer-declared income/expense views that the Sathi themselves collected — those remain.

**Acceptance criteria:**
- Grep for `fhs` or `financialHealth` in `apps/sathi/` returns zero matches after this prompt.
- Sathi dashboard compiles and renders without FHS.

**Verification:**
- Visual QA of Sathi farmer detail page.
- Automated test that scrapes the rendered DOM for forbidden strings.

---

### Prompt 3.2 — Coaching priority surfacing

**Goal:** Make Coaching Priority the Sathi's primary workload lens.

**What to build:**
- Sort and filter Sathi farmer list by `coachingPriority` (High → Medium → Low).
- Add a filter chip set for priority.
- Add a "gap areas" list on the farmer detail page populated from readiness `reasons[]` — text only, no numeric FHS inputs.

**Acceptance criteria:**
- A Sathi can filter their farmer list to just High priority and see a non-numeric reason per farmer.

**Verification:**
- Manual QA.
- Integration test: Sathi request to readiness API never returns FHS fields.

---

## Phase 4 — Banker dashboard

### Prompt 4.1 — `<DecisioningMatrix>` component

**Goal:** 2×2 matrix with TRUST × FHS, mapped to four actions.

**Context to read first:**
- `DESIGN-SYSTEM-SCORE-DISPLAY.md` → "Pattern 3 — Banker Dashboard"
- Banker dashboard's existing chart/component folder (likely `apps/banker/src/components`)

**What to build:**
- `apps/banker/src/components/underwriting/DecisioningMatrix.tsx`
  - Props: `trust: number`, `fhs: number`, `trustCutoff: number`, `fhsCutoff: number`, `cell: 'approve' | 'conditional' | 'refer' | 'decline'`, `productConfig: {...}`.
  - Pure SVG or Recharts — no new charting dependency.
  - Keyboard-navigable (arrow keys between cells).
  - Each cell has `aria-label` describing combination + action.
  - Axis thresholds visible numerically.
  - Uses `decision.*` tokens.

**Conventions to follow:**
- No hex values.
- Color + text label on every cell — never color-only.

**Out of scope:**
- Do not build the stress-lens overlay in this prompt.
- Do not build the score breakdown panel in this prompt.

**Acceptance criteria:**
- Renders for all four cells in Storybook or equivalent.
- Keyboard navigation works across cells.
- Screen reader announces cell + action.

**Verification:**
- a11y audit via axe-core or equivalent.
- Snapshot tests per cell.

---

### Prompt 4.2 — `<ScoreBreakdown>` supporting panel

**Goal:** Below the matrix, render TRUST and FHS as side-by-side breakdowns without competing for primary visual weight.

**What to build:**
- `apps/banker/src/components/underwriting/ScoreBreakdown.tsx`
- Two columns: TRUST components (identity, behavioural, repayment, attestation) and FHS components (income stability, expense discipline, seasonality fit, surplus, debt service, volatility).
- Each component shows a numeric contribution.

**Acceptance criteria:**
- Component consumes the banker-role readiness response shape directly.
- Missing components render a clear "not enough data" state, not 0.

---

### Prompt 4.3 — `<DrishtiStressLens>` overlay

**Goal:** Reframe DRISHTI scenarios as shifts on the same matrix.

**Context to read first:**
- `DRISHTI-SYSTEM-DESIGN.md`
- Any existing DRISHTI banker dashboard component.

**What to build:**
- `apps/banker/src/components/underwriting/DrishtiStressLens.tsx`
- Receives baseline `{trust, fhs}` and a list of DRISHTI scenarios from the DRISHTI API.
- For each scenario, plots an arrow or ghost marker on the matrix showing the farmer's stressed position.
- Default scenario set: baseline, climate stress (−20% yield / −10% price), market timing adverse (late monsoon). Banker-selectable from the full DRISHTI library.
- Updates the recommended action label to reflect the worst-case cell across scenarios.

**Out of scope:**
- Do not add new DRISHTI scenarios — consume what DRISHTI exposes.

**Acceptance criteria:**
- Toggling scenarios on/off does not refetch the farmer's base scores.
- Worst-case action is clearly distinguished from baseline.

---

### Prompt 4.4 — Banker farmer detail page integration

**Goal:** Wire the three components together on the existing banker farmer detail page.

**What to build:**
- Matrix at the top, ScoreBreakdown below, DrishtiStressLens inline on the matrix as a toggle.
- Use the banker-role readiness response as the single data source.

**Acceptance criteria:**
- No network calls duplicate scores — one readiness fetch powers the whole surface.
- Matrix updates if the banker changes `trustCutoff` or `fhsCutoff` locally (for what-if analysis) without refetching.

---

## Phase 5 — Audit and governance

### Prompt 5.1 — Decision audit log

**Goal:** Every banker view of a farmer's matrix writes an immutable audit record.

**Context to read first:**
- `AA-SYSTEM-DESIGN-V2.md` → audit logging patterns (`AaConsentAuditLog`)

**What to build:**
- New model `ReadinessDecisionAuditLog` (or extend an existing audit table if one fits).
- Fields: `id, farmer_id, banker_user_id, trust_score, fhs_score, matrix_cell, recommended_action, scenarios_applied, ip, user_agent, viewed_at`.
- Immutable — no update paths.
- Hook into the readiness controller so a banker-role GET triggers a write (fire-and-forget, non-blocking).

**Acceptance criteria:**
- Audit row created on every banker view.
- Model has no update methods exposed.

**Verification:**
- Integration test: banker query creates exactly one audit row.

---

### Prompt 5.2 — Threshold config surface

**Goal:** Expose `T_cutoff` and `F_cutoff` as per-bank, per-product configurable values.

**What to build:**
- Extend or create `bank_product_config` table with `trust_cutoff` and `fhs_cutoff`.
- Admin endpoint (behind `roleCheck('admin', 'bankPolicy')`) to update cutoffs.
- Version history on changes.

**Out of scope:**
- Do not build a full admin UI — API + audit is enough for this phase.

---

## Phase 6 — Tests and verification

### Prompt 6.1 — End-to-end role tests

**Goal:** Prove that the shape contract holds per role across the full stack.

**What to build:**
- An integration test suite under `tests/e2e/readiness/`:
  - Farmer: receives bands, no numeric by default, gets drill-down.
  - Sathi: receives TRUST + CoachingPriority, zero FHS fields anywhere in the response tree.
  - Banker: receives full matrix + scenarios + audit trigger.
- Fixture: one farmer with high/high, one with high/low, one with low/high, one with low/low.

**Acceptance criteria:**
- CI runs the suite green.
- Sathi-role test asserts the response JSON serialized as a string does not contain `"fhs"`, `"financialHealth"`, or transaction-level keys.

---

### Prompt 6.2 — Visual regression on role-gated surfaces

**Goal:** Prevent future UI changes from leaking FHS into the Sathi view.

**What to build:**
- Visual regression snapshots (Percy, Chromatic, or equivalent — whatever the repo uses) for:
  - Farmer home + drill-down, numeric on/off.
  - Sathi farmer list + detail.
  - Banker farmer detail (baseline + stress scenarios toggled).

**Acceptance criteria:**
- Baseline snapshots committed.
- CI fails on unintended visual diffs.

---

## Phase 7 — Rollout and migration

### Prompt 7.1 — Feature flag wiring

**Goal:** Ship behind a flag so each persona's rollout is independently controllable.

**What to build:**
- Three flags: `readiness.farmerBadge`, `readiness.sathiCoachingPriority`, `readiness.bankerMatrix`.
- Flag checks at the route level (backend) and at the screen level (frontend).
- Default off in production, on in staging.

**Acceptance criteria:**
- Flipping any flag off returns the previous behaviour cleanly.
- No partial rollout leaves a persona seeing a broken screen.

---

### Prompt 7.2 — Migration of existing Sathi screens

**Goal:** Make sure the FHS removal does not regress Sathi workflows.

**What to build:**
- A shadow release where the Sathi dashboard logs which fields its frontend tries to read from the readiness API.
- Run for a week; confirm nothing requests FHS.
- Only then delete the FHS-related code paths in the Sathi bundle.

---

## Prompt conventions recap

Every prompt should, when pasted into the agent, include:

1. The sentence "Follow `CLAUDE.md` conventions for services, controllers, models, and validators."
2. A "verify with `npm test -- <path>`" or equivalent step before declaring done.
3. A "do not modify files outside the listed paths" guardrail.
4. A "if a contract is ambiguous, stop and ask — do not guess" instruction.

---

## What this playbook deliberately does not do

- It does not tell the agent to invent new score mechanics. TRUST and FHS scoring are unchanged.
- It does not hand off end-to-end in one prompt. Each prompt ends at a verifiable boundary because later prompts depend on the earlier contract being correct.
- It does not centralize all copy. i18n strings are added per feature prompt so translators can work in parallel.
- It does not prescribe a specific testing framework — it defers to whatever the repo already uses.

---

## Changelog

| Date | Change |
|------|--------|
| 2026-04-13 | Initial playbook |
