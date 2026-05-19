/**
 * PillarConstellation — Unit Tests (C5)
 *
 * Tests:
 *   1. Renders 6 pillar points (dots)
 *   2. onClick fires with correct pillar code
 *   3. sr-only list contains all 6 pillars with scores
 *   4. Missing pillars show "missing" in sr-only list
 *   5. Container renders with data-testid
 *   6. Axis tick labels rendered for each pillar
 *   7. Low-confidence pillar indicated in sr-only list weight
 */

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import {
  PillarConstellation,
  type PillarConstellationProps,
  type Pillar,
} from "@/components/trust/PillarConstellation";

// ─── Mock Recharts ──────────────────────────────────────────────
// Recharts needs a real DOM + ResizeObserver. We mock it to render
// the dot and tick callbacks directly so we can test interaction logic.

jest.mock("recharts", () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const React = require("react");

  // Minimal mock that renders children + invokes dot/tick render props
  const RadarChart = ({ children, data }: { children: React.ReactNode; data: Array<{ code: string; subject: string }> }) => (
    <svg data-testid="mock-radar-chart">
      {/* Render tick callbacks for each data point */}
      {data.map((d: { code: string; subject: string }, i: number) => {
        // Find the PolarAngleAxis child to get the tick render prop
        const paa = React.Children.toArray(children).find(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (c: any) => c?.type?.displayName === "PolarAngleAxis",
        );
        if (paa?.props?.tick) {
          const TickComponent = paa.props.tick;
          return (
            <TickComponent
              key={`tick-${d.code}`}
              x={50 + i * 30}
              y={50}
              payload={{ value: d.subject, index: i }}
              index={i}
            />
          );
        }
        return null;
      })}
      {/* Render dot callbacks for each data point */}
      {data.map((d: { code: string }, i: number) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const radar = React.Children.toArray(children).find(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (c: any) => c?.type?.displayName === "Radar",
        );
        if (radar?.props?.dot) {
          const DotComponent = radar.props.dot;
          return (
            <DotComponent
              key={`dot-${d.code}`}
              cx={100 + i * 20}
              cy={100}
              index={i}
            />
          );
        }
        return null;
      })}
      {children}
    </svg>
  );

  const Radar = ({ children }: { children?: React.ReactNode }) => <g data-testid="mock-radar">{children}</g>;
  Radar.displayName = "Radar";

  const PolarGrid = () => <g data-testid="mock-polar-grid" />;
  PolarGrid.displayName = "PolarGrid";

  const PolarAngleAxis = () => <g data-testid="mock-polar-angle-axis" />;
  PolarAngleAxis.displayName = "PolarAngleAxis";

  const ResponsiveContainer = ({ children }: { children: React.ReactNode }) => <div>{children}</div>;

  const Tooltip = () => null;
  Tooltip.displayName = "Tooltip";

  return {
    RadarChart,
    Radar,
    PolarGrid,
    PolarAngleAxis,
    ResponsiveContainer,
    Tooltip,
  };
});

// ─── Test Data ──────────────────────────────────────────────────

const MOCK_PILLARS: Pillar[] = [
  { code: "P1", name: "Personal", score: 75, weight: 0.15, confidence: "HIGH" },
  { code: "P2", name: "Farm Details", score: 80, weight: 0.20, confidence: "HIGH" },
  { code: "P3", name: "Financial", score: 65, weight: 0.20, confidence: "MEDIUM" },
  { code: "P4", name: "Repayment", score: 70, weight: 0.20, confidence: "HIGH" },
  { code: "P5", name: "Collateral", score: 60, weight: 0.15, confidence: "LOW" },
  { code: "P6", name: "Network", score: 55, weight: 0.10, confidence: "HIGH" },
];

const renderConstellation = (overrides: Partial<PillarConstellationProps> = {}) => {
  const onPillarClick = jest.fn();
  const result = render(
    <PillarConstellation
      pillars={MOCK_PILLARS}
      onPillarClick={onPillarClick}
      {...overrides}
    />,
  );
  return { ...result, onPillarClick: overrides.onPillarClick ?? onPillarClick };
};

// ─── Tests ──────────────────────────────────────────────────────

describe("PillarConstellation", () => {
  // ─── Rendering ──────────────────────────────────────────────

  it("renders the constellation container", () => {
    renderConstellation();
    expect(screen.getByTestId("pillar-constellation")).toBeInTheDocument();
  });

  it("renders radar chart container", () => {
    renderConstellation();
    expect(screen.getByTestId("radar-chart-container")).toBeInTheDocument();
  });

  it("renders 6 pillar dots", () => {
    renderConstellation();

    expect(screen.getByTestId("dot-P1")).toBeInTheDocument();
    expect(screen.getByTestId("dot-P2")).toBeInTheDocument();
    expect(screen.getByTestId("dot-P3")).toBeInTheDocument();
    expect(screen.getByTestId("dot-P4")).toBeInTheDocument();
    expect(screen.getByTestId("dot-P5")).toBeInTheDocument();
    expect(screen.getByTestId("dot-P6")).toBeInTheDocument();
  });

  it("renders 6 axis tick labels", () => {
    renderConstellation();

    expect(screen.getByTestId("tick-P1")).toBeInTheDocument();
    expect(screen.getByTestId("tick-P2")).toBeInTheDocument();
    expect(screen.getByTestId("tick-P3")).toBeInTheDocument();
    expect(screen.getByTestId("tick-P4")).toBeInTheDocument();
    expect(screen.getByTestId("tick-P5")).toBeInTheDocument();
    expect(screen.getByTestId("tick-P6")).toBeInTheDocument();
  });

  // ─── Click interaction ──────────────────────────────────────

  it("onClick fires with correct pillar code when dot clicked", () => {
    const onPillarClick = jest.fn();
    renderConstellation({ onPillarClick });

    fireEvent.click(screen.getByTestId("dot-P3"));
    expect(onPillarClick).toHaveBeenCalledWith("P3");
  });

  it("onClick fires with correct pillar code when tick clicked", () => {
    const onPillarClick = jest.fn();
    renderConstellation({ onPillarClick });

    fireEvent.click(screen.getByTestId("tick-P1"));
    expect(onPillarClick).toHaveBeenCalledWith("P1");
  });

  it("each dot click fires its own pillar code", () => {
    const onPillarClick = jest.fn();
    renderConstellation({ onPillarClick });

    fireEvent.click(screen.getByTestId("dot-P1"));
    expect(onPillarClick).toHaveBeenLastCalledWith("P1");

    fireEvent.click(screen.getByTestId("dot-P5"));
    expect(onPillarClick).toHaveBeenLastCalledWith("P5");

    fireEvent.click(screen.getByTestId("dot-P6"));
    expect(onPillarClick).toHaveBeenLastCalledWith("P6");

    expect(onPillarClick).toHaveBeenCalledTimes(3);
  });

  // ─── sr-only accessible list ────────────────────────────────

  it("renders sr-only list with all 6 pillars", () => {
    renderConstellation();

    const list = screen.getByTestId("sr-pillar-list");
    expect(list).toBeInTheDocument();
    expect(list).toHaveAttribute("aria-label", "Pillar scores");

    // Check each pillar is listed
    expect(screen.getByTestId("sr-pillar-P1")).toHaveTextContent("P1");
    expect(screen.getByTestId("sr-pillar-P2")).toHaveTextContent("P2");
    expect(screen.getByTestId("sr-pillar-P3")).toHaveTextContent("P3");
    expect(screen.getByTestId("sr-pillar-P4")).toHaveTextContent("P4");
    expect(screen.getByTestId("sr-pillar-P5")).toHaveTextContent("P5");
    expect(screen.getByTestId("sr-pillar-P6")).toHaveTextContent("P6");
  });

  it("sr-only list contains scores for each pillar", () => {
    renderConstellation();

    expect(screen.getByTestId("sr-pillar-P1")).toHaveTextContent("75 out of 100");
    expect(screen.getByTestId("sr-pillar-P2")).toHaveTextContent("80 out of 100");
    expect(screen.getByTestId("sr-pillar-P3")).toHaveTextContent("65 out of 100");
    expect(screen.getByTestId("sr-pillar-P4")).toHaveTextContent("70 out of 100");
    expect(screen.getByTestId("sr-pillar-P5")).toHaveTextContent("60 out of 100");
    expect(screen.getByTestId("sr-pillar-P6")).toHaveTextContent("55 out of 100");
  });

  it("sr-only list contains weight percentages", () => {
    renderConstellation();

    expect(screen.getByTestId("sr-pillar-P1")).toHaveTextContent("weight 15%");
    expect(screen.getByTestId("sr-pillar-P2")).toHaveTextContent("weight 20%");
    expect(screen.getByTestId("sr-pillar-P6")).toHaveTextContent("weight 10%");
  });

  // ─── Missing pillars ───────────────────────────────────────

  it('shows "missing" in sr-only list for missing pillars', () => {
    renderConstellation({ missingPillars: ["P2", "P4"] });

    expect(screen.getByTestId("sr-pillar-P2")).toHaveTextContent("missing");
    expect(screen.getByTestId("sr-pillar-P4")).toHaveTextContent("missing");
    // Non-missing should still have score
    expect(screen.getByTestId("sr-pillar-P1")).toHaveTextContent("75 out of 100");
  });

  // ─── sr-only list is a <ul> ─────────────────────────────────

  it("sr-only list is a <ul> element with sr-only class", () => {
    renderConstellation();

    const list = screen.getByTestId("sr-pillar-list");
    expect(list.tagName).toBe("UL");
    expect(list.className).toContain("sr-only");
  });

  it("each pillar in sr-only list is a <li>", () => {
    renderConstellation();

    const item = screen.getByTestId("sr-pillar-P1");
    expect(item.tagName).toBe("LI");
  });
});
