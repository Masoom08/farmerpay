/**
 * FarmerPay Design Tokens — Decision & Band Families
 *
 * Canonical source: DESIGN-SYSTEM-SCORE-DISPLAY.md
 * CSS variables defined in: globals.css (`:root` and `.dark`)
 *
 * Use Tailwind classes (e.g. `bg-decision-approve`, `text-band-strong`) in JSX.
 * Use these JS constants only where CSS classes are unavailable (Recharts fills,
 * programmatic style objects, SVG attributes).
 */

// ---------------------------------------------------------------------------
// Decision tokens — loan decisioning matrix colors
// ---------------------------------------------------------------------------

export const decisionTokens = {
  approve: {
    light: '#15803D',
    dark: '#22C55E',
    /** CSS variable reference for inline styles */
    css: 'var(--decision-approve)',
  },
  conditional: {
    light: '#B45309',
    dark: '#F59E0B',
    css: 'var(--decision-conditional)',
  },
  refer: {
    light: '#1D4ED8',
    dark: '#3B82F6',
    css: 'var(--decision-refer)',
  },
  decline: {
    /** Neutral grey — NOT red. Red reserved for SENTINEL fraud flags. */
    light: '#6B7280',
    dark: '#9CA3AF',
    css: 'var(--decision-decline)',
  },
} as const;

export type DecisionAction = keyof typeof decisionTokens;

// ---------------------------------------------------------------------------
// Band tokens — score band visual indicators
// ---------------------------------------------------------------------------

export const bandTokens = {
  strong: {
    range: [80, 100] as const,
    labelKey: 'band.strong.label',
    labelEn: 'Strong',
    light: '#15803D',
    dark: '#22C55E',
    css: 'var(--band-strong)',
  },
  building: {
    range: [50, 79] as const,
    labelKey: 'band.building.label',
    labelEn: 'Building',
    light: '#B45309',
    dark: '#F59E0B',
    css: 'var(--band-building)',
  },
  low: {
    range: [0, 49] as const,
    labelKey: 'band.low.label',
    labelEn: 'Low',
    light: '#6B7280',
    dark: '#9CA3AF',
    css: 'var(--band-low)',
  },
} as const;

export type ScoreBand = keyof typeof bandTokens;

/**
 * Resolve a numeric score (0-100) to its band key.
 * Works for TRUST scores.
 */
export function scoreToBand(score: number): ScoreBand {
  if (score >= 80) return 'strong';
  if (score >= 50) return 'building';
  return 'low';
}

/**
 * Get the band token object for a numeric score.
 */
export function getBandForScore(score: number) {
  return bandTokens[scoreToBand(score)];
}
