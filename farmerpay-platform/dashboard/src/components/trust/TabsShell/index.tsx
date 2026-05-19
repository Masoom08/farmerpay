"use client";

import * as React from "react";
import { useState, useCallback, useRef } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { cn } from "@/lib/utils";

// ─── Types ──────────────────────────────────────────────────────

export type TabId = "pillars" | "evidence" | "audit-trail" | "drishti-projection";

export interface TabsShellProps {
  /** Default active tab */
  defaultTab?: TabId;
  /** Whether tabs are disabled (e.g. loading) */
  disabled?: boolean;
  /** Content for each tab panel */
  children: {
    pillars: React.ReactNode;
    evidence: React.ReactNode;
    auditTrail: React.ReactNode;
    drishtiProjection: React.ReactNode;
  };
  /** Keyboard shortcut callbacks */
  onApprove?: () => void;
  onRequestMore?: () => void;
  onReject?: () => void;
  onPillarFocus?: (pillarIndex: number) => void;
  onEscape?: () => void;
  className?: string;
}

// ─── Component ──────────────────────────────────────────────────

export function TabsShell({
  defaultTab = "pillars",
  disabled = false,
  children,
  onApprove,
  onRequestMore,
  onReject,
  onPillarFocus,
  onEscape,
  className,
}: TabsShellProps) {
  const [activeTab, setActiveTab] = useState<TabId>(defaultTab);
  const announceRef = useRef<HTMLDivElement>(null);

  const handleTabChange = useCallback((value: string | number) => {
    setActiveTab(value as TabId);
  }, []);

  // Register keyboard shortcuts
  useKeyboardShortcuts(
    {
      onApprove,
      onRequestMore,
      onReject,
      onPillarFocus,
      onEscape,
    },
    {
      activeTab,
      enabled: !disabled,
      announceRef,
    },
  );

  return (
    <div data-testid="tabs-shell" className={cn("flex flex-col", className)}>
      <Tabs
        defaultValue={defaultTab}
        onValueChange={handleTabChange}
        data-testid="trust-tabs"
      >
        <TabsList variant="line" data-testid="tabs-list">
          <TabsTrigger
            value="pillars"
            disabled={disabled}
            data-testid="tab-pillars"
          >
            Pillars
          </TabsTrigger>
          <TabsTrigger
            value="evidence"
            disabled={disabled}
            data-testid="tab-evidence"
          >
            Evidence
          </TabsTrigger>
          <TabsTrigger
            value="audit-trail"
            disabled={disabled}
            data-testid="tab-audit-trail"
          >
            Audit trail
          </TabsTrigger>
          <TabsTrigger
            value="drishti-projection"
            disabled={disabled}
            data-testid="tab-drishti"
          >
            DRISHTI projection
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pillars" className="min-h-[560px] pt-6">
          {children.pillars}
        </TabsContent>

        <TabsContent value="evidence" className="min-h-[560px] pt-6">
          {children.evidence}
        </TabsContent>

        <TabsContent value="audit-trail" className="min-h-[560px] pt-6">
          {children.auditTrail}
        </TabsContent>

        <TabsContent value="drishti-projection" className="min-h-[560px] pt-6">
          {children.drishtiProjection}
        </TabsContent>
      </Tabs>

      {/* aria-live region for keyboard shortcut announcements */}
      <div
        ref={announceRef}
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
        data-testid="shortcut-announcer"
      />
    </div>
  );
}

export default TabsShell;
