/**
 * TRUST v2 — Mobile spacing tokens (4pt grid)
 *
 * Matches desktop spacing scale exactly.
 */

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  '2xl': 48,
  '3xl': 64,
} as const;

/** Minimum touch target in dp (spec §3.7) */
export const touchTarget = 48;
