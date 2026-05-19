/**
 * RoutePlannerStrip — Unit Tests (G3 — Spec §5.2)
 *
 * Tests:
 *   1.  Renders nothing when stops is empty
 *   2.  Renders single village stop
 *   3.  Renders multiple villages with arrows between them
 *   4.  No arrow after last village
 *   5.  Each stop shows village name
 *   6.  Each stop shows pending count
 *   7.  Shows "Route:" label
 *   8.  Preserves order (caller-supplied)
 *   9.  No score-adjacent strings in rendered output
 */

import React from "react";
import { render, screen } from "@testing-library/react";
import RoutePlannerStrip, {
  type VillageStop,
} from "../../src/components/RoutePlannerStrip";

const STOPS: VillageStop[] = [
  { village: "Kheda", pendingCount: 3 },
  { village: "Mandvi", pendingCount: 2 },
  { village: "Dahod", pendingCount: 1 },
];

describe("RoutePlannerStrip", () => {
  it("renders nothing when stops is empty", () => {
    const { container } = render(<RoutePlannerStrip stops={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders single village stop", () => {
    render(<RoutePlannerStrip stops={[STOPS[0]]} />);
    expect(screen.getByTestId("route-planner-strip")).toBeTruthy();
    expect(screen.getAllByTestId("route-stop")).toHaveLength(1);
  });

  it("renders multiple villages", () => {
    render(<RoutePlannerStrip stops={STOPS} />);
    expect(screen.getAllByTestId("route-stop")).toHaveLength(3);
  });

  it("renders arrows between villages but not after last", () => {
    const { container } = render(<RoutePlannerStrip stops={STOPS} />);
    // There should be exactly 2 arrows for 3 stops
    const arrows = container.querySelectorAll('[aria-hidden="true"]');
    expect(arrows).toHaveLength(2);
  });

  it("each stop shows village name", () => {
    render(<RoutePlannerStrip stops={STOPS} />);
    const names = screen.getAllByTestId("route-stop-village").map(
      (el) => el.textContent,
    );
    expect(names).toEqual(["Kheda", "Mandvi", "Dahod"]);
  });

  it("each stop shows pending count", () => {
    render(<RoutePlannerStrip stops={STOPS} />);
    const counts = screen.getAllByTestId("route-stop-count").map(
      (el) => el.textContent,
    );
    expect(counts).toEqual(["(3)", "(2)", "(1)"]);
  });

  it('shows "Route:" label', () => {
    render(<RoutePlannerStrip stops={STOPS} />);
    expect(screen.getByTestId("route-planner-strip")).toHaveTextContent("Route:");
  });

  it("preserves caller-supplied order", () => {
    const reversed: VillageStop[] = [
      { village: "Dahod", pendingCount: 1 },
      { village: "Mandvi", pendingCount: 2 },
      { village: "Kheda", pendingCount: 3 },
    ];
    render(<RoutePlannerStrip stops={reversed} />);
    const names = screen.getAllByTestId("route-stop-village").map(
      (el) => el.textContent,
    );
    expect(names).toEqual(["Dahod", "Mandvi", "Kheda"]);
  });

  it("no score-adjacent strings in rendered output", () => {
    render(<RoutePlannerStrip stops={STOPS} />);
    const text = (document.body.textContent || "").toLowerCase();
    expect(text).not.toContain("score");
    expect(text).not.toContain("trust");
    expect(text).not.toContain("point lift");
  });
});
