# TRUST v2 — Open Decisions Status (Spec §8)

> Generated: 2026-04-14
> Reviewed by: Tech Lead (automated verification via `check:handoff`)

---

## Decision Register

| # | Decision | Spec | Status | Disposition for v1.0 | Evidence |
|---|----------|------|--------|---------------------|----------|
| 1 | **Banker threshold override** | §8.1 | :white_check_mark: Shipped (hard-coded) | B3 uses fixed 600/500 exported as `THRESHOLDS` constant. Override path deferred to v1.1. | `dashboard/src/components/trust/DecisionBadge/index.tsx` lines 8–11: `{ SANCTION: 600, RECONSIDER: 500 }` |
| 2 | **Farmer numeric toggle default** | §8.2 | :white_check_mark: Shipped (numeric-on) | Default `numericOff = false` — numeric score visible at launch. Changeable via PR if PM decides otherwise. | `farmer-app/src/screens/MyScore/index.tsx` line 81: `numericOff = false`. `farmer-app/src/screens/MyScore/state.ts` line 70: resolves to `NUMERIC_OFF` state only when prop is `true`. |
| 3 | **Farmer negative-delta display** | §8.3 | :white_check_mark: Shipped (hidden) | Farmer app hides negative deltas (shame avoidance). Banker dashboard shows deltas with +/- arrows. To confirm in QA. | `farmer-app/src/components/trust/TrustScoreHero/index.tsx` line 12: "NEVER shows rejection/negative language. Hides negative deltas (§8.3 shame avoidance)." All `state.ts` copy uses neutral language — never "rejected", "failed", "declining". |
| 4 | **Recompute ETA 45s** | §8.4 | :white_check_mark: Shipped (45s) | MissionProgress copy: "This usually takes about 45 seconds." If load tests show higher, update string in i18n only. | `farmer-app/src/missions/aa/ConsentHandoff.tsx` line 94: `timeoutMs = 45000`. Lines 182–183: bilingual copy ("This usually takes about 45 seconds." / "यह आमतौर पर 45 सेकंड लेता है।"). |
| 5 | **Dark mode** | §8.5 | :yellow_circle: Tokens ready, not activated | Banker dashboard has full `.dark` CSS palette (21 variables) but class not applied to DOM. Farmer + Sathi: light-only. Ship dark in v1.1. | `dashboard/src/app/globals.css` lines 181–219: `.dark` class with OkLCH palette. `farmer-app/src/theme/index.ts` line 35: darkTheme exported as stub, comment: "Farmer app stays light-only (spec §8.5)." |
| 6 | **Joint borrower** | §8.6 | :red_circle: Out of scope (v1.1) | FarmerHeaderCard accommodates single borrower only. No `jointBorrowerName` field. Feature off until v1.1. | `dashboard/src/components/trust/FarmerHeaderCard/index.tsx` lines 12–24: props interface has no joint-borrower fields. Zero grep matches for "joint" or "co-borrower" in dashboard/. |
| 7 | **Sathi single-visit aggregation** | §8.7 | :red_circle: Parked (v1.1) | No `visitBundle` entity. Queue treats each visit as independent task. Needs backend entity before FE can implement. | Zero matches for "visitBundle", "visit_bundle", "aggregation" in dashboard-sathi/ or src/modules/sathi/. SathiTaskCard shows individual tasks only. |

---

## Risk Assessment

| Decision | Risk if deferred | Mitigation |
|----------|-----------------|------------|
| §8.1 Threshold override | Low — constants are exported, easy to refactor to config endpoint | Export `THRESHOLDS` as mutable config; backend can serve overrides in v1.1 |
| §8.5 Dark mode | Low — tokens/CSS already defined, activation is a one-line change | Apply `.dark` class to `<html>` behind feature flag or user setting |
| §8.6 Joint borrower | Medium — KCC lending often involves spouse co-signers | FarmerHeaderCard layout has space for second card slot (horizontal flex) |
| §8.7 Visit bundling | Medium — Sathi efficiency suffers without route-optimized bundles | RoutePlannerStrip already groups by village; bundling is a backend concern |

---

## Action Items for v1.1

1. **§8.1** — Create `GET /trust/config/thresholds` endpoint; DecisionBadge reads from API instead of constant
2. **§8.5** — Add dark mode toggle to banker Settings page; apply `.dark` class to `<html>` via localStorage preference
3. **§8.6** — Add `jointBorrower?: FarmerProfile` prop to FarmerHeaderCard; render second card when present
4. **§8.7** — Design `visitBundle` database entity in backend; aggregate same-farmer/same-day visits on queue page
