"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

// ─── Types ──────────────────────────────────────────────────────

export type GroupCode = "DEMO" | "OPS" | "ASSET" | "EXT";

export interface Group {
  code: GroupCode;
  earned: number;
  max: number;
}

export interface Table2GroupPanelProps {
  groups: Group[];
  onGroupClick: (code: GroupCode) => void;
  className?: string;
}

// ─── Labels ─────────────────────────────────────────────────────

const GROUP_LABELS: Record<GroupCode, string> = {
  DEMO: "Demographic",
  OPS: "Operational",
  ASSET: "Asset & Land",
  EXT: "External",
};

// ─── Colour mapping based on fill ratio ─────────────────────────

function getFillClass(earned: number, max: number): string {
  if (max <= 0) return "bg-muted text-muted-foreground";
  const ratio = earned / max;
  if (ratio >= 0.8) return "bg-brand-primary-100 text-brand-primary-700";
  if (ratio >= 0.5) return "bg-brand-accent-amber/20 text-neutral-800";
  return "bg-decision-reject/10 text-decision-reject";
}

// ─── Component ──────────────────────────────────────────────────

export function Table2GroupPanel({
  groups,
  onGroupClick,
  className,
}: Table2GroupPanelProps) {
  return (
    <div
      data-testid="table2-group-panel"
      className={cn("flex flex-wrap items-center gap-3", className)}
      role="group"
      aria-label="Table-2 group scores"
    >
      {groups.map((g) => {
        const label = GROUP_LABELS[g.code] ?? g.code;
        const ariaLabel = `${label} ${g.earned} out of ${g.max}`;

        return (
          <button
            key={g.code}
            type="button"
            data-testid={`group-chip-${g.code}`}
            aria-label={ariaLabel}
            onClick={() => onGroupClick(g.code)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-all",
              "hover:ring-2 hover:ring-brand-primary-500/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              getFillClass(g.earned, g.max),
            )}
          >
            <span>{label}</span>
            <span className="tabular-nums">
              {g.earned} / {g.max}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export default Table2GroupPanel;
