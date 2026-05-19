/**
 * Sathi dashboard — Visual regression snapshots.
 *
 * Baseline snapshots for Sathi role-gated surfaces.
 * CI fails on unintended structural diffs.
 *
 * Surfaces:
 *   - CoachingPriority badge: all levels + null
 *   - Forbidden-string guard: no FHS/financialHealth in rendered output
 *
 * Key invariant: Sathi surfaces NEVER render FHS data.
 */

import React from "react";
import { render } from "@testing-library/react";
import CoachingPriority from "../../src/components/readiness/CoachingPriority";
import type { CoachingPriorityLevel } from "../../src/components/readiness/CoachingPriority";

const PRIORITIES: CoachingPriorityLevel[] = ["high", "medium", "low"];

// ═══════════════════════════════════════════════════════════════════

describe("Visual regression: Sathi surfaces", () => {
  // ─── CoachingPriority badge snapshots ──────────────────────

  describe("CoachingPriority badge — all levels", () => {
    for (const priority of PRIORITIES) {
      it(`snapshot: priority="${priority}"`, () => {
        const { container } = render(<CoachingPriority priority={priority} />);
        expect(container.firstChild).toMatchSnapshot();
      });

      it(`snapshot: priority="${priority}" compact`, () => {
        const { container } = render(<CoachingPriority priority={priority} compact />);
        expect(container.firstChild).toMatchSnapshot();
      });
    }

    it("snapshot: null priority", () => {
      const { container } = render(<CoachingPriority priority={null} />);
      expect(container.firstChild).toMatchSnapshot();
    });

    it("snapshot: undefined priority", () => {
      const { container } = render(<CoachingPriority priority={undefined} />);
      expect(container.firstChild).toMatchSnapshot();
    });
  });

  // ─── FHS forbidden-string guard ────────────────────────────

  describe("FHS never appears in Sathi badge output", () => {
    for (const priority of PRIORITIES) {
      it(`priority="${priority}" output contains no FHS strings`, () => {
        const { container } = render(<CoachingPriority priority={priority} />);
        const html = container.innerHTML;

        const FHS_PATTERNS = [
          /financial.?health/i,
          /\bfhs\b/i,
          /fhsScore/i,
          /fhs.?breakdown/i,
          /fhs.?grade/i,
        ];

        for (const pattern of FHS_PATTERNS) {
          expect(html).not.toMatch(pattern);
        }
      });
    }
  });
});
