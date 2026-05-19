/**
 * Sathi dashboard — Accessibility audit (H4 — Spec §7)
 *
 * Uses jest-axe to run axe-core on rendered components.
 * Zero tolerance for serious/critical violations.
 *
 * Tests:
 *   1.  QueueHeader has no serious a11y violations
 *   2.  QueueFilters has no serious a11y violations
 *   3.  QueueList has no serious a11y violations
 *   4.  SathiTaskCard has no serious a11y violations
 *   5.  RoutePlannerStrip has no serious a11y violations
 *   6.  TaskDetailHeader has no serious a11y violations
 *   7.  ChecklistField (text) has no serious a11y violations
 *   8.  ChecklistField (boolean) has no serious a11y violations
 *   9.  TaskFooter has no serious a11y violations
 *  10.  NotificationBell has no serious a11y violations
 *  11.  EmptyState has no serious a11y violations
 *  12.  No score-adjacent ARIA labels on any Sathi component
 */

import React from "react";
import { render } from "@testing-library/react";
import { axe, toHaveNoViolations } from "jest-axe";

// Register jest-axe matcher
expect.extend(toHaveNoViolations);

// ─── Imports ──────────────────────────────────────────────

import QueueHeader from "../../src/components/QueueHeader";
import QueueFilters from "../../src/components/QueueFilters";
import QueueList, { type SathiTask } from "../../src/components/QueueList";
import SathiTaskCard from "../../src/components/SathiTaskCard";
import RoutePlannerStrip from "../../src/components/RoutePlannerStrip";
import TaskDetailHeader from "../../src/components/TaskDetailHeader";
import ChecklistField from "../../src/components/ChecklistField";
import TaskFooter from "../../src/components/TaskFooter";
import NotificationBell from "../../src/components/NotificationBell";
import EmptyState from "../../src/components/empty/EmptyState";

// ─── Test data ────────────────────────────────────────────

const TASKS: SathiTask[] = [
  { id: "t1", farmerId: 1, farmerName: "Ramesh", village: "Kheda", taskType: "AA Consent", status: "pending", createdAt: "2024-01-01" },
  { id: "t2", farmerId: 2, farmerName: "Anita", village: "Mandvi", taskType: "PMFBY", status: "completed", createdAt: "2024-01-01" },
];

const noop = () => {};

// ─── Axe config (disable rules that don't apply in jsdom) ──

const AXE_OPTIONS = {
  rules: {
    // jsdom doesn't render full pages
    region: { enabled: false },
    "page-has-heading-one": { enabled: false },
    "landmark-one-main": { enabled: false },
    // No real colour rendering in jsdom
    "color-contrast": { enabled: false },
  },
};

// ─── Tests ────────────────────────────────────────────────

describe("Sathi a11y audit", () => {
  it("QueueHeader has no serious a11y violations", async () => {
    const { container } = render(<QueueHeader taskCount={5} villageCount={2} />);
    const results = await axe(container, AXE_OPTIONS);
    expect(results).toHaveNoViolations();
  });

  it("QueueFilters has no serious a11y violations", async () => {
    const { container } = render(
      <QueueFilters
        statusFilter="all"
        villageFilter="all"
        villages={["Kheda"]}
        onStatusChange={noop}
        onVillageChange={noop}
      />,
    );
    const results = await axe(container, AXE_OPTIONS);
    expect(results).toHaveNoViolations();
  });

  it("QueueList has no serious a11y violations", async () => {
    const { container } = render(<QueueList tasks={TASKS} />);
    const results = await axe(container, AXE_OPTIONS);
    expect(results).toHaveNoViolations();
  });

  it("SathiTaskCard has no serious a11y violations", async () => {
    const { container } = render(
      <SathiTaskCard
        id="t1"
        farmerName="Ramesh"
        village="Kheda"
        dueDate="2024-06-15"
        reason="HOUSEHOLD_REFRESH"
        status="pending"
      />,
    );
    const results = await axe(container, AXE_OPTIONS);
    expect(results).toHaveNoViolations();
  });

  it("RoutePlannerStrip has no serious a11y violations", async () => {
    const { container } = render(
      <RoutePlannerStrip stops={[{ village: "Kheda", pendingCount: 3 }]} />,
    );
    const results = await axe(container, AXE_OPTIONS);
    expect(results).toHaveNoViolations();
  });

  it("TaskDetailHeader has no serious a11y violations", async () => {
    const { container } = render(
      <TaskDetailHeader
        farmerName="Ramesh"
        village="Kheda"
        dueDate="2024-06-15"
        currentStep={1}
        totalSteps={5}
      />,
    );
    const results = await axe(container, AXE_OPTIONS);
    expect(results).toHaveNoViolations();
  });

  it("ChecklistField (text) has no serious a11y violations", async () => {
    const { container } = render(
      <ChecklistField
        field={{ id: "f1", label: "Crop name", type: "text" }}
        value={{ value: null }}
        onChange={noop}
      />,
    );
    const results = await axe(container, AXE_OPTIONS);
    expect(results).toHaveNoViolations();
  });

  it("ChecklistField (boolean) has no serious a11y violations", async () => {
    const { container } = render(
      <ChecklistField
        field={{ id: "f2", label: "Has insurance?", type: "boolean" }}
        value={{ value: null }}
        onChange={noop}
      />,
    );
    const results = await axe(container, AXE_OPTIONS);
    expect(results).toHaveNoViolations();
  });

  it("TaskFooter has no serious a11y violations", async () => {
    const { container } = render(
      <TaskFooter
        currentStep={1}
        totalSteps={5}
        onPrevious={noop}
        onNext={noop}
        onSubmit={noop}
      />,
    );
    const results = await axe(container, AXE_OPTIONS);
    expect(results).toHaveNoViolations();
  });

  it("NotificationBell has no serious a11y violations", async () => {
    const { container } = render(<NotificationBell />);
    const results = await axe(container, AXE_OPTIONS);
    expect(results).toHaveNoViolations();
  });

  it("EmptyState has no serious a11y violations", async () => {
    const { container } = render(<EmptyState variant="NO_TASKS" />);
    const results = await axe(container, AXE_OPTIONS);
    expect(results).toHaveNoViolations();
  });

  it("no score-adjacent ARIA labels on any Sathi component", () => {
    const components = [
      <QueueHeader taskCount={3} villageCount={1} />,
      <QueueList tasks={TASKS} />,
      <SathiTaskCard id="t1" farmerName="R" village="K" dueDate="2024-01-01" reason="HOUSEHOLD_REFRESH" status="pending" />,
      <RoutePlannerStrip stops={[{ village: "K", pendingCount: 1 }]} />,
      <EmptyState variant="NO_TASKS" />,
      <NotificationBell />,
    ];

    for (const comp of components) {
      const { container } = render(comp);
      // Check all aria-label attributes
      const ariaEls = container.querySelectorAll("[aria-label]");
      ariaEls.forEach((el) => {
        const label = (el.getAttribute("aria-label") || "").toLowerCase();
        expect(label).not.toContain("score");
        expect(label).not.toContain("trust score");
        expect(label).not.toContain("point lift");
      });
    }
  });
});
