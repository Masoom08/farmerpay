/**
 * AdverseCibilBanner — Unit Tests (C4)
 *
 * Tests:
 *   1. Renders when cibilFlag=true (via context)
 *   2. Does not render when cibilFlag=false
 *   3. Shows formatted overdue amount in INR
 *   4. Shows issuer name
 *   5. role="alert" for screen reader announcement
 *   6. Handles null overdueInr and null issuer gracefully
 */

import React from "react";
import { render, screen } from "@testing-library/react";
import { AdverseCibilBanner } from "@/components/trust/AdverseCibilBanner";
import { CibilFlagProvider } from "@/components/trust/context/CibilFlagContext";

// ─── Mock lucide-react ──────────────────────────────────────────

jest.mock("lucide-react", () => ({
  AlertTriangle: (props: Record<string, unknown>) => (
    <span data-testid="icon-alert" {...props} />
  ),
}));

// ─── Helpers ────────────────────────────────────────────────────

const renderBanner = ({
  cibilFlag = true,
  overdueInr = 15000 as number | null,
  issuer = "SBI" as string | null,
} = {}) =>
  render(
    <CibilFlagProvider
      cibilFlag={cibilFlag}
      overdueInr={overdueInr}
      issuer={issuer}
    >
      <AdverseCibilBanner />
    </CibilFlagProvider>,
  );

// ─── Tests ──────────────────────────────────────────────────────

describe("AdverseCibilBanner", () => {
  // ─── Visibility ─────────────────────────────────────────────

  it("renders when cibilFlag is true", () => {
    renderBanner({ cibilFlag: true });

    expect(screen.getByTestId("adverse-cibil-banner")).toBeInTheDocument();
  });

  it("does not render when cibilFlag is false", () => {
    renderBanner({ cibilFlag: false });

    expect(screen.queryByTestId("adverse-cibil-banner")).not.toBeInTheDocument();
  });

  // ─── Content ────────────────────────────────────────────────

  it("shows overdue amount formatted in INR with Indian grouping", () => {
    renderBanner({ overdueInr: 350000 });

    const banner = screen.getByTestId("adverse-cibil-banner");
    expect(banner).toHaveTextContent(/₹3,50,000/);
  });

  it("shows small overdue amount formatted correctly", () => {
    renderBanner({ overdueInr: 15000 });

    const banner = screen.getByTestId("adverse-cibil-banner");
    expect(banner).toHaveTextContent(/₹15,000/);
  });

  it("shows issuer name", () => {
    renderBanner({ issuer: "SBI" });

    const banner = screen.getByTestId("adverse-cibil-banner");
    expect(banner).toHaveTextContent("overdue on SBI");
  });

  it('shows "Review before approving." text', () => {
    renderBanner();

    const banner = screen.getByTestId("adverse-cibil-banner");
    expect(banner).toHaveTextContent("Review before approving.");
  });

  it('shows full copy per spec §1.4', () => {
    renderBanner({ overdueInr: 15000, issuer: "SBI" });

    const banner = screen.getByTestId("adverse-cibil-banner");
    expect(banner).toHaveTextContent(
      /CIBIL flag:.*₹15,000.*overdue on SBI.*Review before approving/,
    );
  });

  // ─── Graceful handling of null values ───────────────────────

  it('shows "—" when overdueInr is null', () => {
    renderBanner({ overdueInr: null });

    const banner = screen.getByTestId("adverse-cibil-banner");
    expect(banner).toHaveTextContent("CIBIL flag: —");
  });

  it('shows "unknown issuer" when issuer is null', () => {
    renderBanner({ issuer: null });

    const banner = screen.getByTestId("adverse-cibil-banner");
    expect(banner).toHaveTextContent("overdue on unknown issuer");
  });

  // ─── Accessibility ──────────────────────────────────────────

  it('has role="alert" for immediate screen reader announcement', () => {
    renderBanner();

    const banner = screen.getByTestId("adverse-cibil-banner");
    expect(banner).toHaveAttribute("role", "alert");
  });

  it("is also queryable via role", () => {
    renderBanner();

    expect(screen.getByRole("alert")).toBeInTheDocument();
  });

  // ─── Styling ────────────────────────────────────────────────

  it("uses reject token colours", () => {
    renderBanner();

    const banner = screen.getByTestId("adverse-cibil-banner");
    expect(banner.className).toContain("bg-decision-reject");
    expect(banner.className).toContain("border-decision-reject");
  });
});
