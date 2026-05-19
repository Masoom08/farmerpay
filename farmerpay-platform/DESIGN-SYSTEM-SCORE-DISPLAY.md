# FarmerPay Design System — Score Display Pattern

**Status:** Proposed extension
**Owners:** Product + Design
**Last updated:** 2026-04-13
**Related modules:** TRUST, AA V2, DRISHTI
**Supersedes:** Any ad-hoc score rendering currently in farmer app, Sathi dashboard, or banker dashboard

---

## Problem

FarmerPay now surfaces two scores that look superficially similar but measure different things:

- **TRUST Score** — Identity, behavioural, and repayment reliability (who the farmer is). Slow-moving, reputational.
- **Financial Health Score (FHS)** — Cash-flow capacity derived from bank statement analysis via AA V2 (what the farmer's money looks like right now). Fast-moving, updated per AA fetch.

Showing both scores as peers creates three risks:

1. **Cognitive overload** for semi-literate farmers who try to reconcile two numbers.
2. **Privacy leakage** — FHS is derived from raw bank transactions. Exposing it to Sathis (field agents) is disproportionate to their job.
3. **Decision drift** for bankers — divergent scores invite inconsistent, informal weightings across underwriters.

This document defines a role-based score display pattern so each audience sees only the lens they need, with the underlying numbers accessible only where appropriate.

---

## Core Principle

> Never present TRUST and FHS as competing grades. Present them as inputs to a single decision, framed for the viewer's job to be done.

Each persona gets a different primary artifact:

| Persona | Primary surface | TRUST visibility | FHS visibility |
|---------|-----------------|------------------|----------------|
| Farmer | Loan-Readiness State | Drill-down ("why") | Drill-down ("why") |
| Sathi | TRUST + behavioural signals only | Full | **Hidden** |
| Banker | 2×2 Decisioning Matrix | Full | Full |
| Banker (portfolio) | DRISHTI-framed stress view | Full | Full, scenario-adjusted |

---

## Pattern 1 — Farmer App: Loan-Readiness State

### Problem it solves
Semi-literate farmers need a yes/no/maybe signal, not two numbers to reconcile. Raw scores feel like exam grades and create anxiety without actionable meaning.

### Proposed design

**Primary component: `<LoanReadinessBadge>`**

A single traffic-light state rendered with an icon, a color, and a short vernacular phrase. Lives on the home screen and on the loan journey entry point.

#### States

| State | Color token | Icon | Hindi label (example) | English label | Meaning |
|-------|-------------|------|----------------------|---------------|---------|
| Ready | `semantic.success.600` | check-circle-filled | तैयार | Loan-Ready | TRUST ≥ T1 AND FHS ≥ F1 |
| Almost ready | `semantic.warning.500` | clock-filled | लगभग तैयार | Almost Ready | One dimension below threshold; coaching available |
| Not ready | `semantic.neutral.500` | info-circle | अभी तैयार नहीं | Not Ready Yet | Both dimensions below threshold, or hard-block on TRUST |
| Needs data | `semantic.info.500` | upload | जानकारी जोड़ें | Add Info | AA consent not granted or expired |

**Important:** the "Not Ready Yet" state must never render in red. Red is reserved for errors and rejections; farmer-facing readiness uses neutral grey to avoid shame-based framing.

#### Drill-down: `<ReadinessWhy>`

Tapping the badge opens a second-level view titled **"आप तैयार क्यों हैं / क्यों नहीं"** (Why you are / aren't ready). Only here do the two scores appear, and only as contributing factors:

```
Your Loan-Readiness
┌───────────────────────────────┐
│  ● Almost Ready               │
└───────────────────────────────┘

Why:
  ✓ Trust — Strong (87)         [TRUST score]
    You've been verified and you repay on time.

  ⚠ Financial Health — Building (62)   [FHS score]
    Your monthly surplus is thin after expenses.

What will help:
  • Update harvest income in Vyapar
  • Complete one more Sathi visit
  → Talk to your Sathi
```

Numbers are shown alongside qualitative labels (Strong / Building / Low) so the label, not the number, carries the meaning for low-literacy users. Numbers can be hidden entirely via a user preference.

#### Accessibility

- Icon + color + text label (no color-only signaling) — satisfies WCAG 1.4.1.
- Minimum touch target 48×48 dp.
- Screen reader announcement: "Loan readiness: Almost ready. Tap for details."
- Hindi, English, and regional language (Marathi, Telugu, Kannada, Odia) strings driven by `i18n` keys, not hardcoded.
- Number optionality: a settings toggle `showNumericScores` (default off for new users) lets farmers see raw scores if they prefer.

#### Tokens used

- Color: `semantic.success.600`, `semantic.warning.500`, `semantic.neutral.500`, `semantic.info.500`
- Typography: `heading.lg` for badge label, `body.md` for "why" rows
- Spacing: `spacing.md` internal padding, `spacing.sm` between rows
- Elevation: `elevation.1` (card rests on home surface)

#### Do's and Don'ts

| Do | Don't |
|----|-------|
| Show a single readiness state above the fold | Show TRUST and FHS side by side on the home screen |
| Use qualitative labels ("Strong", "Building") as the primary | Lead with raw numbers for semi-literate users |
| Keep "Not Ready" in neutral grey | Use red for farmer-facing readiness states |
| Route to the Sathi when readiness is Almost/Not Ready | Show generic error copy without a next step |

---

## Pattern 2 — Sathi Dashboard: TRUST-Only View

### Problem it solves
Sathis are field agents, not underwriters. Their job is behavioural: verification visits, repayment nudging, data collection. They do not need, and should not see, the farmer's bank statement-derived financial health — that is a privacy and proportionality violation.

### Proposed design

**Primary component: `<SathiFarmerCard>`**

A farmer row in the Sathi dashboard shows:

- TRUST score + band (Strong / Building / Low)
- Behavioural signals (last visit, repayment pattern, KYC status, flagged alerts from SENTINEL)
- Loan-readiness state **as a label only** (Ready / Almost Ready / Not Ready Yet / Needs Info) so the Sathi knows where to focus coaching
- **No FHS number, no FHS band, no bank statement-derived insights**

What the Sathi *can* see related to finances is limited to farmer-declared data they themselves helped collect (household income sources, expenses entered in the Sathi-guided flow). This is data the farmer shared with them directly, not data derived from banking rails.

#### Permission boundary

The AA cross-module bridge (`aaCrossModuleBridge.js`) must **not** expose FHS or underlying transaction-derived fields to Sathi-role callers. Enforced at the service layer, not the UI layer, so a compromised frontend cannot leak it.

Role matrix to encode in `roleCheck`:

| Field | Farmer (self) | Sathi | Banker |
|-------|--------------|-------|--------|
| TRUST score (numeric) | View | View | View |
| TRUST band | View | View | View |
| FHS score (numeric) | View (opt-in) | **Deny** | View |
| FHS band | View | **Deny** | View |
| FHS component breakdown | View | **Deny** | View |
| Raw AA transactions | View | **Deny** | View (aggregated only) |
| Loan-readiness state | View | View | View |

#### Copy change on the Sathi dashboard

Replace any current "Financial Score" column with "Coaching Priority", which is a derived, non-numeric Sathi-facing signal:

- **High** — farmer is Not Ready or Almost Ready with a coachable gap (data missing, overdue visit)
- **Medium** — farmer is Almost Ready with external blockers (seasonal, structural)
- **Low** — farmer is Ready

Coaching Priority is computed server-side from TRUST + behavioural state + loan-readiness, without exposing the underlying FHS inputs.

#### Do's and Don'ts

| Do | Don't |
|----|-------|
| Show Coaching Priority as the Sathi's workload signal | Show FHS number, band, or components to a Sathi |
| Let Sathis see farmer-declared income/expense they collected | Let Sathis see AA-derived cash-flow data |
| Enforce field-level authorization in the service layer | Rely on the frontend to hide FHS |

---

## Pattern 3 — Banker Dashboard: Decisioning Matrix

### Problem it solves
Bankers in volume lending need a single decisioning number, but underwriting quality degrades when you collapse two independent signals into one weighted score. The 2×2 matrix preserves both inputs while producing one action.

### Proposed design

**Primary component: `<DecisioningMatrix>`**

A 2×2 grid with TRUST on one axis and FHS on the other, each split at a configurable threshold. Each cell maps to a recommended action and a suggested product configuration.

```
                        Financial Health →
                 Low                    High
            ┌──────────────────┬──────────────────┐
       High │  Conditional     │  Approve         │
   Trust    │  Approve         │                  │
     ↑      │  (cash-flow      │  Standard terms  │
            │   coaching)      │                  │
            ├──────────────────┼──────────────────┤
       Low  │  Decline         │  Refer           │
            │                  │  (verify first)  │
            │                  │                  │
            └──────────────────┴──────────────────┘
```

#### Cells

| Cell | Recommended action | Suggested product config | Rationale |
|------|-------------------|--------------------------|-----------|
| High TRUST, High FHS | **Approve** | Standard ticket, standard rate, standard tenor | Reliable person with capacity |
| High TRUST, Low FHS | **Conditional Approve** | Reduced ticket, EMI aligned to crop season, Vyapar-coached repayment | Reliable person, current cash-flow thin — structure around it |
| Low TRUST, High FHS | **Refer for Review** | Hold for banker verification + extra KYC/Sathi visit | Capacity exists but reliability unproven — don't decline, verify |
| Low TRUST, Low FHS | **Decline** | Offer coaching path + re-apply window (e.g. 90 days) | Neither signal supports lending today |

Thresholds (`T_cutoff`, `F_cutoff`) are configurable per bank partner and per product, stored in `bank_product_config` so portfolio policy is versioned and auditable.

#### Supporting component: `<ScoreBreakdown>`

Shown below the matrix, the breakdown panel renders both numeric scores with their bands and component contributions:

- TRUST: identity, behavioural, repayment history, attestation
- FHS: income stability, expense discipline, seasonality fit, surplus, debt service, volatility

Bankers can drill into either score's components without ever seeing them as competing grades.

#### Supporting component: `<DrishtiStressLens>`

DRISHTI scenario outputs are framed inside the same matrix surface as the question: **"What if cash flow degrades?"**

The lens re-plots the farmer's position on the matrix under three DRISHTI scenarios:

- Baseline (current)
- Climate stress (−20% yield, −10% price)
- Market timing adverse (late monsoon)

If the farmer moves from High→Low on the FHS axis under a realistic stress, the recommended action shifts accordingly (e.g., Approve → Conditional Approve). This keeps DRISHTI's output actionable rather than academic, and makes the banker's risk appetite explicit rather than intuited.

#### States

| State | When | Behavior |
|-------|------|----------|
| Default | Both scores fresh (< 30 days) | Matrix renders with live scores |
| Stale FHS | AA fetch older than 90 days | Matrix renders, FHS axis shows "stale" badge, decision defaults to Refer |
| Missing FHS | No AA consent | Matrix collapses to 1D TRUST-only view with "Request AA consent" CTA |
| Missing TRUST | New farmer, no history | Matrix disabled, Sathi onboarding CTA |

#### Accessibility

- 2×2 matrix must be navigable by keyboard (arrow keys between cells).
- Each cell has an `aria-label` describing the combination and the action.
- Color alone does not encode the decision — every cell has a text label.
- Thresholds visible numerically on axis so the decision is auditable.

#### Tokens used

- Color: `decision.approve`, `decision.conditional`, `decision.refer`, `decision.decline` (new semantic token family)
- Typography: `heading.md` for cell action, `body.sm` for product config
- Spacing: `spacing.lg` matrix padding, `spacing.md` inter-cell
- Elevation: `elevation.2` (matrix is a primary decision surface)

#### Do's and Don'ts

| Do | Don't |
|----|-------|
| Always show both scores alongside the matrix | Hide FHS or TRUST behind the composite decision |
| Make thresholds visible and configurable | Hardcode cutoffs in the UI |
| Frame DRISHTI as "same matrix, stressed" | Show DRISHTI outputs on a separate screen the banker has to context-switch to |
| Default to Refer on stale data | Auto-approve on cached or expired FHS |

---

## New / updated tokens

### Decision semantic colors (new)

| Token | Light | Dark | Usage |
|-------|-------|------|-------|
| `decision.approve` | `#15803D` | `#22C55E` | High/High cell, approve badges |
| `decision.conditional` | `#B45309` | `#F59E0B` | High/Low cell, conditional badges |
| `decision.refer` | `#1D4ED8` | `#3B82F6` | Low/High cell, refer badges |
| `decision.decline` | `#6B7280` | `#9CA3AF` | Low/Low cell — deliberately neutral, not red |

Note: `decline` is neutral grey, not red, because the farmer-facing reflection of this state ("Not Ready Yet") must not feel punitive. A red decline cell in the banker view would leak into shared screens during co-located Sathi + farmer + banker flows.

### Score band labels (new)

| Token | Range (TRUST) | Range (FHS) | Label |
|-------|---------------|-------------|-------|
| `band.strong` | 80–100 | 80–100 | Strong |
| `band.building` | 50–79 | 50–79 | Building |
| `band.low` | 0–49 | 0–49 | Low |

Labels are i18n keys; the same band tokens render as localized strings in each language.

---

## Open questions

1. **Threshold ownership.** Who sets `T_cutoff` and `F_cutoff` per bank partner? Product policy team, or banker admin UI? This needs a governance owner before GA.
2. **Farmer numeric disclosure default.** Should `showNumericScores` default on or off for new farmer app installs? Recommendation: off, with a one-time onboarding prompt.
3. **DRISHTI scenario choice in banker view.** Which scenarios are the default stress set on the matrix? Hardcoded trio, or banker-selectable from the DRISHTI library?
4. **Sathi escalation path.** When a Sathi sees "Not Ready Yet" for a farmer but has no visibility into FHS, what does their coaching screen show to help them help the farmer? Proposal: a non-numeric "gap areas" list (e.g., "Income reporting incomplete", "Seasonal cash-flow thin") without revealing the underlying FHS number.
5. **Audit logging.** Every matrix decision viewed by a banker should write to an immutable audit record (farmer, banker, TRUST, FHS, cell, action, timestamp) so underwriting consistency can be reviewed. Confirm this is in scope for AA V2 audit infrastructure or needs a new table.
6. **Red state reserved usage.** If decline is neutral, where does red appear in this surface family? Recommendation: reserve red strictly for SENTINEL fraud flags and hard compliance blocks.

---

## Implementation pointers (non-prescriptive)

- Backend: add `getLoanReadinessState(farmerId, role)` in a new `readinessService.js` that composes TRUST + FHS + role into the appropriate projection. Role-gate at this service, not at the UI.
- Farmer app: new screens `LoanReadinessScreen.tsx` (badge) and `ReadinessWhyScreen.tsx` (drill-down).
- Banker dashboard: new `<DecisioningMatrix>` component in the shared `components/underwriting/` folder. Recharts or pure SVG — no new charting dep.
- Sathi dashboard: remove FHS from any existing Sathi farmer detail screen. Replace with Coaching Priority.
- Tokens: add `decision.*` and `band.*` families to the shared design-token package; migrate any hardcoded decision colors.

---

## Changelog

| Date | Change | Author |
|------|--------|--------|
| 2026-04-13 | Initial pattern proposal | Product + Design |
