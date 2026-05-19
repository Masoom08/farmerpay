/**
 * bandLogic — Unit Tests (E2 — Spec §3.3)
 *
 * Tests:
 *   scoreToBand
 *   1.  864 → 'excellent'
 *   2.  720 → 'good'
 *   3.  650 → 'good'
 *   4.  580 → 'building'
 *   5.  540 → 'building'
 *   6.  460 → 'starting'
 *   7.  800 → 'excellent' (boundary)
 *   8.  600 → 'good' (boundary)
 *   9.  500 → 'building' (boundary)
 *  10.  499 → 'starting' (boundary)
 *  11.  0 → 'starting'
 *  12.  1000 → 'excellent'
 *
 *   getBandInfo
 *  13.  864 → fill = band.excellent (primary.100)
 *  14.  720 → label.en = 'Good', label.hi = 'अच्छा'
 *  15.  580 → fill = band.building (amber)
 *  16.  460 → fill = band.starting (neutral.200) — NEVER red
 *  17.  864 → line1.en contains 'outstanding'
 *  18.  460 → line1.hi contains 'शुरू'
 *
 *   buildA11yLabel
 *  19.  numeric on, en → "TRUST score 720, Good band"
 *  20.  numeric on, hi → "TRUST स्कोर 720, अच्छा श्रेणी"
 *  21.  numeric off, en → "Good band"
 *  22.  numeric off, hi → "अच्छा श्रेणी"
 *
 *   formatAsOf
 *  23.  en format contains "Updated"
 *  24.  hi format contains "अपडेट"
 *  25.  en format contains "Tap for help"
 *  26.  hi format contains "मदद"
 */

import {
  scoreToBand,
  getBandInfo,
  buildA11yLabel,
  formatAsOf,
} from "../bandLogic";
import { bandColors } from "../../../../theme";

// ─── scoreToBand ────────────────────────────────────────────────

describe("scoreToBand", () => {
  it("864 → 'excellent'", () => {
    expect(scoreToBand(864)).toBe("excellent");
  });

  it("720 → 'good'", () => {
    expect(scoreToBand(720)).toBe("good");
  });

  it("650 → 'good'", () => {
    expect(scoreToBand(650)).toBe("good");
  });

  it("580 → 'building'", () => {
    expect(scoreToBand(580)).toBe("building");
  });

  it("540 → 'building'", () => {
    expect(scoreToBand(540)).toBe("building");
  });

  it("460 → 'starting'", () => {
    expect(scoreToBand(460)).toBe("starting");
  });

  it("800 → 'excellent' (boundary)", () => {
    expect(scoreToBand(800)).toBe("excellent");
  });

  it("600 → 'good' (boundary)", () => {
    expect(scoreToBand(600)).toBe("good");
  });

  it("500 → 'building' (boundary)", () => {
    expect(scoreToBand(500)).toBe("building");
  });

  it("499 → 'starting' (boundary)", () => {
    expect(scoreToBand(499)).toBe("starting");
  });

  it("0 → 'starting'", () => {
    expect(scoreToBand(0)).toBe("starting");
  });

  it("1000 → 'excellent'", () => {
    expect(scoreToBand(1000)).toBe("excellent");
  });
});

// ─── getBandInfo ────────────────────────────────────────────────

describe("getBandInfo", () => {
  it("864 → fill = band.excellent (primary.100)", () => {
    const info = getBandInfo(864);
    expect(info.fill).toBe(bandColors.excellent);
  });

  it("720 → label.en = 'Good', label.hi = 'अच्छा'", () => {
    const info = getBandInfo(720);
    expect(info.label.en).toBe("Good");
    expect(info.label.hi).toBe("अच्छा");
  });

  it("580 → fill = band.building (amber)", () => {
    const info = getBandInfo(580);
    expect(info.fill).toBe(bandColors.building);
  });

  it("460 → fill = band.starting (neutral.200) — NEVER red", () => {
    const info = getBandInfo(460);
    expect(info.fill).toBe(bandColors.starting);
    // Verify it's neutral.200
    expect(info.fill).toBe("#E5E5E5");
    // Must NOT be any red
    expect(info.fill).not.toContain("B91C1C");
    expect(info.fill).not.toContain("EF4444");
    expect(info.fill).not.toContain("DC2626");
  });

  it("864 → line1.en contains 'outstanding'", () => {
    const info = getBandInfo(864);
    expect(info.line1.en.toLowerCase()).toContain("outstanding");
  });

  it("460 → line1.hi contains 'शुरू' or 'यात्रा'", () => {
    const info = getBandInfo(460);
    // Starting band Hindi line mentions journey has begun
    expect(
      info.line1.hi.includes("शुरू") || info.line1.hi.includes("यात्रा"),
    ).toBe(true);
  });

  it("all bands have both en and hi labels", () => {
    for (const score of [864, 720, 580, 460]) {
      const info = getBandInfo(score);
      expect(info.label.en).toBeTruthy();
      expect(info.label.hi).toBeTruthy();
      expect(info.line1.en).toBeTruthy();
      expect(info.line1.hi).toBeTruthy();
      expect(info.line2.en).toBeTruthy();
      expect(info.line2.hi).toBeTruthy();
    }
  });

  it("no band contains rejection/negative language", () => {
    for (const score of [864, 720, 580, 460]) {
      const info = getBandInfo(score);
      const allText = [
        info.label.en,
        info.label.hi,
        info.line1.en,
        info.line2.en,
      ].join(" ").toLowerCase();

      expect(allText).not.toContain("reject");
      expect(allText).not.toContain("denied");
      expect(allText).not.toContain("failed");
      expect(allText).not.toContain("poor");
    }
  });
});

// ─── buildA11yLabel ─────────────────────────────────────────────

describe("buildA11yLabel", () => {
  it('numeric on, en → "TRUST score 720, Good band"', () => {
    expect(buildA11yLabel(720, true, "en")).toBe("TRUST score 720, Good band");
  });

  it('numeric on, hi → "TRUST स्कोर 720, अच्छा श्रेणी"', () => {
    expect(buildA11yLabel(720, true, "hi")).toBe(
      "TRUST स्कोर 720, अच्छा श्रेणी",
    );
  });

  it('numeric off, en → "Good band"', () => {
    expect(buildA11yLabel(720, false, "en")).toBe("Good band");
  });

  it('numeric off, hi → "अच्छा श्रेणी"', () => {
    expect(buildA11yLabel(720, false, "hi")).toBe("अच्छा श्रेणी");
  });
});

// ─── formatAsOf ─────────────────────────────────────────────────

describe("formatAsOf", () => {
  const testDate = "2026-04-10T10:00:00Z";

  it('en format contains "Updated"', () => {
    expect(formatAsOf(testDate, "en")).toContain("Updated");
  });

  it('hi format contains "अपडेट"', () => {
    expect(formatAsOf(testDate, "hi")).toContain("अपडेट");
  });

  it('en format contains "Tap for help"', () => {
    expect(formatAsOf(testDate, "en")).toContain("Tap for help");
  });

  it('hi format contains "मदद"', () => {
    expect(formatAsOf(testDate, "hi")).toContain("मदद");
  });
});
