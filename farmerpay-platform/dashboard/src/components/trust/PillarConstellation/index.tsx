"use client";

import * as React from "react";
import { useCallback, useState } from "react";
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
} from "recharts";
import { cn } from "@/lib/utils";

// ─── Types ──────────────────────────────────────────────────────

export type PillarCode = "P1" | "P2" | "P3" | "P4" | "P5" | "P6";
export type Confidence = "HIGH" | "MEDIUM" | "LOW";

export interface Pillar {
  code: PillarCode;
  name: string;
  score: number;
  weight: number;
  confidence: Confidence;
}

export interface PillarConstellationProps {
  pillars: Pillar[];
  onPillarClick: (code: PillarCode) => void;
  /** Pillar codes that are missing data — rendered greyed-out */
  missingPillars?: PillarCode[];
  /** Pillar codes with LOW confidence — dashed ring variant */
  lowConfidenceOnly?: PillarCode[];
  className?: string;
}

// ─── Constants ──────────────────────────────────────────────────

/** i18n axis labels per spec */
const PILLAR_LABELS: Record<PillarCode, string> = {
  P1: "P1 \u00B7 Identity & Household",
  P2: "P2 \u00B7 Income",
  P3: "P3 \u00B7 Financial",
  P4: "P4 \u00B7 Repayment",
  P5: "P5 \u00B7 Collateral",
  P6: "P6 \u00B7 Network",
};

/** Token colours for each pillar dot (from globals.css) */
const PILLAR_DOT_COLOURS: Record<PillarCode, string> = {
  P1: "var(--pillar-p1, #6366F1)",
  P2: "var(--pillar-p2, #8B5CF6)",
  P3: "var(--pillar-p3, #EC4899)",
  P4: "var(--pillar-p4, #F59E0B)",
  P5: "var(--pillar-p5, #10B981)",
  P6: "var(--pillar-p6, #3B82F6)",
};

const MISSING_COLOUR = "#D1D5DB"; // neutral-300
const FILL_COLOUR = "#22C55E";     // brand-primary-500
const FILL_OPACITY = 0.25;
const STROKE_COLOUR = "#15803D";   // brand-primary-700

// ─── Component ──────────────────────────────────────────────────

export function PillarConstellation({
  pillars,
  onPillarClick,
  missingPillars = [],
  lowConfidenceOnly = [],
  className,
}: PillarConstellationProps) {
  const [hoveredCode, setHoveredCode] = useState<PillarCode | null>(null);

  const missingSet = new Set(missingPillars);
  const lowConfSet = new Set(lowConfidenceOnly);

  // Build Recharts data array (must have `subject` for PolarAngleAxis)
  const chartData = pillars.map((p) => ({
    subject: PILLAR_LABELS[p.code] ?? p.code,
    code: p.code,
    score: missingSet.has(p.code) ? 0 : p.score,
    fullMark: 100,
    // Extra fields for tooltip
    name: p.name,
    weight: p.weight,
    isMissing: missingSet.has(p.code),
    isLowConf: lowConfSet.has(p.code),
  }));

  const handleClick = useCallback(
    (data: { code?: PillarCode } | undefined) => {
      if (data?.code) onPillarClick(data.code);
    },
    [onPillarClick],
  );

  return (
    <div
      data-testid="pillar-constellation"
      className={cn("flex flex-col gap-4", className)}
    >
      {/* ─── Radar chart ───────────────────────────────── */}
      <div className="h-[280px] w-full" data-testid="radar-chart-container">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart
            data={chartData}
            cx="50%"
            cy="50%"
            outerRadius="72%"
          >
            <PolarGrid stroke="#E5E7EB" />
            <PolarAngleAxis
              dataKey="subject"
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              tick={((props: any) => (
                <CustomTick
                  {...props}
                  chartData={chartData}
                  missingSet={missingSet}
                  lowConfSet={lowConfSet}
                  onPillarClick={onPillarClick}
                  hoveredCode={hoveredCode}
                  setHoveredCode={setHoveredCode}
                />
              )) as never}
            />
            <Radar
              name="Score"
              dataKey="score"
              stroke={STROKE_COLOUR}
              fill={FILL_COLOUR}
              fillOpacity={FILL_OPACITY}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              dot={((props: any) => (
                <PillarDot
                  {...props}
                  chartData={chartData}
                  missingSet={missingSet}
                  lowConfSet={lowConfSet}
                  hoveredCode={hoveredCode}
                  setHoveredCode={setHoveredCode}
                  onPillarClick={onPillarClick}
                />
              )) as never}
              activeDot={false}
            />
            <RechartsTooltip
              content={({ active, payload }) => {
                if (!active || !payload?.[0]) return null;
                const d = payload[0].payload;
                if (d.isMissing) {
                  return (
                    <div className="rounded-md bg-neutral-900 px-3 py-2 text-xs text-white shadow-lg">
                      {d.name} &middot; Missing data
                    </div>
                  );
                }
                return (
                  <div
                    className="rounded-md bg-neutral-900 px-3 py-2 text-xs text-white shadow-lg"
                    data-testid="pillar-tooltip"
                  >
                    {d.name} &middot; {d.score}/100 &middot; weight{" "}
                    {Math.round(d.weight * 100)}%
                    {d.isLowConf && (
                      <span className="ml-1 text-brand-accent-amber">
                        (low confidence)
                      </span>
                    )}
                  </div>
                );
              }}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      {/* ─── sr-only accessible list (spec §1.6) ────── */}
      <ul className="sr-only" data-testid="sr-pillar-list" aria-label="Pillar scores">
        {pillars.map((p) => (
          <li key={p.code} data-testid={`sr-pillar-${p.code}`}>
            {PILLAR_LABELS[p.code]}: {missingSet.has(p.code) ? "missing" : `${p.score} out of 100`},
            weight {Math.round(p.weight * 100)}%
          </li>
        ))}
      </ul>
    </div>
  );
}

export default PillarConstellation;

// ─── Custom Tick (axis label) ───────────────────────────────────

interface PolarAngleAxisTickProps {
  x: number;
  y: number;
  payload: { value: string; index: number };
  index: number;
  [key: string]: unknown;
}

interface CustomTickProps extends PolarAngleAxisTickProps {
  chartData: Array<{ code: PillarCode; isMissing: boolean; isLowConf: boolean }>;
  missingSet: Set<PillarCode>;
  lowConfSet: Set<PillarCode>;
  onPillarClick: (code: PillarCode) => void;
  hoveredCode: PillarCode | null;
  setHoveredCode: (code: PillarCode | null) => void;
}

function CustomTick({
  x,
  y,
  payload,
  index,
  chartData,
  missingSet,
  onPillarClick,
  hoveredCode,
  setHoveredCode,
}: CustomTickProps) {
  const item = chartData[index];
  if (!item) return null;

  const isMissing = missingSet.has(item.code);
  const isHovered = hoveredCode === item.code;

  return (
    <g
      transform={`translate(${x},${y})`}
      className="cursor-pointer"
      onClick={() => onPillarClick(item.code)}
      onMouseEnter={() => setHoveredCode(item.code)}
      onMouseLeave={() => setHoveredCode(null)}
      data-testid={`tick-${item.code}`}
    >
      <text
        textAnchor="middle"
        dy="0.35em"
        className={cn(
          "text-[10px] transition-all duration-[120ms]",
          isMissing ? "fill-neutral-400" : "fill-neutral-800",
          isHovered && "font-semibold",
        )}
      >
        {payload.value}
      </text>
    </g>
  );
}

// ─── Custom Dot (pillar point) ──────────────────────────────────

interface RadarDotProps {
  cx: number;
  cy: number;
  key?: string;
  index: number;
  [key: string]: unknown;
}

interface PillarDotProps extends RadarDotProps {
  chartData: Array<{ code: PillarCode; isMissing: boolean; isLowConf: boolean }>;
  missingSet: Set<PillarCode>;
  lowConfSet: Set<PillarCode>;
  hoveredCode: PillarCode | null;
  setHoveredCode: (code: PillarCode | null) => void;
  onPillarClick: (code: PillarCode) => void;
}

function PillarDot({
  cx,
  cy,
  index,
  chartData,
  missingSet,
  lowConfSet,
  hoveredCode,
  setHoveredCode,
  onPillarClick,
}: PillarDotProps) {
  const item = chartData[index];
  if (!item || cx == null || cy == null) return null;

  const isMissing = missingSet.has(item.code);
  const isLowConf = lowConfSet.has(item.code);
  const isHovered = hoveredCode === item.code;

  const dotColour = isMissing
    ? MISSING_COLOUR
    : PILLAR_DOT_COLOURS[item.code];

  const radius = isHovered ? 7 : 5;

  return (
    <g
      className="cursor-pointer"
      onClick={() => onPillarClick(item.code)}
      onMouseEnter={() => setHoveredCode(item.code)}
      onMouseLeave={() => setHoveredCode(null)}
      data-testid={`dot-${item.code}`}
    >
      {/* Halo on hover — radial gradient, 120ms transition */}
      {isHovered && (
        <circle
          cx={cx}
          cy={cy}
          r={14}
          fill={dotColour}
          opacity={0.15}
          className="transition-all duration-[120ms]"
        />
      )}

      {/* Main dot */}
      <circle
        cx={cx}
        cy={cy}
        r={radius}
        fill={dotColour}
        stroke={isLowConf ? dotColour : "none"}
        strokeWidth={isLowConf ? 2 : 0}
        strokeDasharray={isLowConf ? "3 2" : "none"}
        className="transition-all duration-[120ms]"
      />
    </g>
  );
}
