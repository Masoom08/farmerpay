/**
 * TRUST Review — State Matrix Tests (C13)
 *
 * One test per spec §1.4 state:
 *   1.  Default — no banners, footer enabled
 *   2.  Loading — isLoading selector returns true
 *   3.  Fresh compute — default state (recently computed)
 *   4.  Stale (>30d) — stale banner with day count + Refresh
 *   5.  Incomplete — incomplete state detected
 *   6.  No AA consent — info banner with low-confidence copy
 *   7.  Adverse CIBIL — adverse-cibil state detected
 *   8.  Error — error state, full-screen retry, never "0/1000"
 *   9.  Offline — offline banner with last-fetched date, footer disabled
 *  10.  Precedence: Error > Offline > Stale
 *
 * Additional selector unit tests:
 *  11.  daysSinceCompute calculates correctly
 *  12.  isStale returns false at exactly 30 days
 *  13.  isStale returns true at 31 days
 *  14.  hasNoAa detects via farmer.aaStatus
 *  15.  hasNoAa detects via missing AA evidence
 *
 * Shell integration tests:
 *  16.  Error state renders full-screen error with retry
 *  17.  Stale snapshot renders warning banner
 *  18.  No-AA renders info banner
 *  19.  Offline renders warning banner + disables footer
 *  20.  Default renders no banners
 */

import React from "react";
import { render, screen } from "@testing-library/react";

// ─── Import selectors ──────────────────────────────────────────

import {
  isLoading,
  isIncomplete,
  isStale,
  daysSinceCompute,
  hasNoAa,
  hasCibilFlag,
  deriveUiState,
  STALE_THRESHOLD_DAYS,
  type UiState,
} from "@/app/dashboard/farmer/[id]/trust-review/state";
import type { TrustSnapshot, FarmerProfile } from "@/lib/trust";

// ─── Import Shell for integration tests ────────────────────────

import TrustReviewShell from "@/app/dashboard/farmer/[id]/trust-review/TrustReviewShell";

// ─── Mocks ─────────────────────────────────────────────────────

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

jest.mock("lucide-react", () => ({
  ChevronRight: (props: Record<string, unknown>) => <span {...props} />,
  ArrowLeft: (props: Record<string, unknown>) => <span {...props} />,
  Download: (props: Record<string, unknown>) => <span {...props} />,
  RefreshCw: (props: Record<string, unknown>) => <span {...props} />,
}));

// Mock useOnline — default to online, override per-test
let mockIsOnline = true;
jest.mock("@/hooks/useOnline", () => ({
  useOnline: () => ({
    isOnline: mockIsOnline,
    lastOnlineAt: mockIsOnline ? new Date().toISOString() : null,
  }),
}));

// ─── Fixtures ──────────────────────────────────────────────────

const NOW = new Date("2026-04-14T12:00:00Z");

const MOCK_FARMER: FarmerProfile = {
  id: 42,
  firstName: "Rajesh",
  lastName: "Patil",
  village: "Wardha",
};

const MOCK_FARMER_NO_AA: FarmerProfile & { aaStatus: string } = {
  ...MOCK_FARMER,
  aaStatus: "NONE",
};

function makeSnapshot(overrides: Partial<TrustSnapshot> = {}): TrustSnapshot {
  return {
    snapshotUuid: "snap-1",
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
      { pillarCode: "P3", featureCode: "AA_FH", source: "AA", confidence: "HIGH" },
    ],
    cibil: { flag: false, overdueInr: null, issuer: null },
    farmer: { name: "Rajesh Patil", farmerId: 42, village: "Wardha" },
    ...overrides,
  };
}

const STALE_DATE = new Date(NOW.getTime() - (STALE_THRESHOLD_DAYS + 1) * 86400000).toISOString();
const FRESH_DATE = NOW.toISOString();

// ─── Shell render helper ───────────────────────────────────────

function renderShell(overrides: Partial<React.ComponentProps<typeof TrustReviewShell>> = {}) {
  return render(
    <TrustReviewShell
      farmerId={42}
      farmer={MOCK_FARMER}
      snapshot={makeSnapshot()}
      audit={[]}
      evidence={[]}
      {...overrides}
    />,
  );
}

// ─── Tests ──────────────────────────────────────────────────────

describe("State selectors (unit)", () => {
  // ─── isLoading ──────────────────────────────────────────────

  it("isLoading: true when snapshot is undefined", () => {
    expect(isLoading(undefined)).toBe(true);
  });

  it("isLoading: false when snapshot is null", () => {
    expect(isLoading(null)).toBe(false);
  });

  it("isLoading: false when snapshot exists", () => {
    expect(isLoading(makeSnapshot())).toBe(false);
  });

  // ─── isIncomplete ──────────────────────────────────────────

  it("isIncomplete: true when status=INCOMPLETE", () => {
    const snap = makeSnapshot() as TrustSnapshot & { status: string };
    snap.status = "INCOMPLETE";
    expect(isIncomplete(snap)).toBe(true);
  });

  it("isIncomplete: false for normal snapshot", () => {
    expect(isIncomplete(makeSnapshot())).toBe(false);
  });

  // ─── daysSinceCompute ──────────────────────────────────────

  it("calculates days correctly", () => {
    const tenDaysAgo = new Date(NOW.getTime() - 10 * 86400000).toISOString();
    expect(daysSinceCompute(tenDaysAgo, NOW)).toBe(10);
  });

  it("returns 0 for invalid date", () => {
    expect(daysSinceCompute("bad-date", NOW)).toBe(0);
  });

  // ─── isStale ────────────────────────────────────────────────

  it("isStale: false at exactly 30 days", () => {
    const exactly30 = new Date(NOW.getTime() - 30 * 86400000).toISOString();
    const snap = makeSnapshot({ computedAt: exactly30 });
    expect(isStale(snap, NOW)).toBe(false);
  });

  it("isStale: true at 31 days", () => {
    const snap = makeSnapshot({ computedAt: STALE_DATE });
    expect(isStale(snap, NOW)).toBe(true);
  });

  it("isStale: false for null snapshot", () => {
    expect(isStale(null, NOW)).toBe(false);
  });

  // ─── hasNoAa ────────────────────────────────────────────────

  it("detects via farmer.aaStatus=NONE", () => {
    expect(hasNoAa(MOCK_FARMER_NO_AA, makeSnapshot())).toBe(true);
  });

  it("detects via missing AA evidence in snapshot", () => {
    const snap = makeSnapshot({ evidence: [] });
    expect(hasNoAa(MOCK_FARMER, snap)).toBe(true);
  });

  it("returns false when AA evidence present", () => {
    expect(hasNoAa(MOCK_FARMER, makeSnapshot())).toBe(false);
  });

  // ─── hasCibilFlag ──────────────────────────────────────────

  it("true when cibil.flag=true", () => {
    const snap = makeSnapshot({ cibil: { flag: true, overdueInr: 15000, issuer: "SBI" } });
    expect(hasCibilFlag(snap)).toBe(true);
  });

  it("false when cibil.flag=false", () => {
    expect(hasCibilFlag(makeSnapshot())).toBe(false);
  });
});

describe("deriveUiState (precedence)", () => {
  it("Default state — no issues", () => {
    const result = deriveUiState({
      snapshot: makeSnapshot(),
      farmer: MOCK_FARMER,
      isOnline: true,
      hasError: false,
      now: NOW,
    });
    expect(result.state).toBe("default");
  });

  it("Loading state", () => {
    const result = deriveUiState({
      snapshot: undefined,
      farmer: MOCK_FARMER,
      isOnline: true,
      hasError: false,
    });
    expect(result.state).toBe("loading");
  });

  it("Error state — highest precedence", () => {
    const result = deriveUiState({
      snapshot: null,
      farmer: MOCK_FARMER,
      isOnline: true,
      hasError: true,
    });
    expect(result.state).toBe("error");
  });

  it("Offline state", () => {
    const result = deriveUiState({
      snapshot: makeSnapshot(),
      farmer: MOCK_FARMER,
      isOnline: false,
      hasError: false,
    });
    expect(result.state).toBe("offline");
  });

  it("Adverse CIBIL state", () => {
    const snap = makeSnapshot({
      cibil: { flag: true, overdueInr: 15000, issuer: "SBI" },
    });
    const result = deriveUiState({
      snapshot: snap,
      farmer: MOCK_FARMER,
      isOnline: true,
      hasError: false,
      now: NOW,
    });
    expect(result.state).toBe("adverse-cibil");
  });

  it("Stale state (>30 days)", () => {
    const snap = makeSnapshot({ computedAt: STALE_DATE });
    const result = deriveUiState({
      snapshot: snap,
      farmer: MOCK_FARMER,
      isOnline: true,
      hasError: false,
      now: NOW,
    });
    expect(result.state).toBe("stale");
    expect(result.staleDays).toBeGreaterThan(30);
  });

  it("No AA consent state", () => {
    const snap = makeSnapshot({ evidence: [] });
    const result = deriveUiState({
      snapshot: snap,
      farmer: MOCK_FARMER,
      isOnline: true,
      hasError: false,
      now: NOW,
    });
    expect(result.state).toBe("no-aa");
  });

  it("Incomplete state", () => {
    const snap = makeSnapshot() as TrustSnapshot & { status: string };
    snap.status = "INCOMPLETE";
    // Need to make sure no-aa doesn't trigger first — include AA evidence
    snap.evidence = [{ pillarCode: "P3", featureCode: "AA_FH", source: "AA", confidence: "HIGH" }];
    const result = deriveUiState({
      snapshot: snap,
      farmer: MOCK_FARMER,
      isOnline: true,
      hasError: false,
      now: NOW,
    });
    expect(result.state).toBe("incomplete");
  });

  it("Error > Offline (error wins)", () => {
    const result = deriveUiState({
      snapshot: null,
      farmer: MOCK_FARMER,
      isOnline: false,
      hasError: true,
    });
    expect(result.state).toBe("error");
  });

  it("Offline > Stale (offline wins)", () => {
    const snap = makeSnapshot({ computedAt: STALE_DATE });
    const result = deriveUiState({
      snapshot: snap,
      farmer: MOCK_FARMER,
      isOnline: false,
      hasError: false,
      now: NOW,
    });
    expect(result.state).toBe("offline");
  });

  it("Adverse CIBIL > Stale (cibil wins)", () => {
    const snap = makeSnapshot({
      computedAt: STALE_DATE,
      cibil: { flag: true, overdueInr: 5000, issuer: "PNB" },
    });
    const result = deriveUiState({
      snapshot: snap,
      farmer: MOCK_FARMER,
      isOnline: true,
      hasError: false,
      now: NOW,
    });
    expect(result.state).toBe("adverse-cibil");
    // But staleDays is still available for a secondary banner
    expect(result.staleDays).toBeGreaterThan(30);
  });
});

describe("TrustReviewShell — state rendering", () => {
  beforeEach(() => {
    mockIsOnline = true;
  });

  it("Default: no banners rendered", () => {
    renderShell();

    expect(screen.queryByTestId("state-banners")).not.toBeInTheDocument();
    expect(screen.queryByTestId("error-state")).not.toBeInTheDocument();
  });

  it("Error state: full-screen error with retry button, no score", () => {
    renderShell({ snapshot: null, hasError: true });

    expect(screen.getByTestId("error-state")).toBeInTheDocument();
    expect(screen.getByTestId("error-retry-btn")).toBeInTheDocument();
    expect(screen.getByText("Failed to load TRUST data")).toBeInTheDocument();
    // Never render "0 / 1000"
    expect(screen.queryByText("0")).not.toBeInTheDocument();
    expect(screen.queryByText("/ 1000")).not.toBeInTheDocument();
  });

  it("Stale snapshot: warning banner with days and Refresh", () => {
    renderShell({
      snapshot: makeSnapshot({ computedAt: STALE_DATE }),
    });

    const banners = screen.getByTestId("state-banners");
    expect(banners).toBeInTheDocument();

    const warning = screen.getByTestId("banner-warning");
    expect(warning).toBeInTheDocument();
    expect(warning).toHaveTextContent(/days old/);
    expect(warning).toHaveTextContent(/Refresh from AA and CIBIL/);
    expect(screen.getByTestId("banner-refresh-btn")).toBeInTheDocument();
  });

  it("No AA: info banner with low-confidence copy", () => {
    renderShell({
      snapshot: makeSnapshot({ evidence: [] }),
    });

    const info = screen.getByTestId("banner-info");
    expect(info).toBeInTheDocument();
    expect(info).toHaveTextContent("AA not consented");
    expect(info).toHaveTextContent("low confidence");
  });

  it("Offline: warning banner + footer disabled", () => {
    mockIsOnline = false;

    renderShell();

    const warning = screen.getByTestId("banner-warning");
    expect(warning).toHaveTextContent("Offline");
    expect(warning).toHaveTextContent(/showing last fetched data/);

    // Footer buttons disabled
    expect(screen.getByTestId("btn-sanction")).toBeDisabled();
    expect(screen.getByTestId("btn-reject")).toBeDisabled();
    expect(screen.getByTestId("btn-reconsider")).toBeDisabled();
  });

  it("Online default: footer buttons enabled", () => {
    renderShell();

    expect(screen.getByTestId("btn-sanction")).not.toBeDisabled();
    expect(screen.getByTestId("btn-reject")).not.toBeDisabled();
  });

  it("No snapshot (null) without error flag: renders error screen", () => {
    // When snapshot is null and no hasError flag, deriveUiState returns "error"
    // because there's nothing to display
    renderShell({ snapshot: null });

    expect(screen.getByTestId("error-state")).toBeInTheDocument();
    // Footer is not rendered in error state
    expect(screen.queryByTestId("btn-sanction")).not.toBeInTheDocument();
  });
});
