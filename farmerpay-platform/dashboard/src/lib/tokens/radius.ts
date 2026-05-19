/**
 * TRUST v2 — Border radius tokens
 */

export const radius = {
  sm: 4,
  md: 8,
  lg: 12,
  pill: 9999,
} as const;

export type RadiusKey = keyof typeof radius;
