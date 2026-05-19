"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

// ─── Types ──────────────────────────────────────────────────────

export interface MiniPillar {
  code: string;
  name: string;
  score: number;
}

export interface MiniPillarChartProps {
  pillars: MiniPillar[];
  className?: string;
}

// ─── Pillar colours ─────────────────────────────────────────────

const PILLAR_COLORS: Record<string, string> = {
  P1: "bg-pillar-p1",
  P2: "bg-pillar-p2",
  P3: "bg-pillar-p3",
  P4: "bg-pillar-p4",
  P5: "bg-pillar-p5",
  P6: "bg-pillar-p6",
};

// ─── Component ──────────────────────────────────────────────────

export function MiniPillarChart({ pillars, className }: MiniPillarChartProps) {
  if (pillars.length === 0) {
    return (
      <p
        data-testid="mini-chart-empty"
        className="text-xs text-muted-foreground"
      >
        No pillar data
      </p>
    );
  }

  return (
    <div
      data-testid="mini-pillar-chart"
      className={cn("flex flex-col gap-1.5", className)}
      role="img"
      aria-label="Pillar scores"
    >
      {pillars.map((p) => {
        const clamped = Math.min(100, Math.max(0, p.score));
        const barColor = PILLAR_COLORS[p.code] ?? "bg-brand-primary-500";

        return (
          <div
            key={p.code}
            data-testid={`mini-bar-${p.code}`}
            className="flex items-center gap-2"
          >
            <span className="w-8 shrink-0 text-[10px] font-medium text-muted-foreground">
              {p.code}
            </span>
            <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-muted">
              <div
                data-testid={`mini-bar-fill-${p.code}`}
                className={cn("absolute inset-y-0 left-0 rounded-full", barColor)}
                style={{ width: `${clamped}%` }}
              />
            </div>
            <span className="w-6 text-right text-[10px] tabular-nums text-muted-foreground">
              {p.score}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export default MiniPillarChart;
