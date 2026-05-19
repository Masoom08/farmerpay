# Screen-Reader Test Plan — FarmerPay (H4 — Spec §7)

## Objective

Manual verification that all FarmerPay surfaces are usable with screen readers.
Covers VoiceOver (macOS/iOS) for banker/sathi dashboards and TalkBack (Android) for farmer app.

---

## 1. Banker Dashboard (VoiceOver — macOS Safari/Chrome)

### 1.1 Trust Review Page (`/dashboard/trust-review`)

| # | Action | Expected VO Announcement |
|---|--------|--------------------------|
| 1 | Navigate to page | Page title announced: "Trust Review" |
| 2 | Tab to FarmerHeaderCard | Farmer name, village, KCC ID read in sequence |
| 3 | Tab to TrustScoreHero | Score announced as number (e.g. "720 out of 1000"); decision badge announced (e.g. "Sanction") |
| 4 | Tab through TabsShell | Each tab name announced; "selected" state on active tab |
| 5 | Arrow through tabs | Tab labels announced; content updates announced via live region |
| 6 | Tab to BandLadder | Each sub-feature row: name, band (e.g. "3 of 5"), source |
| 7 | Tab to EvidenceRow | Feature name, band, source chip, "View raw" button |
| 8 | Tab to FooterActions | "Approve", "Reject", "Request data" buttons with accessible names |
| 9 | Activate Approve button | Dialog opens; dialog title announced; focus trapped inside |
| 10 | Escape from dialog | Dialog closes; focus returns to trigger button |

### 1.2 Portfolio Page (`/dashboard/portfolio`)

| # | Action | Expected VO Announcement |
|---|--------|--------------------------|
| 1 | Navigate to page | "Portfolio" heading announced |
| 2 | Tab to SummaryStrip | KPI counts read: "Sanction-grade: {n}, Reconsider: {n}, Reject-grade: {n}" |
| 3 | Tab to PortfolioHeatmap | Heatmap cells read band + farmer count via aria-label |
| 4 | Tab to PortfolioTable | Table headers announced; row data includes farmer name, score, decision |
| 5 | Activate farmer row | QuickView panel opens; farmer details announced |

### 1.3 NotificationBell (All pages)

| # | Action | Expected VO Announcement |
|---|--------|--------------------------|
| 1 | Tab to bell | "Notifications" button; unread count if present (e.g. "3 unread") |
| 2 | Activate bell | Dropdown opens; "Notifications" heading announced |
| 3 | Tab through items | Subject + body of each notification read |
| 4 | Activate "Mark all read" | Status update announced |
| 5 | Click outside | Dropdown closes; focus returns to bell |

---

## 2. Sathi Dashboard (VoiceOver — macOS Safari/Chrome)

### 2.1 Queue Page (`/dashboard/queue`)

| # | Action | Expected VO Announcement |
|---|--------|--------------------------|
| 1 | Navigate to page | QueueHeader stats: "Today · {n} tasks · {m} villages" |
| 2 | Tab to QueueFilters | "Filter by status" select; "Filter by village" select |
| 3 | Tab to RoutePlannerStrip | Village names + pending counts read in order |
| 4 | Tab to task cards | Farmer name, village, due date, reason — NO score/trust terms |
| 5 | Activate task card | Navigates to task detail page |

### 2.2 Task Detail Page (`/dashboard/queue/{taskId}`)

| # | Action | Expected VO Announcement |
|---|--------|--------------------------|
| 1 | Navigate to page | TaskDetailHeader: farmer name, village, due date, step progress |
| 2 | Tab to ChecklistField | Field label announced; input type described |
| 3 | Tab to N/A toggle | "Mark not applicable" announced |
| 4 | Tab to TaskFooter | Previous/Next/Submit buttons with states ("disabled" on step 1) |
| 5 | Submit form | Toast announced: "Thanks, data saved." |

### 2.3 Privacy Check

| # | Action | Expected |
|---|--------|----------|
| 1 | Navigate all Sathi pages | NO aria-label contains "score", "trust score", "point lift", "cibil" |
| 2 | Read all visible text | No score-adjacent strings visible or announced |

---

## 3. Farmer App (TalkBack — Android)

### 3.1 MyScore Screen

| # | Action | Expected TalkBack Announcement |
|---|--------|--------------------------------|
| 1 | Open MyScore | Score circle announced with value |
| 2 | Swipe to pillar cards | Each pillar name + band label read |
| 3 | Swipe to GapCard | Gap title + action text read |
| 4 | Double-tap GapCard | Navigation to gap detail |

### 3.2 MissionIntro + MissionResult

| # | Action | Expected TalkBack Announcement |
|---|--------|--------------------------------|
| 1 | Open MissionIntro | Mission title + description read |
| 2 | Double-tap Start | Navigates to questions |
| 3 | Open MissionResult | Result summary + point lift announced |
| 4 | Swipe to action buttons | CTA text read clearly |

### 3.3 EmptyState (All screens)

| # | Action | Expected TalkBack Announcement |
|---|--------|--------------------------------|
| 1 | View empty state | Emoji illustration announced (decorative, may be skipped) |
| 2 | Swipe to title | Title in selected locale (en/hi) read |
| 3 | Swipe to description | Description in selected locale read |
| 4 | Double-tap CTA (if present) | Action executed |

### 3.4 Push Notifications

| # | Action | Expected TalkBack Announcement |
|---|--------|--------------------------------|
| 1 | Receive push notification | System notification with subject + body |
| 2 | Tap notification | App opens to relevant screen |
| 3 | Open notification center | Unread items announced with unread indicator |
| 4 | Mark as read | "Notification marked as read" announced |

---

## 4. Touch Targets (Mobile)

All interactive elements on farmer app must meet **48dp minimum** touch target size:

| Component | Element | Min Size |
|-----------|---------|----------|
| GapCard | Pressable container | 48×48dp |
| MissionIntro | Start button | 48×48dp |
| EmptyState | CTA button | 48×48dp |
| Navigation | Tab bar items | 48×48dp |
| NotificationBell (mobile) | Bell icon | 48×48dp |

---

## 5. Colour Contrast (WCAG AA)

| Requirement | Ratio | Applies To |
|-------------|-------|------------|
| Normal text | 4.5:1 | All body text, labels, descriptions |
| Large text (≥18pt or ≥14pt bold) | 3:1 | Headings, scores, badges |
| UI components | 3:1 | Buttons, inputs, interactive borders |

Validate using:
- Chrome DevTools → Accessibility panel → Contrast ratio
- Axe DevTools browser extension
- Figma Stark plugin during design review

---

## 6. Bilingual (Devanagari) Checks

| Check | Requirement |
|-------|-------------|
| Hindi labels render | Devanagari text visible without clipping |
| lineHeight ≥ 1.55× fontSize | Matras (vowel marks) not clipped |
| Screen reader reads Hindi | TalkBack reads Devanagari text correctly |
| Text wrapping | Long Hindi text wraps without overflow |

---

## 7. Test Execution Schedule

| Phase | When | Owner | Tools |
|-------|------|-------|-------|
| Automated (jest-axe) | Every PR | CI pipeline | jest-axe + axe-core |
| Automated (Playwright) | Nightly / pre-release | CI pipeline | @axe-core/playwright |
| Manual VoiceOver | Before each release | QA team | macOS VoiceOver |
| Manual TalkBack | Before each release | QA team | Android TalkBack |
| Design audit | During design review | Design team | Figma Stark |

---

## 8. Severity Classification

| Level | Axe Impact | Action |
|-------|-----------|--------|
| P0 — Blocker | critical | Fix before merge. CI blocks the build. |
| P1 — Serious | serious | Fix before release. CI blocks the build. |
| P2 — Moderate | moderate | Fix within sprint. Logged as warning. |
| P3 — Minor | minor | Informational. Track in backlog. |
