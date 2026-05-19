/**
 * TRUST v2 — Mobile colour tokens
 *
 * Mirrors desktop tokens (dashboard/src/lib/tokens/colors.ts) with
 * mobile-specific band keys for hero fill (spec §3.3).
 * band.starting = neutral.200 — NEVER red.
 */

export const brand = {
  primary: {
    50: '#F0FDF4',
    /** Excellent / Good hero fill */
    100: '#DCFCE7',
    500: '#22C55E',
    700: '#15803D',
  },
  accent: {
    amber: '#F59E0B',
  },
} as const;

export const neutral = {
  50: '#FAFAFA',
  100: '#F5F5F5',
  /** Starting band hero — neutral grey, zero red hue */
  200: '#E5E5E5',
  500: '#737373',
  800: '#262626',
  900: '#171717',
} as const;

export const decision = {
  sanction: { bg: '#166534', fg: '#FFFFFF' },
  reconsider: { bg: '#B45309', fg: '#FFFFFF' },
  reject: { bg: '#B91C1C', fg: '#FFFFFF' },
} as const;

export const pillar = {
  p1: '#6366F1',
  p2: '#8B5CF6',
  p3: '#EC4899',
  p4: '#F59E0B',
  p5: '#10B981',
  p6: '#3B82F6',
} as const;

/**
 * Band hero fill colours keyed by score band (spec §3.3).
 * NEVER map starting to red — use neutral.200.
 */
export const bandColors = {
  excellent: brand.primary[100],
  good: brand.primary[100],
  building: brand.accent.amber,
  starting: neutral[200],
} as const;

/**
 * Restyle palette — flat colour map consumed by createTheme.
 */
export const palette = {
  // Brand
  brandPrimary50: brand.primary[50],
  brandPrimary100: brand.primary[100],
  brandPrimary500: brand.primary[500],
  brandPrimary700: brand.primary[700],
  brandAccentAmber: brand.accent.amber,

  // Neutral
  neutral50: neutral[50],
  neutral100: neutral[100],
  neutral200: neutral[200],
  neutral500: neutral[500],
  neutral800: neutral[800],
  neutral900: neutral[900],

  // Decision
  decisionSanctionBg: decision.sanction.bg,
  decisionSanctionFg: decision.sanction.fg,
  decisionReconsiderBg: decision.reconsider.bg,
  decisionReconsiderFg: decision.reconsider.fg,
  decisionRejectBg: decision.reject.bg,
  decisionRejectFg: decision.reject.fg,

  // Band hero fills
  bandExcellent: bandColors.excellent,
  bandGood: bandColors.good,
  bandBuilding: bandColors.building,
  bandStarting: bandColors.starting,

  // Pillar constellation dots
  pillarP1: pillar.p1,
  pillarP2: pillar.p2,
  pillarP3: pillar.p3,
  pillarP4: pillar.p4,
  pillarP5: pillar.p5,
  pillarP6: pillar.p6,

  // Surface
  white: '#FFFFFF',
  black: '#000000',
  background: '#FFFFFF',
  foreground: '#171717',
} as const;
