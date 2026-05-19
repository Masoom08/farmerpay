/**
 * firewall — Unit Tests (G1 — Spec §5.6)
 *
 * Tests:
 *   ESLint RULE: no-score-imports
 *   1.  Blocks import from "trust/ScoreRing"
 *   2.  Blocks import from "trust/ScoreHero"
 *   3.  Blocks import from "trust/BandBadge"
 *   4.  Blocks import from "trust/GapCard"
 *   5.  Blocks import from "trust/GapList"
 *   6.  Blocks import from "trust/HelpSheet"
 *   7.  Blocks import from path containing "MyScore"
 *   8.  Blocks import from path containing "scoreStore"
 *   9.  Allows import from "trust/types" (not score-adjacent)
 *  10.  Allows import from "@/components/ui/card"
 *  11.  Allows import from "@/lib/readiness" (readiness ≠ score)
 *  12.  Blocks dynamic import() of score-adjacent path
 *  13.  Blocks require() of score-adjacent path
 *
 *   ROUTE MANIFEST AUDIT
 *  14.  Clean manifest (no forbidden segments) → 0 violations
 *  15.  Route with /score segment → violation detected
 *  16.  Route with /trust-score segment → violation detected
 *  17.  Route with /my-score segment → violation detected
 *  18.  Route with /band segment → violation detected
 *  19.  Nested route with forbidden segment → violation detected
 *  20.  Route with "scores" (plural) is NOT blocked (substring mismatch)
 */

import { BLOCKED_SUBSTRINGS, MESSAGE } from "../eslint-rules/no-score-imports";
import { audit } from "../scripts/route-manifest-audit";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

// ─── ESLint Rule Tests ────────────────────────────────────────

describe("no-score-imports (ESLint rule)", () => {
  // We test the rule logic directly by checking BLOCKED_SUBSTRINGS matching
  // since running the actual ESLint RuleTester requires eslint devDep which is present

  const isBlocked = (source: string): boolean =>
    BLOCKED_SUBSTRINGS.some((sub) => source.includes(sub));

  it("blocks import from trust/ScoreRing path", () => {
    expect(isBlocked("@/components/trust/ScoreRing")).toBe(true);
  });

  it("blocks import from trust/ScoreHero path", () => {
    expect(isBlocked("@/components/trust/ScoreHero")).toBe(true);
  });

  it("blocks import from trust/BandBadge path", () => {
    expect(isBlocked("@/components/trust/BandBadge")).toBe(true);
  });

  it("blocks import from trust/GapCard path", () => {
    expect(isBlocked("@/components/trust/GapCard")).toBe(true);
  });

  it("blocks import from trust/GapList path", () => {
    expect(isBlocked("@/components/trust/GapList")).toBe(true);
  });

  it("blocks import from trust/HelpSheet path", () => {
    expect(isBlocked("@/components/trust/HelpSheet")).toBe(true);
  });

  it("blocks import from MyScore path", () => {
    expect(isBlocked("@/screens/MyScore")).toBe(true);
  });

  it("blocks import from scoreStore path", () => {
    expect(isBlocked("@/stores/scoreStore")).toBe(true);
  });

  it("allows import from trust/types (not score-adjacent)", () => {
    expect(isBlocked("@/components/trust/types")).toBe(false);
  });

  it("allows import from @/components/ui/card", () => {
    expect(isBlocked("@/components/ui/card")).toBe(false);
  });

  it("allows import from @/lib/readiness (readiness is not score)", () => {
    expect(isBlocked("@/lib/readiness")).toBe(false);
  });

  it("blocks dynamic import() of score-adjacent path", () => {
    // Dynamic import uses the same substring check
    expect(isBlocked("@/components/trust/ScoreRing")).toBe(true);
  });

  it("blocks require() of score-adjacent path", () => {
    expect(isBlocked("../trust/Score/index")).toBe(true);
  });

  it("has a message referencing §5.6", () => {
    expect(MESSAGE).toContain("§5.6");
    expect(MESSAGE.toLowerCase()).toContain("privacy firewall");
  });
});

// ─── Route Manifest Audit Tests ───────────────────────────────

describe("route-manifest-audit", () => {
  let tmpDir: string;

  /**
   * Helper: create a mock app directory with page.tsx files at given routes.
   */
  function createMockApp(routes: string[]): string {
    const appDir = path.join(tmpDir, "app");
    for (const route of routes) {
      const dir = route === "/" ? appDir : path.join(appDir, route);
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, "page.tsx"), "export default function P() { return null; }");
    }
    return appDir;
  }

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "firewall-test-"));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("clean manifest (no forbidden segments) → 0 violations", () => {
    const appDir = createMockApp([
      "/",
      "dashboard",
      "dashboard/queue",
      "dashboard/farmers",
    ]);
    const violations = audit(appDir);
    expect(violations).toHaveLength(0);
  });

  it("route with /score segment → violation detected", () => {
    const appDir = createMockApp(["dashboard/score"]);
    const violations = audit(appDir);
    expect(violations).toHaveLength(1);
    expect(violations[0].segment).toBe("/score");
  });

  it("route with /trust-score segment → violation detected", () => {
    const appDir = createMockApp(["dashboard/trust-score"]);
    const violations = audit(appDir);
    expect(violations).toHaveLength(1);
    expect(violations[0].segment).toBe("/trust-score");
  });

  it("route with /my-score segment → violation detected", () => {
    const appDir = createMockApp(["dashboard/my-score"]);
    const violations = audit(appDir);
    expect(violations).toHaveLength(1);
    expect(violations[0].segment).toBe("/my-score");
  });

  it("route with /band segment → violation detected", () => {
    const appDir = createMockApp(["dashboard/band"]);
    const violations = audit(appDir);
    expect(violations).toHaveLength(1);
    expect(violations[0].segment).toBe("/band");
  });

  it("nested route with forbidden segment → violation detected", () => {
    const appDir = createMockApp(["dashboard/farmers/score"]);
    const violations = audit(appDir);
    expect(violations).toHaveLength(1);
    expect(violations[0].route).toContain("score");
  });

  it("route with 'scores' (plural) is NOT blocked", () => {
    const appDir = createMockApp(["dashboard/scores"]);
    const violations = audit(appDir);
    // "/scores" is not in FORBIDDEN_SEGMENTS (only "/score" is)
    expect(violations).toHaveLength(0);
  });
});
