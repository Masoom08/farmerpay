#!/usr/bin/env node

/**
 * check-handoff.js — TRUST v2 Handoff Checklist Verification (H6 — Spec §7)
 *
 * Asserts that every row in the handoff checklist has at least one reference file
 * that exists on disk. Exits non-zero if any row fails.
 *
 * Run:  node scripts/check-handoff.js
 * Or:   npm run check:handoff
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");

// ─── Checklist rows ─────────────────────────────────────────────────
// Each row: { id, label, files: string[] }
// At least one file in each row must exist for the row to be GREEN.

const CHECKLIST = [
  {
    id: 1,
    label: "Tokens wired (A1, A2)",
    files: [
      "dashboard/src/lib/tokens/colors.ts",
      "dashboard/src/lib/tokens/spacing.ts",
      "dashboard/src/lib/tokens/typography.ts",
      "dashboard/src/lib/tokens/radius.ts",
      "dashboard/src/app/globals.css",
      "dashboard-sathi/src/app/globals.css",
      "farmer-app/src/theme/index.ts",
      "farmer-app/src/theme/colors.ts",
      "farmer-app/src/theme/spacing.ts",
      "farmer-app/src/theme/text.ts",
      "dashboard/__tests__/tokens.test.ts",
      "farmer-app/src/theme/__tests__/theme.test.ts",
    ],
  },
  {
    id: 2,
    label: "Domain components (Parts C-G)",
    files: [
      // C — Banker Trust Review
      "dashboard/src/components/trust/TrustScoreHero/index.tsx",
      "dashboard/src/components/trust/FarmerHeaderCard/index.tsx",
      "dashboard/src/components/trust/BandLadder/index.tsx",
      "dashboard/src/components/trust/DecisionBadge/index.tsx",
      "dashboard/src/components/trust/FooterActions/index.tsx",
      "dashboard/src/components/trust/TabsShell/index.tsx",
      // D — Banker Portfolio
      "dashboard/src/components/portfolio/SummaryStrip/index.tsx",
      "dashboard/src/components/portfolio/PortfolioHeatmap/index.tsx",
      "dashboard/src/components/portfolio/PortfolioTable/index.tsx",
      // E — Farmer MyScore
      "farmer-app/src/screens/MyScore/index.tsx",
      // F — Farmer Missions
      "farmer-app/src/missions/aa/index.tsx",
      "farmer-app/src/missions/_framework/offlineQueue.ts",
      // G — Sathi Dashboard
      "dashboard-sathi/src/components/QueueHeader.tsx",
      "dashboard-sathi/src/components/QueueFilters.tsx",
      "dashboard-sathi/src/components/QueueList.tsx",
      "dashboard-sathi/src/components/SathiTaskCard/index.tsx",
      "dashboard-sathi/src/components/RoutePlannerStrip/index.tsx",
      "dashboard-sathi/src/components/TaskDetailHeader/index.tsx",
      "dashboard-sathi/src/components/ChecklistField/index.tsx",
      "dashboard-sathi/src/components/TaskFooter/index.tsx",
    ],
  },
  {
    id: 3,
    label: "Sathi lint rule (G1)",
    files: [
      "dashboard-sathi/eslint-rules/no-score-imports.ts",
      "dashboard-sathi/eslint.config.mjs",
      "dashboard-sathi/scripts/route-manifest-audit.ts",
    ],
  },
  {
    id: 4,
    label: "6 locales wired (A3)",
    files: [
      "farmer-app/lib/readinessStrings.ts",
      "farmer-app/lib/myScoreStrings.ts",
      "farmer-app/src/components/TopBar/LocaleSwitcher.tsx",
    ],
  },
  {
    id: 5,
    label: "Offline queues (F6, G5)",
    files: [
      "dashboard-sathi/src/lib/offlineQueue.ts",
      "dashboard-sathi/__tests__/offlineQueue/offlineQueue.test.ts",
      "farmer-app/src/missions/_framework/offlineQueue.ts",
      "farmer-app/src/missions/_framework/__tests__/offlineQueue.test.ts",
    ],
  },
  {
    id: 6,
    label: "VoiceOver (E6)",
    files: [
      "farmer-app/src/components/trust/TrustScoreHero/index.tsx",
      "farmer-app/src/screens/MyScore/index.tsx",
      "farmer-app/src/missions/_framework/MissionIntro/index.tsx",
      "farmer-app/src/missions/_framework/MissionResult/index.tsx",
      "farmer-app/src/components/TopBar/LocaleSwitcher.tsx",
      "farmer-app/src/components/trust/TrustScoreHero/__tests__/TrustScoreHero.test.tsx",
    ],
  },
  {
    id: 7,
    label: "prefers-reduced-motion",
    files: [
      "dashboard/src/components/trust/TrustScoreHero/CountUp.tsx",
      "dashboard/__tests__/trust-review/TrustScoreHero.test.tsx",
    ],
  },
  {
    id: 8,
    label: "Keyboard shortcuts (C7)",
    files: [
      "dashboard/src/hooks/useKeyboardShortcuts.ts",
      "dashboard/__tests__/trust-review/useKeyboardShortcuts.test.ts",
      "dashboard/src/components/trust/TabsShell/index.tsx",
    ],
  },
  {
    id: 9,
    label: "Screen readers tested (H4)",
    files: [
      "dashboard-sathi/__tests__/a11y/sathi-pages.test.tsx",
      "dashboard/__tests__/a11y/banker-pages.test.tsx",
      "tests/e2e-a11y/banker-routes.spec.ts",
      "tests/e2e-a11y/sathi-routes.spec.ts",
      "tooling/a11y/axe.config.ts",
      "docs/a11y/sr-test-plan.md",
    ],
  },
  {
    id: 10,
    label: "PDF export (B6)",
    files: [
      "src/modules/trust/services/pdfExportService.js",
      "src/modules/trust/templates/sanctionReview.pdf.template.js",
      "src/modules/trust/routes/trustRoutes.js",
      "tests/trust/services/pdfExportService.test.js",
    ],
  },
];

// ─── Open Decisions (Spec §8) ───────────────────────────────────────
// These verify that the decision IS documented with at least one evidence file.
// "deferred" items still need a reference file to confirm the decision was tracked.

const OPEN_DECISIONS = [
  {
    id: "§8.1",
    label: "Banker threshold override (shipped hard-coded 600/500)",
    files: [
      "dashboard/src/components/trust/DecisionBadge/index.tsx",
    ],
  },
  {
    id: "§8.2",
    label: "Farmer numeric toggle default (numeric-on)",
    files: [
      "farmer-app/src/screens/MyScore/index.tsx",
      "farmer-app/src/screens/MyScore/state.ts",
    ],
  },
  {
    id: "§8.3",
    label: "Farmer negative-delta display (hidden)",
    files: [
      "farmer-app/src/components/trust/TrustScoreHero/index.tsx",
    ],
  },
  {
    id: "§8.4",
    label: "Recompute ETA 45s",
    files: [
      "farmer-app/src/missions/aa/ConsentHandoff.tsx",
    ],
  },
  {
    id: "§8.5",
    label: "Dark mode (tokens ready, not activated)",
    files: [
      "dashboard/src/app/globals.css",
      "farmer-app/src/theme/index.ts",
    ],
  },
  {
    id: "§8.6",
    label: "Joint borrower (deferred v1.1)",
    files: [
      "dashboard/src/components/trust/FarmerHeaderCard/index.tsx",
    ],
  },
  {
    id: "§8.7",
    label: "Sathi visitBundle (deferred v1.1)",
    files: [
      "dashboard-sathi/src/components/SathiTaskCard/index.tsx",
    ],
  },
];

// ─── Runner ─────────────────────────────────────────────────────────

let allGreen = true;
let greenCount = 0;
let redCount = 0;

console.log("");
console.log("=== TRUST v2 Handoff Checklist Verification ===");
console.log("");

for (const row of CHECKLIST) {
  const results = row.files.map((f) => {
    const abs = path.join(ROOT, f);
    return { file: f, exists: fs.existsSync(abs) };
  });

  const found = results.filter((r) => r.exists);
  const missing = results.filter((r) => !r.exists);
  const isGreen = found.length > 0;

  if (isGreen) {
    greenCount++;
    console.log(`  [${row.id}] GREEN  ${row.label}`);
    console.log(`           ${found.length}/${results.length} files present`);
  } else {
    redCount++;
    allGreen = false;
    console.log(`  [${row.id}] RED    ${row.label}`);
    console.log(`           0/${results.length} files found!`);
  }

  if (missing.length > 0 && missing.length < results.length) {
    // Some files missing but row is still GREEN — log as info
    for (const m of missing) {
      console.log(`           (missing: ${m.file})`);
    }
  } else if (!isGreen) {
    for (const m of missing) {
      console.log(`           MISSING: ${m.file}`);
    }
  }

  console.log("");
}

// ─── Open Decisions (§8) ────────────────────────────────────────────

console.log("=== Open Decisions (Spec §8) ===");
console.log("");

let decisionGreen = 0;
let decisionRed = 0;

for (const row of OPEN_DECISIONS) {
  const results = row.files.map((f) => {
    const abs = path.join(ROOT, f);
    return { file: f, exists: fs.existsSync(abs) };
  });

  const found = results.filter((r) => r.exists);
  const isGreen = found.length > 0;

  if (isGreen) {
    decisionGreen++;
    console.log(`  [${row.id}] GREEN  ${row.label}`);
    console.log(`           ${found.length}/${results.length} evidence files present`);
  } else {
    decisionRed++;
    allGreen = false;
    console.log(`  [${row.id}] RED    ${row.label}`);
    for (const m of results) {
      console.log(`           MISSING: ${m.file}`);
    }
  }
  console.log("");
}

// ─── Summary ────────────────────────────────────────────────────────

console.log("===================================");
console.log("");
console.log("  Spec §7 Checklist:");
console.log(`    Total:  ${CHECKLIST.length}`);
console.log(`    Green:  ${greenCount}`);
console.log(`    Red:    ${redCount}`);
console.log("");
console.log("  Spec §8 Open Decisions:");
console.log(`    Total:  ${OPEN_DECISIONS.length}`);
console.log(`    Green:  ${decisionGreen}`);
console.log(`    Red:    ${decisionRed}`);
console.log("");

const totalGreen = greenCount + decisionGreen;
const totalItems = CHECKLIST.length + OPEN_DECISIONS.length;

if (allGreen) {
  console.log(`  RESULT: ALL GREEN — ${totalGreen}/${totalItems} items verified.`);
  console.log("");
  process.exit(0);
} else {
  console.log(`  RESULT: FAILED — some rows have no reference files.`);
  console.log("");
  process.exit(1);
}
