"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import {
  MovementPillar,
  type MovementData,
} from "@/components/portfolio/MovementPillar";

// ─── Types ──────────────────────────────────────────────────────

export interface KpiCounts {
  sanction: number;
  reconsider: number;
  reject: number;
}

export interface SummaryStripProps {
  counts: KpiCounts;
  movement: MovementData;
  className?: string;
}

// ─── KPI card config ────────────────────────────────────────────

const KPI_CONFIG: {
  key: keyof KpiCounts;
  label: string;
  colorBg: string;
  colorText: string;
  colorBorder: string;
}[] = [
  {
    key: "sanction",
    label: "Sanction-grade",
    colorBg: "bg-green-50",
    colorText: "text-green-800",
    colorBorder: "border-green-300",
  },
  {
    key: "reconsider",
    label: "Reconsider",
    colorBg: "bg-amber-50",
    colorText: "text-amber-800",
    colorBorder: "border-amber-300",
  },
  {
    key: "reject",
    label: "Reject-grade",
    colorBg: "bg-red-50",
    colorText: "text-red-800",
    colorBorder: "border-red-300",
  },
];

// ─── Component ──────────────────────────────────────────────────

export function SummaryStrip({
  counts,
  movement,
  className,
}: SummaryStripProps) {
  const total = counts.sanction + counts.reconsider + counts.reject;

  return (
    <div
      data-testid="summary-strip"
      className={cn("flex flex-col gap-3", className)}
      role="region"
      aria-label="Portfolio summary"
    >
      {/* ─── KPI Cards ────────────────────────────────── */}
      <div
        data-testid="kpi-cards"
        className="grid grid-cols-3 gap-4"
      >
        {KPI_CONFIG.map((kpi) => (
          <KpiCard
            key={kpi.key}
            testId={`kpi-${kpi.key}`}
            label={kpi.label}
            count={counts[kpi.key]}
            total={total}
            colorBg={kpi.colorBg}
            colorText={kpi.colorText}
            colorBorder={kpi.colorBorder}
          />
        ))}
      </div>

      {/* ─── Movement Pillar ──────────────────────────── */}
      <MovementPillar movement={movement} />
    </div>
  );
}

// ─── KpiCard sub-component ──────────────────────────────────────

function KpiCard({
  testId,
  label,
  count,
  total,
  colorBg,
  colorText,
  colorBorder,
}: {
  testId: string;
  label: string;
  count: number;
  total: number;
  colorBg: string;
  colorText: string;
  colorBorder: string;
}) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;

  return (
    <div
      data-testid={testId}
      className={cn(
        "flex flex-col gap-1 rounded-lg border px-4 py-3",
        colorBg,
        colorBorder,
      )}
      aria-label={`${label}: ${count}`}
    >
      <span className="text-xs font-medium text-muted-foreground">
        {label}
      </span>
      <div className="flex items-baseline gap-2">
        <span
          data-testid={`${testId}-count`}
          className={cn("text-2xl font-bold tabular-nums", colorText)}
        >
          {count}
        </span>
        <span
          data-testid={`${testId}-pct`}
          className="text-xs text-muted-foreground"
        >
          ({pct}%)
        </span>
      </div>
    </div>
  );
}

export default SummaryStrip;
