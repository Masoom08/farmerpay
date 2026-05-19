/**
 * TRUST v2 — Mobile theme tests
 *
 * Asserts:
 * - Body text variants lineHeight ≥ 1.5 (1.55+ for Devanagari bodyHi)
 * - band.starting hue outside red zone
 * - touchTarget ≥ 48
 */

import theme, { touchTarget, bandColors } from '../index';
import { textVariants } from '../text';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

function hueFromHex(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map((c) => c / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  if (delta === 0) return NaN;
  let hue: number;
  if (max === r) hue = ((g - b) / delta) % 6;
  else if (max === g) hue = (b - r) / delta + 2;
  else hue = (r - g) / delta + 4;
  hue = Math.round(hue * 60);
  if (hue < 0) hue += 360;
  return hue;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Mobile theme structure', () => {
  test('theme has required restyle keys', () => {
    expect(theme).toHaveProperty('colors');
    expect(theme).toHaveProperty('spacing');
    expect(theme).toHaveProperty('breakpoints');
    expect(theme).toHaveProperty('borderRadii');
    expect(theme).toHaveProperty('textVariants');
  });
});

describe('Text variant line-heights', () => {
  test('bodyEn lineHeight / fontSize ≥ 1.5', () => {
    const ratio = textVariants.bodyEn.lineHeight / textVariants.bodyEn.fontSize;
    expect(ratio).toBeGreaterThanOrEqual(1.5);
  });

  test('bodyHi (Devanagari) lineHeight / fontSize ≥ 1.55', () => {
    const ratio = textVariants.bodyHi.lineHeight / textVariants.bodyHi.fontSize;
    expect(ratio).toBeGreaterThanOrEqual(1.55);
  });

  test('defaults lineHeight / fontSize ≥ 1.5', () => {
    const ratio =
      textVariants.defaults.lineHeight / textVariants.defaults.fontSize;
    expect(ratio).toBeGreaterThanOrEqual(1.5);
  });
});

describe('Band safety', () => {
  test('band.starting hue is outside red zone', () => {
    const hue = hueFromHex(bandColors.starting);
    // Achromatic (NaN) is fine — means pure grey
    if (!Number.isNaN(hue)) {
      const isRed = hue < 30 || hue > 330;
      expect(isRed).toBe(false);
    }
  });
});

describe('Touch target', () => {
  test('touchTarget ≥ 48', () => {
    expect(touchTarget).toBeGreaterThanOrEqual(48);
  });
});
