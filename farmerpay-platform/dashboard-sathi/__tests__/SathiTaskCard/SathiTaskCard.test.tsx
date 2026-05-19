/**
 * SathiTaskCard — Unit Tests (G3 — Spec §5.2 + §5.5 + §5.6)
 *
 * Tests:
 *   REASON LABELS
 *   1.  HOUSEHOLD_REFRESH renders correct label
 *   2.  LAND_EXPIRES renders correct label
 *   3.  INSURANCE_MISSING renders correct label
 *   4.  PHOTO_GEOTAG_NEEDED renders correct label
 *   5.  FARMER_REQUESTED renders correct label
 *   6.  Unknown reason triggers console.error in dev
 *   7.  Unknown reason still renders the raw code as fallback
 *   8.  Reason prop must be one of the 5 whitelisted values (REASON_CODES)
 *
 *   CARD RENDERING
 *   9.  Renders farmer name
 *  10.  Renders sub-line: "{village} · due {date}"
 *  11.  Renders status badge
 *  12.  Status "pending" → "Pending" label
 *  13.  Status "completed" → "Done" label
 *  14.  Status "in_progress" → "In Progress" label
 *  15.  onTap fires with task id
 *
 *   PRIVACY (§5.6)
 *  16.  No score-adjacent strings in rendered output
 *  17.  Reason labels are from whitelist, never computed from score deltas
 */

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import SathiTaskCard, {
  REASON_CODES,
  REASON_LABELS,
  resolveReasonLabel,
  type ReasonCode,
} from "../../src/components/SathiTaskCard";

const BASE_PROPS = {
  id: "task-1",
  farmerName: "Ramesh Patel",
  village: "Kheda",
  dueDate: "2024-06-15",
  reason: "HOUSEHOLD_REFRESH" as string,
  status: "pending" as const,
};

// ─── Reason labels ────────────────────────────────────────

describe("SathiTaskCard — reason labels", () => {
  it("HOUSEHOLD_REFRESH renders correct label", () => {
    render(<SathiTaskCard {...BASE_PROPS} reason="HOUSEHOLD_REFRESH" />);
    expect(screen.getByTestId("task-card-reason")).toHaveTextContent(
      "Household data needs refresh",
    );
  });

  it("LAND_EXPIRES renders correct label", () => {
    render(<SathiTaskCard {...BASE_PROPS} reason="LAND_EXPIRES" />);
    expect(screen.getByTestId("task-card-reason")).toHaveTextContent(
      "Land record expires",
    );
  });

  it("INSURANCE_MISSING renders correct label", () => {
    render(<SathiTaskCard {...BASE_PROPS} reason="INSURANCE_MISSING" />);
    expect(screen.getByTestId("task-card-reason")).toHaveTextContent(
      "Insurance cert missing",
    );
  });

  it("PHOTO_GEOTAG_NEEDED renders correct label", () => {
    render(<SathiTaskCard {...BASE_PROPS} reason="PHOTO_GEOTAG_NEEDED" />);
    expect(screen.getByTestId("task-card-reason")).toHaveTextContent(
      "Photo + geotag needed",
    );
  });

  it("FARMER_REQUESTED renders correct label", () => {
    render(<SathiTaskCard {...BASE_PROPS} reason="FARMER_REQUESTED" />);
    expect(screen.getByTestId("task-card-reason")).toHaveTextContent(
      "Farmer requested a visit",
    );
  });

  it("unknown reason triggers console.error in dev", () => {
    const spy = jest.spyOn(console, "error").mockImplementation(() => {});
    render(<SathiTaskCard {...BASE_PROPS} reason="SCORE_DELTA_HIGH" />);
    expect(spy).toHaveBeenCalledWith(
      expect.stringContaining('Unknown reason code: "SCORE_DELTA_HIGH"'),
    );
    spy.mockRestore();
  });

  it("unknown reason still renders the raw code as fallback", () => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    render(<SathiTaskCard {...BASE_PROPS} reason="UNKNOWN_CODE" />);
    expect(screen.getByTestId("task-card-reason")).toHaveTextContent("UNKNOWN_CODE");
    jest.restoreAllMocks();
  });

  it("REASON_CODES contains exactly 5 whitelisted values", () => {
    expect(REASON_CODES).toHaveLength(5);
    expect(REASON_CODES).toContain("HOUSEHOLD_REFRESH");
    expect(REASON_CODES).toContain("LAND_EXPIRES");
    expect(REASON_CODES).toContain("INSURANCE_MISSING");
    expect(REASON_CODES).toContain("PHOTO_GEOTAG_NEEDED");
    expect(REASON_CODES).toContain("FARMER_REQUESTED");
  });

  it("every REASON_CODE has a corresponding label", () => {
    for (const code of REASON_CODES) {
      expect(REASON_LABELS[code]).toBeDefined();
      expect(typeof REASON_LABELS[code]).toBe("string");
      expect(REASON_LABELS[code].length).toBeGreaterThan(0);
    }
  });
});

// ─── Card rendering ───────────────────────────────────────

describe("SathiTaskCard — card rendering", () => {
  it("renders farmer name", () => {
    render(<SathiTaskCard {...BASE_PROPS} />);
    expect(screen.getByTestId("task-card-farmer")).toHaveTextContent("Ramesh Patel");
  });

  it("renders sub-line: village + due date", () => {
    render(<SathiTaskCard {...BASE_PROPS} />);
    const sub = screen.getByTestId("task-card-sub");
    expect(sub.textContent).toContain("Kheda");
    expect(sub.textContent).toContain("due");
    expect(sub.textContent).toContain("Jun"); // 15 Jun from 2024-06-15
  });

  it("renders status badge", () => {
    render(<SathiTaskCard {...BASE_PROPS} />);
    expect(screen.getByTestId("task-card-status")).toBeTruthy();
  });

  it('status "pending" renders "Pending"', () => {
    render(<SathiTaskCard {...BASE_PROPS} status="pending" />);
    expect(screen.getByTestId("task-card-status")).toHaveTextContent("Pending");
  });

  it('status "completed" renders "Done"', () => {
    render(<SathiTaskCard {...BASE_PROPS} status="completed" />);
    expect(screen.getByTestId("task-card-status")).toHaveTextContent("Done");
  });

  it('status "in_progress" renders "In Progress"', () => {
    render(<SathiTaskCard {...BASE_PROPS} status="in_progress" />);
    expect(screen.getByTestId("task-card-status")).toHaveTextContent("In Progress");
  });

  it("onTap fires with task id", () => {
    const onTap = jest.fn();
    render(<SathiTaskCard {...BASE_PROPS} onTap={onTap} />);
    fireEvent.click(screen.getByTestId("sathi-task-card"));
    expect(onTap).toHaveBeenCalledWith("task-1");
  });

  it("no click handler when onTap is not provided", () => {
    render(<SathiTaskCard {...BASE_PROPS} />);
    // Should not throw when clicked
    fireEvent.click(screen.getByTestId("sathi-task-card"));
  });
});

// ─── Privacy (§5.6) ──────────────────────────────────────

describe("SathiTaskCard — privacy firewall (§5.6)", () => {
  it("no score-adjacent strings in rendered output", () => {
    render(<SathiTaskCard {...BASE_PROPS} />);
    const text = (document.body.textContent || "").toLowerCase();
    expect(text).not.toContain("score");
    expect(text).not.toContain("trust");
    expect(text).not.toContain("point lift");
    expect(text).not.toContain("band");
  });

  it("reason labels are from whitelist, not score-derived", () => {
    // Every label in REASON_LABELS must NOT contain score-adjacent terms
    for (const code of REASON_CODES) {
      const label = REASON_LABELS[code].toLowerCase();
      expect(label).not.toContain("score");
      expect(label).not.toContain("trust");
      expect(label).not.toContain("point");
    }
  });
});
