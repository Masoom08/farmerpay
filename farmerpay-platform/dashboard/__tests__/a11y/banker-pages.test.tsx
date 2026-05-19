/**
 * Banker dashboard — Accessibility audit (H4 — Spec §7)
 *
 * Uses jest-axe to run axe-core on rendered components.
 * Zero tolerance for serious/critical violations.
 *
 * Tests:
 *   1.  NotificationBell has no serious a11y violations
 *   2.  EmptyState has no serious a11y violations
 *   3.  DecisionBadge has no serious a11y violations
 *   4.  EvidenceRow has no serious a11y violations
 *   5.  BandLadder has no serious a11y violations
 *   6.  FarmerHeaderCard has no serious a11y violations
 *   7.  Button primitives have no serious a11y violations
 *   8.  Badge primitives have no serious a11y violations
 *   9.  Skeleton has no serious a11y violations
 *  10.  Interactive elements have accessible names
 */

import React from "react";
import { render } from "@testing-library/react";
import { axe, toHaveNoViolations } from "jest-axe";

// Register jest-axe matcher
expect.extend(toHaveNoViolations);

// ─── Imports ──────────────────────────────────────────────

import NotificationBell from "@/components/NotificationBell";
import { EmptyState } from "@/components/primitives/EmptyState";
import { default as DecisionBadge } from "@/components/trust/DecisionBadge";
import { default as EvidenceRow } from "@/components/trust/EvidenceRow";
import { default as BandLadder } from "@/components/trust/BandLadder";
import { FarmerHeaderCard } from "@/components/trust/FarmerHeaderCard";
import { Button, Badge } from "@/components/primitives";
import { Skeleton } from "@/components/primitives/Skeleton";

// ─── Test data ────────────────────────────────────────────

const SAMPLE_NOTIFICATION = {
  id: "n1",
  subject: "Trust score alert",
  body: "Ramesh dropped below 500",
  type: "alert" as const,
  readAt: null,
  createdAt: "2024-06-15T10:00:00Z",
};

const SAMPLE_EVIDENCE = {
  evidenceUuid: "ev-1",
  pillarCode: "REPAYMENT",
  featureName: "EMI regularity",
  band: 4 as const,
  source: "AA" as const,
  fetchedAt: "2024-06-10T10:00:00Z",
  rawRef: "aa:txn:123",
};

const SAMPLE_SUB_FEATURES = [
  {
    featureCode: "f1",
    featureName: "Savings ratio",
    band: 3 as const,
    bandLabel: "Moderate",
    source: "AA" as const,
  },
  {
    featureCode: "f2",
    featureName: "Debt-to-income",
    band: 4 as const,
    bandLabel: "Good",
    source: "CIBIL" as const,
  },
];

const noop = () => {};

// ─── Axe config (disable rules that don't apply in jsdom) ──

const AXE_OPTIONS = {
  rules: {
    region: { enabled: false },
    "page-has-heading-one": { enabled: false },
    "landmark-one-main": { enabled: false },
    "color-contrast": { enabled: false },
  },
};

// ─── Tests ────────────────────────────────────────────────

describe("Banker a11y audit", () => {
  it("NotificationBell has no serious a11y violations", async () => {
    const { container } = render(
      <NotificationBell
        notifications={[SAMPLE_NOTIFICATION]}
        onNotificationClick={noop}
        onMarkAllRead={noop}
      />,
    );
    const results = await axe(container, AXE_OPTIONS);
    expect(results).toHaveNoViolations();
  });

  it("EmptyState has no serious a11y violations", async () => {
    const { container } = render(
      <EmptyState title="No farmers found" description="Try adjusting your filters." />,
    );
    const results = await axe(container, AXE_OPTIONS);
    expect(results).toHaveNoViolations();
  });

  it("DecisionBadge has no serious a11y violations", async () => {
    const { container } = render(
      <DecisionBadge decision="SANCTION" score={720} />,
    );
    const results = await axe(container, AXE_OPTIONS);
    expect(results).toHaveNoViolations();
  });

  it("EvidenceRow has no serious a11y violations", async () => {
    const { container } = render(
      <div role="list">
        <EvidenceRow evidence={SAMPLE_EVIDENCE} onViewRaw={noop} />
      </div>,
    );
    const results = await axe(container, AXE_OPTIONS);
    expect(results).toHaveNoViolations();
  });

  it("BandLadder has no serious a11y violations", async () => {
    const { container } = render(
      <BandLadder subFeatures={SAMPLE_SUB_FEATURES} />,
    );
    const results = await axe(container, AXE_OPTIONS);
    expect(results).toHaveNoViolations();
  });

  it("FarmerHeaderCard has no serious a11y violations", async () => {
    const { container } = render(
      <FarmerHeaderCard
        name="Ramesh Patel"
        village="Kheda"
        district="Anand"
        kccId="KCC-001234"
        aaStatus="CONNECTED"
        aaLastSync="2024-06-10T10:00:00Z"
        cibilStatus="PULLED"
        cibilPulledAt="2024-06-08T10:00:00Z"
        lastSathiVisit="2024-06-12T10:00:00Z"
        loanAmountInr={350000}
        loanPurpose="Kharif crop loan"
      />,
    );
    const results = await axe(container, AXE_OPTIONS);
    expect(results).toHaveNoViolations();
  });

  it("Button primitives have no serious a11y violations", async () => {
    const { container } = render(
      <div>
        <Button variant="primary">Approve</Button>
        <Button variant="secondary">Cancel</Button>
        <Button variant="destructive">Reject</Button>
        <Button variant="ghost">More</Button>
      </div>,
    );
    const results = await axe(container, AXE_OPTIONS);
    expect(results).toHaveNoViolations();
  });

  it("Badge primitives have no serious a11y violations", async () => {
    // Variants below exercise the semantic decision + score-band
    // surfaces supported by the primitives Badge. The old
    // success/warning/destructive names were from the shadcn Badge
    // at @/components/ui/badge; the primitives Badge uses
    // sanction/reconsider/reject + band-* instead.
    const { container } = render(
      <div>
        <Badge>Default</Badge>
        <Badge variant="sanction">Sanctioned</Badge>
        <Badge variant="reconsider">Needs Review</Badge>
        <Badge variant="reject">Rejected</Badge>
        <Badge variant="band-excellent">Excellent</Badge>
      </div>,
    );
    const results = await axe(container, AXE_OPTIONS);
    expect(results).toHaveNoViolations();
  });

  it("Skeleton has no serious a11y violations", async () => {
    const { container } = render(
      <div>
        <Skeleton.Score />
        <Skeleton.Row />
      </div>,
    );
    const results = await axe(container, AXE_OPTIONS);
    expect(results).toHaveNoViolations();
  });

  it("interactive elements have accessible names", () => {
    const { container } = render(
      <div>
        <NotificationBell notifications={[]} />
        <Button>Submit</Button>
      </div>,
    );

    // All buttons must have accessible names
    const buttons = container.querySelectorAll("button");
    buttons.forEach((btn) => {
      const hasText = (btn.textContent || "").trim().length > 0;
      const hasAriaLabel = !!btn.getAttribute("aria-label");
      const hasAriaLabelledBy = !!btn.getAttribute("aria-labelledby");
      expect(hasText || hasAriaLabel || hasAriaLabelledBy).toBe(true);
    });
  });
});
