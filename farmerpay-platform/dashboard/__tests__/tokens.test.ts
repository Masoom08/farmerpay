/**
 * TRUST v2 — Design token shape & accessibility tests
 */
import {
  brand,
  neutral,
  decision,
  pillar,
  band,
  spacing,
  textScale,
  radius,
} from '@/lib/tokens';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Parse hex (#RRGGBB) to [r,g,b] in 0-255 range */
function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

/** WCAG 2.1 relative luminance */
function relativeLuminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map((c) => {
    const s = c / 255;
    return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG contrast ratio between two hex colours */
function contrastRatio(hex1: string, hex2: string): number {
  const l1 = relativeLuminance(hex1);
  const l2 = relativeLuminance(hex2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

/** Extract hue (0-360) from hex. Returns NaN for achromatic greys. */
function hueFromHex(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map((c) => c / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  if (delta === 0) return NaN; // achromatic
  let hue: number;
  if (max === r) hue = ((g - b) / delta) % 6;
  else if (max === g) hue = (b - r) / delta + 2;
  else hue = (r - g) / delta + 4;
  hue = Math.round(hue * 60);
  if (hue < 0) hue += 360;
  return hue;
}

// ---------------------------------------------------------------------------
// Shape assertions
// ---------------------------------------------------------------------------

describe('Token shape', () => {
  test('brand.primary has expected keys', () => {
    expect(brand.primary).toHaveProperty('50');
    expect(brand.primary).toHaveProperty('100');
    expect(brand.primary).toHaveProperty('500');
    expect(brand.primary).toHaveProperty('700');
  });

  test('brand.accent.amber is defined', () => {
    expect(typeof brand.accent.amber).toBe('string');
  });

  test('neutral has expected keys', () => {
    for (const key of [50, 100, 200, 500, 800, 900] as const) {
      expect(neutral).toHaveProperty(String(key));
    }
  });

  test('decision has sanction, reconsider, reject each with bg/fg', () => {
    for (const key of ['sanction', 'reconsider', 'reject'] as const) {
      expect(decision[key]).toHaveProperty('bg');
      expect(decision[key]).toHaveProperty('fg');
    }
  });

  test('pillar has p1-p6', () => {
    for (const key of ['p1', 'p2', 'p3', 'p4', 'p5', 'p6'] as const) {
      expect(pillar).toHaveProperty(key);
    }
  });

  test('band has excellent, good, building, starting', () => {
    for (const key of ['excellent', 'good', 'building', 'starting'] as const) {
      expect(band).toHaveProperty(key);
    }
  });

  test('spacing has expected keys', () => {
    for (const key of ['xs', 'sm', 'md', 'lg', 'xl', '2xl', '3xl'] as const) {
      expect(spacing).toHaveProperty(key);
      expect(typeof spacing[key]).toBe('number');
    }
  });

  test('textScale has all variants', () => {
    const expected = [
      'display',
      'heading-lg',
      'heading-md',
      'heading-sm',
      'body-lg',
      'body-md',
      'body-sm',
      'caption',
    ];
    for (const key of expected) {
      expect(textScale).toHaveProperty(key);
    }
  });

  test('radius has sm, md, lg, pill', () => {
    expect(radius).toEqual({ sm: 4, md: 8, lg: 12, pill: 9999 });
  });
});

// ---------------------------------------------------------------------------
// Contrast ratio assertions (spec §1.6: ≥ 4.5:1 on decision fills)
// ---------------------------------------------------------------------------

describe('Decision colour contrast', () => {
  test.each([
    ['sanction', decision.sanction.bg, decision.sanction.fg],
    ['reconsider', decision.reconsider.bg, decision.reconsider.fg],
    ['reject', decision.reject.bg, decision.reject.fg],
  ] as const)('%s bg/fg contrast ≥ 4.5:1', (_name, bg, fg) => {
    const ratio = contrastRatio(bg, fg);
    expect(ratio).toBeGreaterThanOrEqual(4.5);
  });
});

// ---------------------------------------------------------------------------
// neutral.200 is NOT red-tinted (hue not in [0,30) ∪ (330,360])
// ---------------------------------------------------------------------------

describe('Band safety', () => {
  test('neutral.200 has no red hue', () => {
    const hue = hueFromHex(neutral[200]);
    // Achromatic (NaN) is acceptable — it means pure grey
    if (!Number.isNaN(hue)) {
      const isRed = hue < 30 || hue > 330;
      expect(isRed).toBe(false);
    }
  });

  test('band.starting equals neutral.200', () => {
    expect(band.starting).toBe(neutral[200]);
  });
});
