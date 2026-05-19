/**
 * TabsShell — Unit Tests (C7)
 *
 * Tests:
 *   1. Renders all 4 tab triggers
 *   2. Default tab is Pillars
 *   3. Tab content panels render
 *   4. Shortcut announcer region exists (sr-only, aria-live)
 *   5. Disabled tabs cannot be clicked
 */

import React from "react";
import { render, screen } from "@testing-library/react";
import { TabsShell, type TabsShellProps } from "@/components/trust/TabsShell";

// ─── Helpers ────────────────────────────────────────────────────

const CHILDREN = {
  pillars: <div data-testid="panel-pillars">Pillars content</div>,
  evidence: <div data-testid="panel-evidence">Evidence content</div>,
  auditTrail: <div data-testid="panel-audit">Audit content</div>,
  drishtiProjection: <div data-testid="panel-drishti">DRISHTI content</div>,
};

const renderShell = (overrides: Partial<TabsShellProps> = {}) =>
  render(
    <TabsShell {...overrides}>
      {CHILDREN}
    </TabsShell>,
  );

// ─── Tests ──────────────────────────────────────────────────────

describe("TabsShell", () => {
  it("renders the shell container", () => {
    renderShell();
    expect(screen.getByTestId("tabs-shell")).toBeInTheDocument();
  });

  it("renders all 4 tab triggers", () => {
    renderShell();

    expect(screen.getByTestId("tab-pillars")).toHaveTextContent("Pillars");
    expect(screen.getByTestId("tab-evidence")).toHaveTextContent("Evidence");
    expect(screen.getByTestId("tab-audit-trail")).toHaveTextContent("Audit trail");
    expect(screen.getByTestId("tab-drishti")).toHaveTextContent("DRISHTI projection");
  });

  it("default tab is Pillars — panel visible", () => {
    renderShell();

    expect(screen.getByTestId("panel-pillars")).toBeInTheDocument();
  });

  it("renders shortcut announcer with aria-live", () => {
    renderShell();

    const announcer = screen.getByTestId("shortcut-announcer");
    expect(announcer).toBeInTheDocument();
    expect(announcer).toHaveAttribute("role", "status");
    expect(announcer).toHaveAttribute("aria-live", "polite");
    expect(announcer.className).toContain("sr-only");
  });

  it("tabs are disabled when disabled=true", () => {
    renderShell({ disabled: true });

    const tab = screen.getByTestId("tab-pillars");
    // shadcn/base-ui Tabs use aria-disabled or disabled attribute
    const isDisabled =
      tab.hasAttribute("disabled") ||
      tab.getAttribute("aria-disabled") === "true";
    expect(isDisabled).toBe(true);
  });

  it("tabs are enabled when disabled=false", () => {
    renderShell({ disabled: false });

    const tab = screen.getByTestId("tab-pillars");
    const isDisabled =
      tab.hasAttribute("disabled") ||
      tab.getAttribute("aria-disabled") === "true";
    expect(isDisabled).toBe(false);
  });

  it("can set a different default tab", () => {
    renderShell({ defaultTab: "evidence" });

    expect(screen.getByTestId("panel-evidence")).toBeInTheDocument();
  });
});
