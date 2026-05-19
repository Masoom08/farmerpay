"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

// ─── Types ──────────────────────────────────────────────────────

export interface HeatmapLegendProps {
  showLetters: boolean;
  onToggleLetters: () => void;
  className?: string;
}

// ─── Legend config ──────────────────────────────────────────────

const LEGEND_ITEMS = [
  { label: "Sanction", letter: "S", bg: "bg-green-600" },
  { label: "Reconsider", letter: "R", bg: "bg-amber-500" },
  { label: "Reject", letter: "J", bg: "bg-red-600" },
];

const OPACITY_ITEMS = [
  { label: "Fresh", opacity: 1.0 },
  { label: "Recent", opacity: 0.7 },
  { label: "Stale", opacity: 0.3 },
];

// ─── Component ──────────────────────────────────────────────────

export function HeatmapLegend({
  showLetters,
  onToggleLetters,
  className,
}: HeatmapLegendProps) {
  return (
    <div
      data-testid="heatmap-legend"
      className={cn(
        "flex flex-wrap items-center gap-4 rounded-lg border bg-card px-4 py-2.5 text-xs",
        className,
      )}
      role="group"
      aria-label="Heatmap legend"
    >
      {/* Decision colours */}
      <div className="flex items-center gap-3">
        {LEGEND_ITEMS.map((item) => (
          <div key={item.letter} className="flex items-center gap-1.5">
            <span
              data-testid={`legend-swatch-${item.letter}`}
              className={cn("inline-block h-3.5 w-3.5 rounded-sm", item.bg)}
            />
            <span className="text-muted-foreground">
              {item.label} ({item.letter})
            </span>
          </div>
        ))}
      </div>

      {/* Opacity / recency */}
      <div className="flex items-center gap-2 border-l pl-4">
        <span className="text-muted-foreground">Recency:</span>
        {OPACITY_ITEMS.map((item) => (
          <div key={item.label} className="flex items-center gap-1">
            <span
              className="inline-block h-3 w-3 rounded-sm bg-neutral-600"
              style={{ opacity: item.opacity }}
            />
            <span className="text-muted-foreground">{item.label}</span>
          </div>
        ))}
      </div>

      {/* Letter toggle */}
      <label
        data-testid="letter-toggle"
        className="ml-auto flex items-center gap-1.5 cursor-pointer"
      >
        <input
          type="checkbox"
          data-testid="letter-toggle-input"
          checked={showLetters}
          onChange={onToggleLetters}
          className="h-3.5 w-3.5 rounded border-border"
        />
        <span className="text-muted-foreground">Show letters</span>
      </label>
    </div>
  );
}

export default HeatmapLegend;
