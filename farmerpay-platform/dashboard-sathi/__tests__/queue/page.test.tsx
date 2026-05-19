/**
 * Queue page — Unit Tests (G2 — Spec §5.1 + §5.5)
 *
 * Tests:
 *   COMPONENTS
 *   1.  QueueHeader renders task/village counts
 *   2.  QueueHeader renders empty state copy
 *   3.  QueueFilters renders status and village selects
 *   4.  QueueList renders tasks grouped by village
 *   5.  QueueList groups sorted by task count desc
 *   6.  QueueList renders empty filter state
 *   7.  QueueList shows status badges
 *
 *   PAGE (integration)
 *   8.  Happy path: renders header, filters, route planner, list
 *   9.  Empty state: renders "No tasks" header
 *  10.  Filter by status updates visible tasks
 *  11.  Filter by village updates visible tasks
 *
 *   PRIVACY FIREWALL (§5.5)
 *  12.  No score-adjacent strings in rendered output
 */

import React from "react";
import { render, screen, fireEvent, within } from "@testing-library/react";
import QueueHeader from "../../src/components/QueueHeader";
import QueueFilters, { type StatusFilter } from "../../src/components/QueueFilters";
import QueueList, { groupByVillage, type SathiTask } from "../../src/components/QueueList";

// ─── Mock next/navigation ─────────────────────────────────

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn() }),
  useSearchParams: () => ({
    get: (key: string) => (key === "demo" ? "true" : null),
  }),
}));

// ─── Test data ────────────────────────────────────────────

const TASKS: SathiTask[] = [
  { id: "t1", farmerId: 101, farmerName: "Ramesh Patel", village: "Kheda", taskType: "AA Consent", status: "pending", createdAt: "2024-01-01" },
  { id: "t2", farmerId: 102, farmerName: "Anita Devi", village: "Kheda", taskType: "PMFBY Upload", status: "pending", createdAt: "2024-01-01" },
  { id: "t3", farmerId: 103, farmerName: "Suresh Kumar", village: "Kheda", taskType: "Document Collect", status: "completed", createdAt: "2024-01-01" },
  { id: "t4", farmerId: 104, farmerName: "Lakshmi Bai", village: "Mandvi", taskType: "AA Consent", status: "pending", createdAt: "2024-01-01" },
  { id: "t5", farmerId: 105, farmerName: "Bharat Singh", village: "Mandvi", taskType: "Loan Follow-up", status: "in_progress", createdAt: "2024-01-01" },
  { id: "t6", farmerId: 106, farmerName: "Gita Sharma", village: "Dahod", taskType: "PMFBY Upload", status: "pending", createdAt: "2024-01-01" },
];

// ─── QueueHeader ──────────────────────────────────────────

describe("QueueHeader", () => {
  it("renders task and village counts", () => {
    render(<QueueHeader taskCount={6} villageCount={3} />);
    const header = screen.getByTestId("queue-header");
    expect(header).toHaveTextContent("6 tasks");
    expect(header).toHaveTextContent("3 villages");
    expect(header).toHaveTextContent("Today");
  });

  it("renders empty state copy", () => {
    render(<QueueHeader taskCount={0} villageCount={0} />);
    expect(screen.getByTestId("queue-empty-header")).toHaveTextContent(
      "No tasks for today. Great job!",
    );
  });

  it("renders singular form for 1 task 1 village", () => {
    render(<QueueHeader taskCount={1} villageCount={1} />);
    const summary = screen.getByTestId("queue-header-summary");
    expect(summary).toHaveTextContent("1 task");
    expect(summary).toHaveTextContent("1 village");
    // Should NOT have plural forms
    expect(summary.textContent).not.toMatch(/1 tasks/);
    expect(summary.textContent).not.toMatch(/1 villages/);
  });
});

// ─── QueueFilters ─────────────────────────────────────────

describe("QueueFilters", () => {
  it("renders status and village selects", () => {
    const onStatus = jest.fn();
    const onVillage = jest.fn();
    render(
      <QueueFilters
        statusFilter="all"
        villageFilter="all"
        villages={["Kheda", "Mandvi"]}
        onStatusChange={onStatus}
        onVillageChange={onVillage}
      />,
    );

    expect(screen.getByTestId("filter-status")).toBeTruthy();
    expect(screen.getByTestId("filter-village")).toBeTruthy();
  });

  it("calls onStatusChange when status select changes", () => {
    const onStatus = jest.fn();
    render(
      <QueueFilters
        statusFilter="all"
        villageFilter="all"
        villages={[]}
        onStatusChange={onStatus}
        onVillageChange={jest.fn()}
      />,
    );

    fireEvent.change(screen.getByTestId("filter-status"), {
      target: { value: "pending" },
    });
    expect(onStatus).toHaveBeenCalledWith("pending");
  });

  it("calls onVillageChange when village select changes", () => {
    const onVillage = jest.fn();
    render(
      <QueueFilters
        statusFilter="all"
        villageFilter="all"
        villages={["Kheda", "Mandvi"]}
        onStatusChange={jest.fn()}
        onVillageChange={onVillage}
      />,
    );

    fireEvent.change(screen.getByTestId("filter-village"), {
      target: { value: "Kheda" },
    });
    expect(onVillage).toHaveBeenCalledWith("Kheda");
  });
});

// ─── QueueList ────────────────────────────────────────────

describe("QueueList", () => {
  it("renders tasks grouped by village", () => {
    render(<QueueList tasks={TASKS} />);
    const groups = screen.getAllByTestId("queue-village-group");
    expect(groups.length).toBe(3); // Kheda, Mandvi, Dahod
  });

  it("groups sorted by task count desc", () => {
    render(<QueueList tasks={TASKS} />);
    const villageNames = screen.getAllByTestId("village-name").map(
      (el) => el.textContent,
    );
    // Kheda has 3 tasks, Mandvi has 2, Dahod has 1
    expect(villageNames).toEqual(["Kheda", "Mandvi", "Dahod"]);
  });

  it("renders empty filter state", () => {
    render(<QueueList tasks={[]} />);
    expect(screen.getByTestId("queue-list-empty")).toHaveTextContent(
      "No tasks match the current filters.",
    );
  });

  it("shows status badges on each task", () => {
    render(<QueueList tasks={TASKS} />);
    const statusBadges = screen.getAllByTestId("task-status");
    expect(statusBadges.length).toBe(6);
    // Check that specific statuses are present
    const texts = statusBadges.map((el) => el.textContent);
    expect(texts).toContain("Pending");
    expect(texts).toContain("Done");
    expect(texts).toContain("In Progress");
  });

  it("shows farmer name and task type for each task", () => {
    render(<QueueList tasks={TASKS} />);
    expect(screen.getByText("Ramesh Patel")).toBeTruthy();
    expect(screen.getAllByText("AA Consent").length).toBeGreaterThan(0);
    expect(screen.getByText("Gita Sharma")).toBeTruthy();
  });

  it("village task count badges are correct", () => {
    render(<QueueList tasks={TASKS} />);
    const countBadges = screen.getAllByTestId("village-task-count");
    expect(countBadges[0]).toHaveTextContent("3 tasks"); // Kheda
    expect(countBadges[1]).toHaveTextContent("2 tasks"); // Mandvi
    expect(countBadges[2]).toHaveTextContent("1 task");  // Dahod (singular)
  });
});

// ─── groupByVillage utility ───────────────────────────────

describe("groupByVillage", () => {
  it("returns map with villages sorted by count desc", () => {
    const grouped = groupByVillage(TASKS);
    const keys = [...grouped.keys()];
    expect(keys[0]).toBe("Kheda");  // 3 tasks
    expect(keys[1]).toBe("Mandvi"); // 2 tasks
    expect(keys[2]).toBe("Dahod");  // 1 task
  });
});

// ─── Queue page integration (via demo mode) ───────────────

describe("QueuePage (integration)", () => {
  // Dynamically import the page to use the mocked next/navigation
  let QueuePage: React.ComponentType;

  beforeAll(async () => {
    const mod = await import("../../src/app/dashboard/queue/page");
    QueuePage = mod.default;
  });

  it("happy path: renders header, filters, and list in demo mode", async () => {
    render(<QueuePage />);

    // Demo mode loads immediately (no async fetch)
    expect(screen.getByTestId("queue-page")).toBeTruthy();
    expect(screen.getByTestId("queue-header")).toBeTruthy();
    expect(screen.getByTestId("queue-filters")).toBeTruthy();
    expect(screen.getByTestId("queue-list")).toBeTruthy();
    expect(screen.getByTestId("route-planner")).toBeTruthy();
  });

  it("renders header with correct task count in demo mode", () => {
    render(<QueuePage />);
    const summary = screen.getByTestId("queue-header-summary");
    expect(summary).toHaveTextContent("6 tasks");
    expect(summary).toHaveTextContent("3 villages");
  });

  it("filter by status updates visible task list", () => {
    render(<QueuePage />);

    // Initially all 6 tasks
    expect(screen.getAllByTestId("task-item").length).toBe(6);

    // Filter to "completed"
    fireEvent.change(screen.getByTestId("filter-status"), {
      target: { value: "completed" },
    });

    // Only 1 completed task (Suresh Kumar)
    const items = screen.getAllByTestId("task-item");
    expect(items.length).toBe(1);
    expect(screen.getByText("Suresh Kumar")).toBeTruthy();
  });

  it("filter by village updates visible task list", () => {
    render(<QueuePage />);

    // Filter to "Dahod"
    fireEvent.change(screen.getByTestId("filter-village"), {
      target: { value: "Dahod" },
    });

    // Only 1 task in Dahod
    const items = screen.getAllByTestId("task-item");
    expect(items.length).toBe(1);
    expect(screen.getByText("Gita Sharma")).toBeTruthy();
  });
});

// ─── Privacy firewall (§5.5) ──────────────────────────────

describe("Queue privacy firewall (§5.5)", () => {
  it("no score-adjacent strings in rendered output", () => {
    render(<QueueList tasks={TASKS} />);
    const text = (document.body.textContent || "").toLowerCase();

    expect(text).not.toContain("score updated");
    expect(text).not.toContain("trust score");
    expect(text).not.toContain("point lift");
    expect(text).not.toContain("score changed");
    expect(text).not.toContain("band");
  });
});
