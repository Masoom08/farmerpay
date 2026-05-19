/**
 * AuditTrail — Unit Tests (C10)
 *
 * Tests:
 *   1.  Renders all event rows
 *   2.  Events ordered newest-first
 *   3.  Actor icon rendered by type (BANKER, SATHI, SYSTEM)
 *   4.  Actor name displayed (falls back to label)
 *   5.  Action text shown
 *   6.  Timestamp formatted
 *   7.  Expand row reveals JSON payload
 *   8.  Collapse hides payload
 *   9.  No expand button when payload is absent
 *  10.  aria-expanded reflects state
 *  11.  Export CSV button renders when exportable=true
 *  12.  Export CSV button hidden when exportable=false
 *  13.  CSV has correct headers and N+1 lines
 *  14.  CSV escapes fields with commas/quotes
 *  15.  Empty state message
 *  16.  role="list" / role="listitem"
 *  17.  Download triggered with correct filename pattern
 */

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import {
  AuditTrail,
  type AuditTrailProps,
  type AuditEvent,
} from "@/components/trust/AuditTrail";
import { buildCsvString } from "@/components/trust/AuditTrail/exportCsv";

// ─── Mock URL.createObjectURL / revokeObjectURL ────────────────

const mockCreateObjectURL = jest.fn(() => "blob:mock-url");
const mockRevokeObjectURL = jest.fn();
Object.defineProperty(globalThis, "URL", {
  value: {
    createObjectURL: mockCreateObjectURL,
    revokeObjectURL: mockRevokeObjectURL,
  },
  writable: true,
});

// ─── Test Data ──────────────────────────────────────────────────

const MOCK_EVENTS: AuditEvent[] = [
  {
    eventUuid: "evt-1",
    actorType: "BANKER",
    actorName: "Ramesh K.",
    action: "Sanctioned loan",
    createdAt: "2025-12-01T10:00:00Z",
    payload: { loanId: "L-100", amount: 350000 },
  },
  {
    eventUuid: "evt-2",
    actorType: "SYSTEM",
    action: "TRUST score recomputed",
    createdAt: "2025-12-03T14:30:00Z",
    payload: { oldScore: 580, newScore: 620 },
  },
  {
    eventUuid: "evt-3",
    actorType: "SATHI",
    actorName: "Priya S.",
    action: "Updated farm details",
    createdAt: "2025-12-02T08:15:00Z",
  },
];

const DEFAULT_PROPS: AuditTrailProps = {
  events: MOCK_EVENTS,
  exportable: true,
  farmerId: "F-42",
};

const renderTrail = (overrides: Partial<AuditTrailProps> = {}) =>
  render(<AuditTrail {...DEFAULT_PROPS} {...overrides} />);

// ─── Tests ──────────────────────────────────────────────────────

describe("AuditTrail", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ─── Basic rendering ────────────────────────────────────────

  it("renders all event rows", () => {
    renderTrail();

    expect(screen.getByTestId("audit-row-evt-1")).toBeInTheDocument();
    expect(screen.getByTestId("audit-row-evt-2")).toBeInTheDocument();
    expect(screen.getByTestId("audit-row-evt-3")).toBeInTheDocument();
  });

  it("renders audit-trail container", () => {
    renderTrail();
    expect(screen.getByTestId("audit-trail")).toBeInTheDocument();
  });

  // ─── Ordering (newest-first) ────────────────────────────────

  it("orders events newest-first", () => {
    renderTrail();

    const rows = screen.getAllByRole("listitem");
    // evt-2 (Dec 3) → evt-3 (Dec 2) → evt-1 (Dec 1)
    expect(rows[0]).toHaveAttribute("data-testid", "audit-row-evt-2");
    expect(rows[1]).toHaveAttribute("data-testid", "audit-row-evt-3");
    expect(rows[2]).toHaveAttribute("data-testid", "audit-row-evt-1");
  });

  // ─── Actor icons by type ────────────────────────────────────

  it("renders BANKER actor icon", () => {
    renderTrail();

    const icon = screen.getByTestId("actor-icon-evt-1");
    expect(icon).toHaveAttribute("aria-label", "Banker");
    expect(icon).toHaveTextContent("🏦");
  });

  it("renders SYSTEM actor icon", () => {
    renderTrail();

    const icon = screen.getByTestId("actor-icon-evt-2");
    expect(icon).toHaveAttribute("aria-label", "System");
    expect(icon).toHaveTextContent("⚙️");
  });

  it("renders SATHI actor icon", () => {
    renderTrail();

    const icon = screen.getByTestId("actor-icon-evt-3");
    expect(icon).toHaveAttribute("aria-label", "Sathi");
    expect(icon).toHaveTextContent("🤝");
  });

  // ─── Actor name ─────────────────────────────────────────────

  it("shows actor name when provided", () => {
    renderTrail();

    expect(screen.getByTestId("actor-name-evt-1")).toHaveTextContent("Ramesh K.");
    expect(screen.getByTestId("actor-name-evt-3")).toHaveTextContent("Priya S.");
  });

  it("falls back to actor type label when name is missing", () => {
    renderTrail();

    // evt-2 is SYSTEM with no actorName
    expect(screen.getByTestId("actor-name-evt-2")).toHaveTextContent("System");
  });

  // ─── Action + timestamp ─────────────────────────────────────

  it("shows action text in each row", () => {
    renderTrail();

    expect(screen.getByTestId("audit-row-evt-1")).toHaveTextContent("Sanctioned loan");
    expect(screen.getByTestId("audit-row-evt-2")).toHaveTextContent("TRUST score recomputed");
    expect(screen.getByTestId("audit-row-evt-3")).toHaveTextContent("Updated farm details");
  });

  it("shows formatted timestamp", () => {
    renderTrail();

    // The exact format depends on locale but should contain date parts
    const ts = screen.getByTestId("timestamp-evt-1");
    expect(ts.textContent).not.toBe("—");
    expect(ts.textContent!.length).toBeGreaterThan(0);
  });

  // ─── Expand / collapse payload ──────────────────────────────

  it("expand button exists for rows with payload", () => {
    renderTrail();

    expect(screen.getByTestId("expand-btn-evt-1")).toBeInTheDocument();
    expect(screen.getByTestId("expand-btn-evt-2")).toBeInTheDocument();
  });

  it("no expand button for rows without payload", () => {
    renderTrail();

    expect(screen.queryByTestId("expand-btn-evt-3")).not.toBeInTheDocument();
  });

  it("expand row reveals JSON payload", () => {
    renderTrail();

    // Initially collapsed
    const payload = screen.getByTestId("payload-evt-1");
    expect(payload.className).toContain("grid-rows-[0fr]");

    // Expand
    fireEvent.click(screen.getByTestId("expand-btn-evt-1"));

    expect(payload.className).toContain("grid-rows-[1fr]");
    expect(payload).toHaveTextContent('"loanId"');
    expect(payload).toHaveTextContent("350000");
  });

  it("collapse hides payload again", () => {
    renderTrail();

    const btn = screen.getByTestId("expand-btn-evt-1");
    const payload = screen.getByTestId("payload-evt-1");

    // Expand then collapse
    fireEvent.click(btn);
    expect(payload.className).toContain("grid-rows-[1fr]");

    fireEvent.click(btn);
    expect(payload.className).toContain("grid-rows-[0fr]");
  });

  it("aria-expanded reflects expand state", () => {
    renderTrail();

    const btn = screen.getByTestId("expand-btn-evt-1");
    expect(btn).toHaveAttribute("aria-expanded", "false");

    fireEvent.click(btn);
    expect(btn).toHaveAttribute("aria-expanded", "true");
  });

  it("aria-controls points to payload panel id", () => {
    renderTrail();

    const btn = screen.getByTestId("expand-btn-evt-1");
    expect(btn).toHaveAttribute("aria-controls", "payload-evt-1");
  });

  // ─── Export CSV ─────────────────────────────────────────────

  it("renders Export CSV button when exportable=true", () => {
    renderTrail({ exportable: true });

    expect(screen.getByTestId("export-csv-btn")).toBeInTheDocument();
    expect(screen.getByTestId("export-csv-btn")).toHaveTextContent("Export CSV");
  });

  it("hides Export CSV button when exportable=false", () => {
    renderTrail({ exportable: false });

    expect(screen.queryByTestId("export-csv-btn")).not.toBeInTheDocument();
  });

  it("hides Export CSV button when exportable is omitted (default false)", () => {
    renderTrail({ exportable: undefined });

    expect(screen.queryByTestId("export-csv-btn")).not.toBeInTheDocument();
  });

  it("clicking export triggers download via createObjectURL", () => {
    renderTrail({ exportable: true, farmerId: "F-42" });
    fireEvent.click(screen.getByTestId("export-csv-btn"));

    expect(mockCreateObjectURL).toHaveBeenCalledTimes(1);
    expect(mockRevokeObjectURL).toHaveBeenCalledTimes(1);
  });

  // ─── CSV content (unit testing buildCsvString) ──────────────

  it("CSV has correct headers and N+1 lines", () => {
    const rows = MOCK_EVENTS.map((e) => ({
      eventUuid: e.eventUuid,
      actorType: e.actorType,
      actorName: e.actorName,
      action: e.action,
      createdAt: e.createdAt,
      payload: e.payload,
    }));

    const csv = buildCsvString(rows);
    const lines = csv.split("\n");

    // Header + 3 data rows = 4 lines
    expect(lines).toHaveLength(4);
    expect(lines[0]).toBe(
      "Event UUID,Actor Type,Actor Name,Action,Timestamp,Payload",
    );
  });

  it("CSV escapes fields containing commas", () => {
    const rows = [
      {
        eventUuid: "x-1",
        actorType: "SYSTEM",
        action: "Did A, B, and C",
        createdAt: "2025-01-01T00:00:00Z",
      },
    ];

    const csv = buildCsvString(rows);
    // The action field should be quoted
    expect(csv).toContain('"Did A, B, and C"');
  });

  it("CSV escapes fields containing double quotes", () => {
    const rows = [
      {
        eventUuid: "x-2",
        actorType: "BANKER",
        action: 'Said "hello"',
        createdAt: "2025-01-01T00:00:00Z",
      },
    ];

    const csv = buildCsvString(rows);
    expect(csv).toContain('"Said ""hello"""');
  });

  it("CSV includes payload as JSON string", () => {
    const rows = [
      {
        eventUuid: "x-3",
        actorType: "SYSTEM",
        action: "Test",
        createdAt: "2025-01-01T00:00:00Z",
        payload: { key: "value" },
      },
    ];

    const csv = buildCsvString(rows);
    // JSON gets CSV-escaped (quotes doubled, field wrapped)
    expect(csv).toContain("key");
    expect(csv).toContain("value");
  });

  // ─── Empty state ────────────────────────────────────────────

  it("shows empty state when no events", () => {
    renderTrail({ events: [] });

    expect(screen.getByTestId("audit-empty")).toBeInTheDocument();
    expect(screen.getByTestId("audit-empty")).toHaveTextContent(
      "No audit events recorded.",
    );
  });

  // ─── Accessibility ──────────────────────────────────────────

  it('event list has role="list" with aria-label', () => {
    renderTrail();

    const list = screen.getByRole("list", { name: "Audit events" });
    expect(list).toBeInTheDocument();
  });

  it('each event row has role="listitem"', () => {
    renderTrail();

    const row = screen.getByTestId("audit-row-evt-1");
    expect(row).toHaveAttribute("role", "listitem");
  });

  it("actor icons have role=img with aria-label", () => {
    renderTrail();

    const icon = screen.getByTestId("actor-icon-evt-1");
    expect(icon).toHaveAttribute("role", "img");
    expect(icon).toHaveAttribute("aria-label", "Banker");
  });
});
