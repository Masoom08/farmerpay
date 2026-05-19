/**
 * FarmerHeaderCard — Unit Tests (C2)
 *
 * Tests:
 *   1. Renders all three badge types (AA, CIBIL, Sathi visit)
 *   2. Currency formatted with Indian grouping
 *   3. Handles missing optional fields gracefully
 *   4. a11y: role="region" + aria-label="Farmer header"
 *   5. Name truncation above 32 chars
 *   6. Date formatting as "DD MMM"
 *   7. Badge variant colours for each status
 */

import React from "react";
import { render, screen } from "@testing-library/react";
import {
  FarmerHeaderCard,
  type FarmerHeaderCardProps,
} from "@/components/trust/FarmerHeaderCard";

// ─── Default Props ──────────────────────────────────────────────

const DEFAULT_PROPS: FarmerHeaderCardProps = {
  name: "Ramesh Kulkarni",
  village: "Banganga",
  district: "Pune",
  kccId: "KCC-2026-00481",
  aaStatus: "CONNECTED",
  aaLastSync: "2026-04-14T10:00:00Z",
  cibilStatus: "PULLED",
  cibilPulledAt: "2026-04-11T10:00:00Z",
  lastSathiVisit: "2026-04-09T10:00:00Z",
  loanAmountInr: 350000,
  loanPurpose: "Kharif inputs",
};

const renderCard = (overrides: Partial<FarmerHeaderCardProps> = {}) =>
  render(<FarmerHeaderCard {...DEFAULT_PROPS} {...overrides} />);

// ─── Tests ──────────────────────────────────────────────────────

describe("FarmerHeaderCard", () => {
  // ─── a11y ───────────────────────────────────────────────────

  it('has role="region" with aria-label="Farmer header"', () => {
    renderCard();

    const card = screen.getByRole("region", { name: "Farmer header" });
    expect(card).toBeInTheDocument();
  });

  // ─── Row 1: Name, location, KCC ────────────────────────────

  it("renders farmer name, village, district, and KCC ID", () => {
    renderCard();

    expect(screen.getByTestId("farmer-name")).toHaveTextContent(
      "Ramesh Kulkarni"
    );
    expect(screen.getByTestId("kcc-id")).toHaveTextContent("KCC-2026-00481");
    // Village and district are in the same row
    const card = screen.getByTestId("farmer-header-card");
    expect(card).toHaveTextContent("Banganga, Pune");
  });

  it("truncates names longer than 32 characters with ellipsis", () => {
    renderCard({
      name: "Raghunathaprasadaramachandra Kulkarni Deshmukh",
    });

    const nameEl = screen.getByTestId("farmer-name");
    // Should be exactly 32 chars + ellipsis character
    expect(nameEl.textContent!.length).toBe(33); // 32 chars + 1 ellipsis
    expect(nameEl.textContent).toContain("\u2026");
  });

  it("does not truncate names of 32 characters or fewer", () => {
    renderCard({ name: "Ramesh Kulkarni" }); // 15 chars

    const nameEl = screen.getByTestId("farmer-name");
    expect(nameEl.textContent).toBe("Ramesh Kulkarni");
    expect(nameEl.textContent).not.toContain("\u2026");
  });

  // ─── Row 2: Status badges ──────────────────────────────────

  it("renders AA badge with CONNECTED status and date", () => {
    renderCard();

    const aaBadge = screen.getByTestId("badge-aa");
    expect(aaBadge).toHaveTextContent("AA: Connected");
    expect(aaBadge).toHaveTextContent("14 Apr");
  });

  it("renders AA badge with PENDING status", () => {
    renderCard({ aaStatus: "PENDING", aaLastSync: undefined });

    const aaBadge = screen.getByTestId("badge-aa");
    expect(aaBadge).toHaveTextContent("AA: Pending");
  });

  it("renders AA badge with NONE status", () => {
    renderCard({ aaStatus: "NONE", aaLastSync: undefined });

    const aaBadge = screen.getByTestId("badge-aa");
    expect(aaBadge).toHaveTextContent("AA: Not linked");
  });

  it("renders CIBIL badge with PULLED status and date", () => {
    renderCard();

    const cibilBadge = screen.getByTestId("badge-cibil");
    expect(cibilBadge).toHaveTextContent("CIBIL: Pulled");
    expect(cibilBadge).toHaveTextContent("11 Apr");
  });

  it("renders CIBIL badge with STALE status", () => {
    renderCard({ cibilStatus: "STALE", cibilPulledAt: undefined });

    const cibilBadge = screen.getByTestId("badge-cibil");
    expect(cibilBadge).toHaveTextContent("CIBIL: Stale");
  });

  it("renders CIBIL badge with NONE status", () => {
    renderCard({ cibilStatus: "NONE", cibilPulledAt: undefined });

    const cibilBadge = screen.getByTestId("badge-cibil");
    expect(cibilBadge).toHaveTextContent("CIBIL: Not pulled");
  });

  it("renders last Sathi visit date when provided", () => {
    renderCard();

    const sathiVisit = screen.getByTestId("sathi-visit");
    expect(sathiVisit).toHaveTextContent("Last Sathi visit: 9 Apr");
  });

  it("omits Sathi visit when not provided", () => {
    renderCard({ lastSathiVisit: undefined });

    expect(screen.queryByTestId("sathi-visit")).not.toBeInTheDocument();
  });

  // ─── Row 3: Loan info with INR formatting ─────────────────

  it("renders loan amount with Indian grouping (₹3,50,000)", () => {
    renderCard();

    const loanInfo = screen.getByTestId("loan-info");
    // Intl.NumberFormat('en-IN') with currency: 'INR' produces ₹3,50,000
    expect(loanInfo).toHaveTextContent(/₹3,50,000/);
  });

  it("renders loan purpose", () => {
    renderCard();

    const loanInfo = screen.getByTestId("loan-info");
    expect(loanInfo).toHaveTextContent("Purpose: Kharif inputs");
  });

  it("formats small loan amounts correctly", () => {
    renderCard({ loanAmountInr: 50000 });

    const loanInfo = screen.getByTestId("loan-info");
    expect(loanInfo).toHaveTextContent(/₹50,000/);
  });

  it("formats large loan amounts with lakh/crore grouping", () => {
    renderCard({ loanAmountInr: 12345678 });

    const loanInfo = screen.getByTestId("loan-info");
    // 1,23,45,678 in Indian grouping
    expect(loanInfo).toHaveTextContent(/₹1,23,45,678/);
  });

  // ─── Missing optional fields ──────────────────────────────

  it("handles all optional fields being missing", () => {
    renderCard({
      aaLastSync: undefined,
      cibilPulledAt: undefined,
      lastSathiVisit: undefined,
    });

    // Should render without crashing
    expect(screen.getByTestId("farmer-header-card")).toBeInTheDocument();
    // AA badge without date
    const aaBadge = screen.getByTestId("badge-aa");
    expect(aaBadge).toHaveTextContent("AA: Connected");
    // No sathi visit line
    expect(screen.queryByTestId("sathi-visit")).not.toBeInTheDocument();
  });

  // ─── Badge colour classes ─────────────────────────────────

  it("applies success colour to AA CONNECTED badge", () => {
    renderCard({ aaStatus: "CONNECTED" });

    const badge = screen.getByTestId("badge-aa");
    expect(badge.className).toContain("bg-brand-primary-100");
    expect(badge.className).toContain("text-brand-primary-700");
  });

  it("applies warning colour to AA NONE badge", () => {
    renderCard({ aaStatus: "NONE" });

    const badge = screen.getByTestId("badge-aa");
    expect(badge.className).toContain("bg-brand-accent-amber");
  });

  it("applies success colour to CIBIL PULLED badge", () => {
    renderCard({ cibilStatus: "PULLED" });

    const badge = screen.getByTestId("badge-cibil");
    expect(badge.className).toContain("bg-brand-primary-100");
  });

  it("applies warning colour to CIBIL STALE badge", () => {
    renderCard({ cibilStatus: "STALE" });

    const badge = screen.getByTestId("badge-cibil");
    expect(badge.className).toContain("bg-brand-accent-amber");
  });

  it("applies info colour to CIBIL NONE badge", () => {
    renderCard({ cibilStatus: "NONE" });

    const badge = screen.getByTestId("badge-cibil");
    expect(badge.className).toContain("bg-blue-100");
  });
});
