/**
 * TrustScoreHero — Unit Tests (C3)
 *
 * Tests:
 *   1. Renders score value and "/ 1000"
 *   2. Decision pill shows correct label and colour class
 *   3. Delta chip: up (▲), down (▼), unchanged (•)
 *   4. aria-label matches spec verbatim
 *   5. role="status" + aria-live="polite" on the number
 *   6. "View evidence" click fires callback
 *   7. Skeleton shown when score is null/undefined — never "0 / 1000"
 *   8. Count-up reaches final value
 *   9. Count-up snaps when prefers-reduced-motion is on
 *  10. Hover tooltip contains computed date
 */

import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";
import {
  TrustScoreHero,
  type TrustScoreHeroProps,
} from "@/components/trust/TrustScoreHero";

// ─── Mock matchMedia ────────────────────────────────────────────

let mockReducedMotion = false;

beforeAll(() => {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: jest.fn().mockImplementation((query: string) => ({
      matches: query === "(prefers-reduced-motion: reduce)" ? mockReducedMotion : false,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  });
});

beforeEach(() => {
  mockReducedMotion = false;
});

// ─── Mock requestAnimationFrame for deterministic count-up ──────

let rafCallbacks: Array<(time: number) => void> = [];
let rafIdCounter = 1;

beforeEach(() => {
  rafCallbacks = [];
  rafIdCounter = 1;

  jest.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
    const id = rafIdCounter++;
    rafCallbacks.push(cb);
    return id;
  });

  jest.spyOn(window, "cancelAnimationFrame").mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

function flushRaf(timestamp: number) {
  const cbs = [...rafCallbacks];
  rafCallbacks = [];
  cbs.forEach((cb) => cb(timestamp));
}

// ─── Default Props ──────────────────────────────────────────────

const DEFAULT_PROPS: TrustScoreHeroProps = {
  persona: "banker",
  score: 864,
  decision: "SANCTION",
  previousScore: 817,
  asOf: "2026-04-14T10:00:00Z",
  isFreshCompute: false,
  onViewEvidence: jest.fn(),
};

const renderHero = (overrides: Partial<TrustScoreHeroProps> = {}) =>
  render(<TrustScoreHero {...DEFAULT_PROPS} {...overrides} />);

// ─── Tests ──────────────────────────────────────────────────────

describe("TrustScoreHero", () => {
  // ─── Basic rendering ────────────────────────────────────────

  it("renders score value and '/ 1000'", () => {
    renderHero();

    expect(screen.getByTestId("count-up-value")).toHaveTextContent("864");
    expect(screen.getByText("/ 1000")).toBeInTheDocument();
  });

  it("renders the hero container", () => {
    renderHero();

    expect(screen.getByTestId("trust-score-hero")).toBeInTheDocument();
  });

  // ─── Decision pill ──────────────────────────────────────────

  it("renders SANCTION decision pill with correct label", () => {
    renderHero({ decision: "SANCTION" });

    const pill = screen.getByTestId("decision-pill");
    expect(pill).toHaveTextContent("Sanction");
    expect(pill.className).toContain("bg-decision-sanction");
  });

  it("renders RECONSIDER decision pill", () => {
    renderHero({ decision: "RECONSIDER" });

    const pill = screen.getByTestId("decision-pill");
    expect(pill).toHaveTextContent("Reconsider");
    expect(pill.className).toContain("bg-decision-reconsider");
  });

  it("renders REJECT decision pill", () => {
    renderHero({ decision: "REJECT" });

    const pill = screen.getByTestId("decision-pill");
    expect(pill).toHaveTextContent("Reject");
    expect(pill.className).toContain("bg-decision-reject");
  });

  // ─── Delta chip ─────────────────────────────────────────────

  it("renders delta chip with up arrow when score increased", () => {
    renderHero({ score: 864, previousScore: 817 });

    const chip = screen.getByTestId("delta-chip");
    expect(chip).toHaveTextContent("\u25B2 +47 vs last month (817 \u2192 864)");
    expect(chip.className).toContain("text-brand-primary-700");
  });

  it("renders delta chip with down arrow when score decreased", () => {
    renderHero({ score: 780, previousScore: 817 });

    const chip = screen.getByTestId("delta-chip");
    expect(chip).toHaveTextContent("\u25BC -37 vs last month (817 \u2192 780)");
    expect(chip.className).toContain("text-decision-reject");
  });

  it("renders delta chip with dot when score unchanged", () => {
    renderHero({ score: 817, previousScore: 817 });

    const chip = screen.getByTestId("delta-chip");
    expect(chip).toHaveTextContent("\u2022 0 vs last month (817 \u2192 817)");
    expect(chip.className).toContain("text-muted-foreground");
  });

  it("does not render delta chip when previousScore is missing", () => {
    renderHero({ previousScore: undefined });

    expect(screen.queryByTestId("delta-chip")).not.toBeInTheDocument();
  });

  // ─── Accessibility ──────────────────────────────────────────

  it("has correct aria-label per spec §1.3", () => {
    renderHero({ score: 864, decision: "SANCTION" });

    const hero = screen.getByTestId("trust-score-hero");
    expect(hero).toHaveAttribute(
      "aria-label",
      "TRUST score 864 out of 1000. Decision: Sanction."
    );
  });

  it("has correct aria-label for RECONSIDER", () => {
    renderHero({ score: 550, decision: "RECONSIDER" });

    const hero = screen.getByTestId("trust-score-hero");
    expect(hero).toHaveAttribute(
      "aria-label",
      "TRUST score 550 out of 1000. Decision: Reconsider."
    );
  });

  it("has correct aria-label for REJECT", () => {
    renderHero({ score: 300, decision: "REJECT" });

    const hero = screen.getByTestId("trust-score-hero");
    expect(hero).toHaveAttribute(
      "aria-label",
      "TRUST score 300 out of 1000. Decision: Reject."
    );
  });

  it('has role="status" and aria-live="polite" on the score container', () => {
    renderHero();

    const statusEl = screen.getByRole("status");
    expect(statusEl).toHaveAttribute("aria-live", "polite");
    // It should contain the score value
    expect(statusEl).toHaveTextContent("864");
  });

  // ─── View evidence CTA ─────────────────────────────────────

  it("fires onViewEvidence callback when CTA is clicked", () => {
    const onViewEvidence = jest.fn();
    renderHero({ onViewEvidence });

    const cta = screen.getByTestId("view-evidence-cta");
    expect(cta).toHaveTextContent("View evidence");

    fireEvent.click(cta);
    expect(onViewEvidence).toHaveBeenCalledTimes(1);
  });

  // ─── Skeleton / null score ──────────────────────────────────

  it("renders skeleton when score is null — never shows 0 / 1000", () => {
    renderHero({ score: null });

    expect(screen.getByTestId("skeleton-score")).toBeInTheDocument();
    expect(screen.queryByText("0")).not.toBeInTheDocument();
    expect(screen.getByText("Score unavailable")).toBeInTheDocument();
  });

  it("renders skeleton when score is undefined", () => {
    renderHero({ score: undefined });

    expect(screen.getByTestId("skeleton-score")).toBeInTheDocument();
  });

  // ─── Count-up animation ─────────────────────────────────────

  it("count-up reaches final value after animation duration", () => {
    renderHero({ score: 864, isFreshCompute: true });

    // Initial: starts at 0 (first render before any rAF)
    const countUp = screen.getByTestId("count-up-value");

    // Simulate rAF at t=0 (start)
    act(() => flushRaf(0));

    // Simulate rAF at t=160 (halfway)
    act(() => flushRaf(160));
    // Should be partially through
    const midValue = parseInt(countUp.textContent!, 10);
    expect(midValue).toBeGreaterThan(0);

    // Simulate rAF at t=320 (end)
    act(() => flushRaf(320));
    expect(countUp).toHaveTextContent("864");
  });

  it("count-up snaps immediately when prefers-reduced-motion is on", () => {
    mockReducedMotion = true;

    renderHero({ score: 864, isFreshCompute: true });

    // Should immediately show the final value, no animation
    const countUp = screen.getByTestId("count-up-value");
    expect(countUp).toHaveTextContent("864");
  });

  it("snaps to value immediately when isFreshCompute is false", () => {
    renderHero({ score: 864, isFreshCompute: false });

    // No animation — value shown immediately
    const countUp = screen.getByTestId("count-up-value");
    expect(countUp).toHaveTextContent("864");
  });

  // ─── Computed date ──────────────────────────────────────────

  it("shows computed date", () => {
    renderHero({ asOf: "2026-04-14T10:00:00Z" });

    const dateEl = screen.getByTestId("computed-date");
    expect(dateEl).toHaveTextContent("Computed:");
    // Should contain "14 Apr" at minimum
    expect(dateEl.textContent).toMatch(/14/);
    expect(dateEl.textContent).toMatch(/Apr/);
  });

  // ─── Tooltip ────────────────────────────────────────────────

  it("has hover tooltip with computed date", () => {
    renderHero();

    const tooltip = screen.getByRole("tooltip");
    expect(tooltip.textContent).toMatch(/Computed/);
  });
});
