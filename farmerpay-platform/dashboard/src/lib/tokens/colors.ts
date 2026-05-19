/**
 * TRUST v2 — Color tokens
 *
 * Canonical source: TRUST_v2_Design_System.md / TRUST_v2_Screen_Specs.md
 * All colours consumed via these tokens or via the CSS variables in globals.css.
 * NEVER use raw hex anywhere else.
 */

// ---------------------------------------------------------------------------
// Brand primary — green family (agriculture)
// ---------------------------------------------------------------------------
export const brand = {
  primary: {
    /** Very light green — subtle backgrounds */
    50: '#F0FDF4',
    /** Light green — Excellent / Good hero fill (spec §3.3) */
    100: '#DCFCE7',
    /** Mid green — interactive / accent */
    500: '#22C55E',
    /** Dark green — text on light surfaces */
    700: '#15803D',
  },
  accent: {
    /** Amber — Building band, Reconsider decision */
    amber: '#F59E0B',
  },
} as const;

// ---------------------------------------------------------------------------
// Neutral scale — Starting band uses neutral.200 (NEVER red)
// ---------------------------------------------------------------------------
export const neutral = {
  50: '#FAFAFA',
  100: '#F5F5F5',
  /** Starting band hero fill — neutral grey, zero red hue */
  200: '#E5E5E5',
  500: '#737373',
  800: '#262626',
  900: '#171717',
} as const;

// ---------------------------------------------------------------------------
// Decision colours — Sanction / Reconsider / Reject
// Each pair verified ≥ 4.5:1 contrast ratio (spec §1.6)
// ---------------------------------------------------------------------------
export const decision = {
  sanction: {
    /** Green-800 background */
    bg: '#166534',
    /** White foreground — contrast ≈ 7.2:1 */
    fg: '#FFFFFF',
  },
  reconsider: {
    /** Amber-700 background */
    bg: '#B45309',
    /** White foreground — contrast ≈ 5.0:1 */
    fg: '#FFFFFF',
  },
  reject: {
    /** Red-700 background */
    bg: '#B91C1C',
    /** White foreground — contrast ≈ 6.4:1 */
    fg: '#FFFFFF',
  },
} as const;

// ---------------------------------------------------------------------------
// Pillar colours — constellation dot fills (6 pillars)
// ---------------------------------------------------------------------------
export const pillar = {
  p1: '#6366F1',
  p2: '#8B5CF6',
  p3: '#EC4899',
  p4: '#F59E0B',
  p5: '#10B981',
  p6: '#3B82F6',
} as const;

// ---------------------------------------------------------------------------
// Band fills — hero card background keyed by score band
// ---------------------------------------------------------------------------
export const band = {
  excellent: brand.primary[100],
  good: brand.primary[100],
  building: brand.accent.amber,
  starting: neutral[200],
} as const;
