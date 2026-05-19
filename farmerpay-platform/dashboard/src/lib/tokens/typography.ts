/**
 * TRUST v2 — Typography tokens
 *
 * Devanagari-aware line-height ≥ 1.55 on body variants (spec §3.7).
 * Font stacks include Noto Sans Devanagari for Hindi/Marathi.
 */

export const fontFamily = {
  sans: '"Inter", "Noto Sans Devanagari", system-ui, -apple-system, sans-serif',
  mono: '"Geist Mono", "Fira Code", ui-monospace, monospace',
} as const;

export type TextVariant = keyof typeof textScale;

export const textScale = {
  display: {
    fontSize: 36,
    lineHeight: 1.2,
    fontWeight: 700,
    letterSpacing: -0.02,
  },
  'heading-lg': {
    fontSize: 28,
    lineHeight: 1.3,
    fontWeight: 700,
    letterSpacing: -0.01,
  },
  'heading-md': {
    fontSize: 22,
    lineHeight: 1.35,
    fontWeight: 600,
    letterSpacing: 0,
  },
  'heading-sm': {
    fontSize: 18,
    lineHeight: 1.4,
    fontWeight: 600,
    letterSpacing: 0,
  },
  /** Body large — Devanagari line-height ≥ 1.55 */
  'body-lg': {
    fontSize: 16,
    lineHeight: 1.55,
    fontWeight: 400,
    letterSpacing: 0,
  },
  /** Body medium — Devanagari line-height ≥ 1.55 */
  'body-md': {
    fontSize: 14,
    lineHeight: 1.55,
    fontWeight: 400,
    letterSpacing: 0,
  },
  /** Body small — Devanagari line-height ≥ 1.55 */
  'body-sm': {
    fontSize: 12,
    lineHeight: 1.55,
    fontWeight: 400,
    letterSpacing: 0,
  },
  caption: {
    fontSize: 11,
    lineHeight: 1.45,
    fontWeight: 400,
    letterSpacing: 0.01,
  },
} as const;
