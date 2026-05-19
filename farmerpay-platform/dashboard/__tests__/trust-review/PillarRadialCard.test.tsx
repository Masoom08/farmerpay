/**
 * PillarRadialCard — Unit Tests (C8)
 *
 * Tests:
 *   1. Renders card with code, name, weight, score
 *   2. Expand toggle reveals BandLadder rows
 *   3. Collapsed hides detail content
 *   4. aria-expanded reflects state
 *   5. Radial ring SVG rendered
 *   6. Confidence badge shows correct label
 *   7. Focus ref is populated (keyboard shortcut target)
 *   8. Chevron rotates on expand
 */

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import {
  PillarRadialCard,
  type PillarRadialCardProps,
} from "@/components/trust/PillarRadialCard";
import type { SubFeature } from "@/components/trust/BandLadder";

// ─── Mock lucide-react ──────────────────────────────────────────

jest.mock("lucide-react", () => ({
  ChevronDown: ({ className, ...props }: Record<string, unknown>) => (
    <span data-testid="chevron-icon" className={className as string} {...props} />
  ),
}));

// ─── Test Data ──────────────────────────────────────────────────

const MOCK_SUB_FEATURES: SubFeature[] = [
  { featureCode: "Q_101", featureName: "Age group", band: 4, bandLabel: "Strong", source: "QUESTIONNAIRE" },
  { featureCode: "Q_102", featureName: "Household size", band: 3, bandLabel: "Building", source: "QUESTIONNAIRE" },
];

const DEFAULT_PROPS: PillarRadialCardProps = {
  code: "P1",
  name: "Personal",
  score: 75,
  weightPct: 15,
  confidence: "HIGH",
  expanded: false,
  onToggle: jest.fn(),
  subFeatures: MOCK_SUB_FEATURES,
};

const renderCard = (overrides: Partial<PillarRadialCardProps> = {}) =>
  render(<PillarRadialCard {...DEFAULT_PROPS} {...overrides} />);

// ─── Tests ──────────────────────────────────────────────────────

describe("PillarRadialCard", () => {
  // ─── Basic rendering ────────────────────────────────────────

  it("renders card with pillar code and name", () => {
    renderCard();

    const card = screen.getByTestId("pillar-card-P1");
    expect(card).toBeInTheDocument();
    expect(card).toHaveTextContent("P1");
    expect(card).toHaveTextContent("Personal");
  });

  it("shows weight percentage", () => {
    renderCard();

    const card = screen.getByTestId("pillar-card-P1");
    expect(card).toHaveTextContent("Weight in TRUST");
    expect(card).toHaveTextContent("15%");
  });

  it("shows score / 100", () => {
    renderCard();

    const card = screen.getByTestId("pillar-card-P1");
    expect(card).toHaveTextContent("75 / 100");
  });

  // ─── Radial ring ────────────────────────────────────────────

  it("renders radial ring SVG", () => {
    renderCard();

    expect(screen.getByTestId("radial-ring")).toBeInTheDocument();
  });

  // ─── Confidence badge ───────────────────────────────────────

  it("shows HIGH confidence badge", () => {
    renderCard({ confidence: "HIGH" });

    const badge = screen.getByTestId("confidence-badge-P1");
    expect(badge).toHaveTextContent("High");
    expect(badge.className).toContain("bg-brand-primary-100");
  });

  it("shows MEDIUM confidence badge", () => {
    renderCard({ confidence: "MEDIUM" });

    const badge = screen.getByTestId("confidence-badge-P1");
    expect(badge).toHaveTextContent("Medium");
    expect(badge.className).toContain("bg-blue-100");
  });

  it("shows LOW confidence badge", () => {
    renderCard({ confidence: "LOW" });

    const badge = screen.getByTestId("confidence-badge-P1");
    expect(badge).toHaveTextContent("Low");
    expect(badge.className).toContain("bg-brand-accent-amber");
  });

  // ─── Expand / collapse ──────────────────────────────────────

  it("collapsed: detail panel has grid-rows-[0fr]", () => {
    renderCard({ expanded: false });

    const detail = screen.getByTestId("pillar-detail-P1");
    expect(detail.className).toContain("grid-rows-[0fr]");
  });

  it("expanded: detail panel has grid-rows-[1fr]", () => {
    renderCard({ expanded: true });

    const detail = screen.getByTestId("pillar-detail-P1");
    expect(detail.className).toContain("grid-rows-[1fr]");
  });

  it("expanded: BandLadder rows are visible", () => {
    renderCard({ expanded: true });

    expect(screen.getByTestId("ladder-row-Q_101")).toBeInTheDocument();
    expect(screen.getByTestId("ladder-row-Q_102")).toBeInTheDocument();
  });

  it("toggle button fires onToggle", () => {
    const onToggle = jest.fn();
    renderCard({ onToggle });

    fireEvent.click(screen.getByTestId("pillar-toggle-P1"));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  // ─── aria-expanded ──────────────────────────────────────────

  it("aria-expanded=false when collapsed", () => {
    renderCard({ expanded: false });

    const toggle = screen.getByTestId("pillar-toggle-P1");
    expect(toggle).toHaveAttribute("aria-expanded", "false");
  });

  it("aria-expanded=true when expanded", () => {
    renderCard({ expanded: true });

    const toggle = screen.getByTestId("pillar-toggle-P1");
    expect(toggle).toHaveAttribute("aria-expanded", "true");
  });

  it("aria-controls points to detail panel id", () => {
    renderCard();

    const toggle = screen.getByTestId("pillar-toggle-P1");
    expect(toggle).toHaveAttribute("aria-controls", "pillar-detail-P1");
  });

  // ─── Focus ref ──────────────────────────────────────────────

  it("focus ref is populated with toggle button element", () => {
    const focusRef = { current: null as HTMLButtonElement | null };
    renderCard({ focusRef });

    expect(focusRef.current).toBeInstanceOf(HTMLButtonElement);
  });

  // ─── Chevron rotation ───────────────────────────────────────

  it("chevron has rotate-180 when expanded", () => {
    renderCard({ expanded: true });

    const chevron = screen.getByTestId("chevron-icon");
    expect(chevron.className).toContain("rotate-180");
  });

  it("chevron does not have rotate-180 when collapsed", () => {
    renderCard({ expanded: false });

    const chevron = screen.getByTestId("chevron-icon");
    expect(chevron.className).not.toContain("rotate-180");
  });

  // ─── Different pillar codes ─────────────────────────────────

  it("renders P3 card with correct testid", () => {
    renderCard({ code: "P3", name: "Financial" });

    expect(screen.getByTestId("pillar-card-P3")).toBeInTheDocument();
    expect(screen.getByTestId("pillar-toggle-P3")).toBeInTheDocument();
  });
});
