/**
 * TRUST Sanction Review — Page & Shell Tests (C1)
 *
 * Tests:
 *   1. Loading state renders all skeleton blocks
 *   2. Tab triggers present with correct labels
 *   3. Sticky footer exists with action buttons
 *   4. Farmer header card renders with name
 *   5. Score hero shows score when snapshot provided
 *   6. Decision badge renders correct decision
 *   7. Pillar bars render for each pillar
 *   8. Group rollup strip renders groups
 */

import React from "react";
import { render, screen, within } from "@testing-library/react";
import TrustReviewLoading from "@/app/dashboard/farmer/[id]/trust-review/loading";
import TrustReviewShell from "@/app/dashboard/farmer/[id]/trust-review/TrustReviewShell";

// ─── Mock next/link (no router needed for unit tests) ──────────

jest.mock("next/link", () => {
  return function MockLink({
    children,
    href,
    ...props
  }: {
    children: React.ReactNode;
    href: string;
    [key: string]: unknown;
  }) {
    return (
      <a href={href} {...props}>
        {children}
      </a>
    );
  };
});

// ─── Mock lucide-react icons to simple spans ────────────────────

// Mock useOnline hook
jest.mock("@/hooks/useOnline", () => ({
  useOnline: () => ({ isOnline: true, lastOnlineAt: new Date().toISOString() }),
}));

jest.mock("lucide-react", () => ({
  ChevronRight: (props: Record<string, unknown>) => (
    <span data-testid="icon-chevron" {...props} />
  ),
  ArrowLeft: (props: Record<string, unknown>) => (
    <span data-testid="icon-arrow-left" {...props} />
  ),
  Download: (props: Record<string, unknown>) => (
    <span data-testid="icon-download" {...props} />
  ),
  RefreshCw: (props: Record<string, unknown>) => (
    <span data-testid="icon-refresh" {...props} />
  ),
}));

// ─── Test Data ──────────────────────────────────────────────────

const MOCK_FARMER = {
  id: 42,
  firstName: "Rajesh",
  lastName: "Patil",
  village: "Wardha",
};

const MOCK_SNAPSHOT = {
  snapshotUuid: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  farmerId: 42,
  score: 720,
  decision: "SANCTION" as const,
  scoreBand: "good",
  computedAt: "2026-04-14T10:00:00Z",
  pillars: [
    { code: "P1", name: "Personal", weight: 0.15, score: 75, rawPoints: 30, maxPoints: 40, contribution: 112.5 },
    { code: "P2", name: "Farm Details", weight: 0.20, score: 80, rawPoints: 32, maxPoints: 40, contribution: 160 },
    { code: "P3", name: "Financial", weight: 0.20, score: 65, rawPoints: 26, maxPoints: 40, contribution: 130 },
    { code: "P4", name: "Repayment", weight: 0.20, score: 70, rawPoints: 28, maxPoints: 40, contribution: 140 },
    { code: "P5", name: "Collateral", weight: 0.15, score: 60, rawPoints: 24, maxPoints: 40, contribution: 90 },
    { code: "P6", name: "Network", weight: 0.10, score: 55, rawPoints: 22, maxPoints: 40, contribution: 55 },
  ],
  groups: [
    { groupCode: "DEMO", groupLabel: "Demographic", score: 75, deltaVsBenchmark: 5 },
    { groupCode: "OPS", groupLabel: "Operational", score: 72, deltaVsBenchmark: -3 },
    { groupCode: "ASSET", groupLabel: "Asset Quality", score: 68, deltaVsBenchmark: null },
    { groupCode: "EXT", groupLabel: "External", score: 55, deltaVsBenchmark: -10 },
  ],
  evidence: [
    { pillarCode: "P3", featureCode: "AA_FINANCIAL_HEALTH", source: "AA", confidence: "HIGH" },
  ],
  cibil: { flag: true, overdueInr: 15000, issuer: "SBI" },
  farmer: { name: "Rajesh Patil", farmerId: 42, village: "Wardha" },
};

const MOCK_AUDIT: never[] = [];
const MOCK_EVIDENCE = MOCK_SNAPSHOT.evidence;

// ─── Tests ──────────────────────────────────────────────────────

describe("TrustReviewLoading", () => {
  it("renders the full skeleton layout", () => {
    render(<TrustReviewLoading />);

    const container = screen.getByTestId("trust-review-loading");
    expect(container).toBeInTheDocument();
  });

  it("renders skeleton score placeholder", () => {
    render(<TrustReviewLoading />);

    const scoreSkeleton = screen.getByTestId("skeleton-score");
    expect(scoreSkeleton).toBeInTheDocument();
  });

  it("renders sticky footer skeleton", () => {
    render(<TrustReviewLoading />);

    const footer = screen.getByTestId("sticky-footer");
    expect(footer).toBeInTheDocument();
  });
});

describe("TrustReviewShell", () => {
  const renderShell = (overrides: Partial<React.ComponentProps<typeof TrustReviewShell>> = {}) =>
    render(
      <TrustReviewShell
        farmerId={42}
        farmer={MOCK_FARMER}
        snapshot={MOCK_SNAPSHOT}
        audit={MOCK_AUDIT}
        evidence={MOCK_EVIDENCE}
        {...overrides}
      />
    );

  it("renders the page container", () => {
    renderShell();
    expect(screen.getByTestId("trust-review-page")).toBeInTheDocument();
  });

  // ─── Farmer Header ───────────────────────────────────────────

  it("renders farmer header card with name", () => {
    renderShell();

    const header = screen.getByTestId("farmer-header-card");
    expect(header).toBeInTheDocument();
    expect(header).toHaveTextContent("Rajesh Patil");
    expect(header).toHaveTextContent("Wardha");
  });

  // ─── Score Hero ───────────────────────────────────────────────

  it("renders score hero with score value", () => {
    renderShell();

    const hero = screen.getByTestId("score-hero");
    expect(hero).toBeInTheDocument();
    expect(hero).toHaveTextContent("720");
    expect(hero).toHaveTextContent("/ 1000");
  });

  it("renders decision badge with correct decision", () => {
    renderShell();

    const badge = screen.getByTestId("decision-badge");
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveTextContent("SANCTION");
  });

  // ─── Pillar Constellation ─────────────────────────────────────

  it("renders pillar bars for all 6 pillars", () => {
    renderShell();

    const constellation = screen.getByTestId("pillar-constellation");
    expect(constellation).toHaveTextContent("P1 Personal");
    expect(constellation).toHaveTextContent("P2 Farm Details");
    expect(constellation).toHaveTextContent("P3 Financial");
    expect(constellation).toHaveTextContent("P4 Repayment");
    expect(constellation).toHaveTextContent("P5 Collateral");
    expect(constellation).toHaveTextContent("P6 Network");
  });

  // ─── Group Rollup Strip ───────────────────────────────────────

  it("renders group rollup strip with groups", () => {
    renderShell();

    const strip = screen.getByTestId("group-rollup-strip");
    expect(strip).toBeInTheDocument();
    expect(strip).toHaveTextContent("Demographic");
    expect(strip).toHaveTextContent("Operational");
    expect(strip).toHaveTextContent("Asset Quality");
    expect(strip).toHaveTextContent("External");
  });

  // ─── Tab Triggers ─────────────────────────────────────────────

  it("renders all 4 tab triggers", () => {
    renderShell();

    expect(screen.getByTestId("tab-pillars")).toHaveTextContent("Pillars");
    expect(screen.getByTestId("tab-evidence")).toHaveTextContent("Evidence");
    expect(screen.getByTestId("tab-audit-trail")).toHaveTextContent("Audit trail");
    expect(screen.getByTestId("tab-drishti")).toHaveTextContent("DRISHTI projection");
  });

  // ─── Sticky Footer ───────────────────────────────────────────

  it("renders sticky footer with action buttons", () => {
    renderShell();

    const footer = screen.getByTestId("sticky-footer");
    expect(footer).toBeInTheDocument();
    expect(footer).toHaveTextContent("Export PDF");
    expect(footer).toHaveTextContent("Recompute");
    expect(screen.getByTestId("btn-sanction")).toHaveTextContent("Sanction");
    expect(screen.getByTestId("btn-reconsider")).toHaveTextContent("Reconsider");
    expect(screen.getByTestId("btn-reject")).toHaveTextContent("Reject");
  });

  // ─── No Snapshot ──────────────────────────────────────────────

  it("shows error state when snapshot is null", () => {
    renderShell({ snapshot: null });

    // Null snapshot triggers full-screen error
    expect(screen.getByTestId("error-state")).toBeInTheDocument();
    expect(screen.getByText("Failed to load TRUST data")).toBeInTheDocument();
    expect(screen.getByTestId("error-retry-btn")).toBeInTheDocument();
  });
});
