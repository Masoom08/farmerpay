/**
 * EvidenceList + EvidenceRow — Unit Tests (C9)
 *
 * Tests:
 *   1. Renders all evidence rows
 *   2. Groups evidence by pillar with headings
 *   3. Filter by source hides non-matching rows
 *   4. Multiple filters combine (union)
 *   5. Empty filter shows all rows
 *   6. Empty state when no rows match filter
 *   7. "view raw" fires onViewRaw with correct uuid
 *   8. Source filter chips rendered for available sources only
 *   9. Toggling filter chip calls onFilterChange
 *  10. Pillar headings use labels (P1 · Personal)
 *  11. EvidenceRow shows feature name, band, source, date
 *  12. EvidenceRow source chip has correct colour class
 *  13. Grouping collapses empty pillars (no heading rendered)
 *  14. aria-pressed reflects active filter state
 *  15. role="list" on evidence container
 */

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import {
  EvidenceList,
  type EvidenceListProps,
} from "@/components/trust/EvidenceList";
import type { Evidence, EvidenceSource } from "@/components/trust/EvidenceRow";

// ─── Test Data ──────────────────────────────────────────────────

const MOCK_EVIDENCE: Evidence[] = [
  {
    evidenceUuid: "ev-1",
    pillarCode: "P1",
    featureName: "Age group",
    band: 4,
    source: "AA",
    fetchedAt: "2025-12-01T10:00:00Z",
    rawRef: "ref-1",
  },
  {
    evidenceUuid: "ev-2",
    pillarCode: "P1",
    featureName: "Household size",
    band: 3,
    source: "CIBIL",
    fetchedAt: "2025-12-02T10:00:00Z",
    rawRef: "ref-2",
  },
  {
    evidenceUuid: "ev-3",
    pillarCode: "P3",
    featureName: "Loan repayment history",
    band: 5,
    source: "ROOTS",
    fetchedAt: "2025-12-03T10:00:00Z",
    rawRef: "ref-3",
  },
  {
    evidenceUuid: "ev-4",
    pillarCode: "P3",
    featureName: "Monthly income",
    band: 2,
    source: "AA",
    fetchedAt: "2025-12-04T10:00:00Z",
    rawRef: "ref-4",
  },
  {
    evidenceUuid: "ev-5",
    pillarCode: "P5",
    featureName: "Collateral value",
    band: 1,
    source: "FARMER_DECLARED",
    fetchedAt: "2025-12-05T10:00:00Z",
    rawRef: "ref-5",
  },
];

const DEFAULT_PROPS: EvidenceListProps = {
  evidence: MOCK_EVIDENCE,
  filter: [],
  onFilterChange: jest.fn(),
  onViewRaw: jest.fn(),
};

const renderList = (overrides: Partial<EvidenceListProps> = {}) =>
  render(<EvidenceList {...DEFAULT_PROPS} {...overrides} />);

// ─── Tests ──────────────────────────────────────────────────────

describe("EvidenceList", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ─── Basic rendering ────────────────────────────────────────

  it("renders all evidence rows when no filter is active", () => {
    renderList();

    expect(screen.getByTestId("evidence-row-ev-1")).toBeInTheDocument();
    expect(screen.getByTestId("evidence-row-ev-2")).toBeInTheDocument();
    expect(screen.getByTestId("evidence-row-ev-3")).toBeInTheDocument();
    expect(screen.getByTestId("evidence-row-ev-4")).toBeInTheDocument();
    expect(screen.getByTestId("evidence-row-ev-5")).toBeInTheDocument();
  });

  it("renders evidence-list container", () => {
    renderList();

    expect(screen.getByTestId("evidence-list")).toBeInTheDocument();
  });

  // ─── Grouping by pillar ─────────────────────────────────────

  it("groups evidence by pillar with headings", () => {
    renderList();

    expect(screen.getByTestId("evidence-group-P1")).toBeInTheDocument();
    expect(screen.getByTestId("evidence-group-P3")).toBeInTheDocument();
    expect(screen.getByTestId("evidence-group-P5")).toBeInTheDocument();
  });

  it("pillar headings use labels (P1 · Personal)", () => {
    renderList();

    const p1Group = screen.getByTestId("evidence-group-P1");
    expect(p1Group).toHaveTextContent("P1 · Personal");

    const p3Group = screen.getByTestId("evidence-group-P3");
    expect(p3Group).toHaveTextContent("P3 · Financial");
  });

  it("grouping collapses empty pillars — no heading for P2 when no P2 evidence", () => {
    renderList();

    expect(screen.queryByTestId("evidence-group-P2")).not.toBeInTheDocument();
  });

  // ─── Source filter chips ────────────────────────────────────

  it("renders source filter chips only for available sources", () => {
    renderList();

    const filters = screen.getByTestId("source-filters");
    expect(filters).toBeInTheDocument();

    // Available: AA, CIBIL, ROOTS, FARMER_DECLARED (from mock data)
    expect(screen.getByTestId("filter-chip-AA")).toBeInTheDocument();
    expect(screen.getByTestId("filter-chip-CIBIL")).toBeInTheDocument();
    expect(screen.getByTestId("filter-chip-ROOTS")).toBeInTheDocument();
    expect(screen.getByTestId("filter-chip-FARMER_DECLARED")).toBeInTheDocument();

    // Not available: POP, SATHI, PMFBY
    expect(screen.queryByTestId("filter-chip-POP")).not.toBeInTheDocument();
    expect(screen.queryByTestId("filter-chip-SATHI")).not.toBeInTheDocument();
    expect(screen.queryByTestId("filter-chip-PMFBY")).not.toBeInTheDocument();
  });

  it("toggling filter chip calls onFilterChange", () => {
    const onFilterChange = jest.fn();
    renderList({ onFilterChange });

    fireEvent.click(screen.getByTestId("filter-chip-AA"));
    expect(onFilterChange).toHaveBeenCalledTimes(1);
    expect(onFilterChange).toHaveBeenCalledWith(["AA"]);
  });

  it("toggling active filter chip removes it from filter", () => {
    const onFilterChange = jest.fn();
    renderList({ filter: ["AA", "CIBIL"] as EvidenceSource[], onFilterChange });

    fireEvent.click(screen.getByTestId("filter-chip-AA"));
    expect(onFilterChange).toHaveBeenCalledWith(["CIBIL"]);
  });

  it("aria-pressed reflects active filter state", () => {
    renderList({ filter: ["AA"] as EvidenceSource[] });

    const aaChip = screen.getByTestId("filter-chip-AA");
    expect(aaChip).toHaveAttribute("aria-pressed", "true");

    const cibilChip = screen.getByTestId("filter-chip-CIBIL");
    expect(cibilChip).toHaveAttribute("aria-pressed", "false");
  });

  // ─── Filtering ──────────────────────────────────────────────

  it("filter by source hides non-matching rows", () => {
    renderList({ filter: ["AA"] as EvidenceSource[] });

    // AA rows visible
    expect(screen.getByTestId("evidence-row-ev-1")).toBeInTheDocument();
    expect(screen.getByTestId("evidence-row-ev-4")).toBeInTheDocument();

    // Non-AA rows hidden
    expect(screen.queryByTestId("evidence-row-ev-2")).not.toBeInTheDocument();
    expect(screen.queryByTestId("evidence-row-ev-3")).not.toBeInTheDocument();
    expect(screen.queryByTestId("evidence-row-ev-5")).not.toBeInTheDocument();
  });

  it("multiple filters combine as union", () => {
    renderList({ filter: ["AA", "ROOTS"] as EvidenceSource[] });

    // AA + ROOTS rows visible
    expect(screen.getByTestId("evidence-row-ev-1")).toBeInTheDocument();
    expect(screen.getByTestId("evidence-row-ev-3")).toBeInTheDocument();
    expect(screen.getByTestId("evidence-row-ev-4")).toBeInTheDocument();

    // CIBIL and FARMER_DECLARED hidden
    expect(screen.queryByTestId("evidence-row-ev-2")).not.toBeInTheDocument();
    expect(screen.queryByTestId("evidence-row-ev-5")).not.toBeInTheDocument();
  });

  it("filter hides pillar groups with no matching rows", () => {
    renderList({ filter: ["FARMER_DECLARED"] as EvidenceSource[] });

    // Only P5 has FARMER_DECLARED evidence
    expect(screen.getByTestId("evidence-group-P5")).toBeInTheDocument();

    // P1 and P3 groups should not render
    expect(screen.queryByTestId("evidence-group-P1")).not.toBeInTheDocument();
    expect(screen.queryByTestId("evidence-group-P3")).not.toBeInTheDocument();
  });

  it("empty state when no rows match filter", () => {
    renderList({ filter: ["PMFBY"] as EvidenceSource[] });

    expect(screen.getByTestId("evidence-empty")).toBeInTheDocument();
    expect(screen.getByTestId("evidence-empty")).toHaveTextContent(
      "No evidence matches the selected filters.",
    );
  });

  // ─── View raw ───────────────────────────────────────────────

  it("view raw fires onViewRaw with correct uuid", () => {
    const onViewRaw = jest.fn();
    renderList({ onViewRaw });

    fireEvent.click(screen.getByTestId("view-raw-ev-3"));
    expect(onViewRaw).toHaveBeenCalledTimes(1);
    expect(onViewRaw).toHaveBeenCalledWith("ev-3");
  });

  // ─── EvidenceRow details ────────────────────────────────────

  it("EvidenceRow shows feature name, band, source", () => {
    renderList();

    const row = screen.getByTestId("evidence-row-ev-1");
    expect(row).toHaveTextContent("Age group");
    expect(row).toHaveTextContent("Band 4/5");
    expect(row).toHaveTextContent("AA");
  });

  it("EvidenceRow source chip has correct colour class", () => {
    renderList();

    const aaChip = screen.getByTestId("source-chip-ev-1");
    expect(aaChip.className).toContain("bg-brand-primary-100");

    const cibilChip = screen.getByTestId("source-chip-ev-2");
    expect(cibilChip.className).toContain("bg-purple-100");
  });

  // ─── Accessibility ──────────────────────────────────────────

  it('evidence container has role="list"', () => {
    renderList();

    const container = screen.getByRole("list", { name: "Evidence items" });
    expect(container).toBeInTheDocument();
  });

  it('filter group has role="group" with aria-label', () => {
    renderList();

    const group = screen.getByRole("group", { name: "Filter by source" });
    expect(group).toBeInTheDocument();
  });

  it('each evidence row has role="listitem"', () => {
    renderList();

    const row = screen.getByTestId("evidence-row-ev-1");
    expect(row).toHaveAttribute("role", "listitem");
  });
});
