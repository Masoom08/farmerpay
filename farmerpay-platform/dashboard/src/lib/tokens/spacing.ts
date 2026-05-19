/**
 * TRUST v2 — Spacing tokens (4pt grid)
 *
 * All wireframe heights in spec are multiples of 8.
 * Use these tokens for gap, padding, and margin — never raw px.
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

export type SpacingKey = keyof typeof spacing;
