"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

// ─── Types ──────────────────────────────────────────────────────

export interface MovementData {
  up: number;
  down: number;
  unchanged: number;
}

export interface MovementPillarProps {
  movement: MovementData;
  className?: string;
}

// ─── Component ──────────────────────────────────────────────────

export function MovementPillar({ movement, className }: MovementPillarProps) {
  const { up, down, unchanged } = movement;

  return (
    <div
      data-testid="movement-pillar"
      className={cn(
        "flex items-center gap-4 rounded-lg border bg-card px-4 py-3",
        className,
      )}
      role="status"
      aria-label={`Movement: ${up} moved up, ${down} moved down, ${unchanged} unchanged`}
    >
      <span className="text-xs font-medium text-muted-foreground mr-1">
        Movement:
      </span>

      {/* Moved up */}
      <span
        data-testid="movement-up"
        className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700"
      >
        <span aria-hidden="true">▲</span>
        {up} moved up
      </span>

      <span className="text-muted-foreground" aria-hidden="true">·</span>

      {/* Moved down */}
      <span
        data-testid="movement-down"
        className="inline-flex items-center gap-1 text-xs font-medium text-red-700"
      >
        <span aria-hidden="true">▼</span>
        {down} moved down
      </span>

      <span className="text-muted-foreground" aria-hidden="true">·</span>

      {/* Unchanged */}
      <span
        data-testid="movement-unchanged"
        className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground"
      >
        <span aria-hidden="true">•</span>
        {unchanged} unchanged
      </span>
    </div>
  );
}

export default MovementPillar;
