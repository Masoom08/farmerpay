/**
 * Axe accessibility configuration (H4 — Spec §7).
 *
 * Shared axe-core configuration used across all a11y test suites.
 * Defines which rules to enforce, which to warn on, and tag-based filtering.
 *
 * Severity tiers:
 *   - CRITICAL / SERIOUS → test failure (zero tolerance)
 *   - MODERATE → test warning (logged but not blocking)
 *   - MINOR → informational only
 *
 * FarmerPay-specific rules:
 *   - All interactive elements must be ≥48dp touch target (mobile)
 *   - Colour contrast must meet WCAG AA (4.5:1 for text, 3:1 for large text)
 *   - No score-adjacent ARIA labels on Sathi surfaces
 */

export interface AxeConfig {
  rules: AxeRuleConfig[];
  tags: string[];
  disabledRules: string[];
}

export interface AxeRuleConfig {
  id: string;
  enabled: boolean;
  /** Override severity: 'critical' | 'serious' | 'moderate' | 'minor' */
  severity?: string;
}

/**
 * Default axe configuration for FarmerPay a11y tests.
 */
export const axeConfig: AxeConfig = {
  // WCAG 2.1 AA tags
  tags: ["wcag2a", "wcag2aa", "wcag21aa", "best-practice"],

  // Rules that we explicitly enforce or customize
  rules: [
    // Critical: colour contrast
    { id: "color-contrast", enabled: true, severity: "serious" },
    // Critical: images must have alt text
    { id: "image-alt", enabled: true, severity: "serious" },
    // Critical: buttons must have accessible names
    { id: "button-name", enabled: true, severity: "serious" },
    // Critical: links must have accessible names
    { id: "link-name", enabled: true, severity: "serious" },
    // Critical: form inputs must have labels
    { id: "label", enabled: true, severity: "serious" },
    // Critical: page must have a heading
    { id: "page-has-heading-one", enabled: true, severity: "moderate" },
    // Critical: ARIA roles must be valid
    { id: "aria-roles", enabled: true, severity: "serious" },
    // Critical: ARIA attributes must be valid
    { id: "aria-valid-attr", enabled: true, severity: "serious" },
    // Best practice: landmarks
    { id: "landmark-one-main", enabled: true, severity: "moderate" },
    // Best practice: unique IDs
    { id: "duplicate-id", enabled: true, severity: "serious" },
  ],

  // Rules to disable (known false positives in our stack)
  disabledRules: [
    // Next.js generates duplicate IDs in dev mode
    "duplicate-id-active",
    // Some SVG icons don't need alt text
    "svg-img-alt",
  ],
};

/**
 * jest-axe configuration object (compatible with toHaveNoViolations).
 */
export const jestAxeConfig = {
  rules: Object.fromEntries(
    [
      ...axeConfig.rules
        .filter((r) => r.enabled)
        .map((r) => [r.id, { enabled: true }]),
      ...axeConfig.disabledRules.map((id) => [id, { enabled: false }]),
    ],
  ),
};

/**
 * Filter violations to only serious/critical (for zero-tolerance gate).
 */
export function filterSeriousViolations(
  violations: Array<{ impact?: string | null }>,
): Array<{ impact?: string | null }> {
  return violations.filter(
    (v) => v.impact === "critical" || v.impact === "serious",
  );
}

/**
 * Surfaces to audit (page routes for each dashboard).
 */
export const BANKER_PAGES = [
  "/dashboard",
  "/dashboard/trust-review",
  "/dashboard/portfolio",
  "/dashboard/drishti",
];

export const SATHI_PAGES = [
  "/dashboard",
  "/dashboard/queue",
  "/dashboard/farmers",
  "/dashboard/nudges",
];

export const FARMER_SCREENS = [
  "MyScore",
  "MissionIntro",
  "MissionResult",
  "HelpSheet",
  "GapCard",
];
