/**
 * TRUST v2 — Mobile text variants
 *
 * Spec §3.7: AAA contrast ≥ 7:1 on body copy for outdoor readability.
 * Devanagari line-height ≥ 1.55 (bodyHi uses 1.6).
 */

export const textVariants = {
  defaults: {
    fontSize: 14,
    lineHeight: 21, // 14 * 1.5
    color: 'foreground',
  },
  /** Large number on hero card */
  heroNumeric: {
    fontSize: 48,
    lineHeight: 56,
    fontWeight: '700' as const,
    color: 'neutral900',
  },
  /** Band label below hero number */
  heroBand: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '600' as const,
    color: 'neutral800',
  },
  /** Body — Hindi/Devanagari (lineHeight ≥ 1.6 × fontSize) */
  bodyHi: {
    fontSize: 14,
    lineHeight: 22.4, // 14 * 1.6
    fontWeight: '400' as const,
    color: 'foreground',
  },
  /** Body — English (lineHeight ≥ 1.5 × fontSize) */
  bodyEn: {
    fontSize: 14,
    lineHeight: 21, // 14 * 1.5
    fontWeight: '400' as const,
    color: 'foreground',
  },
  caption: {
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '400' as const,
    color: 'neutral500',
  },
} as const;
