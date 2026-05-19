"use client";

import * as React from "react";
import { useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { BandLadder, type SubFeature } from "@/components/trust/BandLadder";

// ─── Types ──────────────────────────────────────────────────────

export type PillarCode = "P1" | "P2" | "P3" | "P4" | "P5" | "P6";
export type Confidence = "HIGH" | "MEDIUM" | "LOW";

export interface PillarRadialCardProps {
  code: PillarCode;
  name: string;
  /** 0–100 */
  score: number;
  /** 0–100 */
  weightPct: number;
  confidence: Confidence;
  expanded: boolean;
  onToggle: () => void;
  subFeatures: SubFeature[];
  /** Ref target for keyboard shortcut 1–6 */
  focusRef?: React.Ref<HTMLButtonElement>;
  className?: string;
}

// ─── Pillar token colours ───────────────────────────────────────

const PILLAR_STROKE_COLOURS: Record<PillarCode, string> = {
  P1: "var(--pillar-p1, #6366F1)",
  P2: "var(--pillar-p2, #8B5CF6)",
  P3: "var(--pillar-p3, #EC4899)",
  P4: "var(--pillar-p4, #F59E0B)",
  P5: "var(--pillar-p5, #10B981)",
  P6: "var(--pillar-p6, #3B82F6)",
};

const CONFIDENCE_BADGE: Record<Confidence, { label: string; className: string }> = {
  HIGH: { label: "High", className: "bg-brand-primary-100 text-brand-primary-700" },
  MEDIUM: { label: "Medium", className: "bg-blue-100 text-blue-700" },
  LOW: { label: "Low", className: "bg-brand-accent-amber/20 text-neutral-800" },
};

// ─── SVG Radial Progress Ring ───────────────────────────────────

const RING_SIZE = 56;
const RING_STROKE = 5;
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

function RadialRing({
  score,
  strokeColour,
}: {
  score: number;
  strokeColour: string;
}) {
  const clamped = Math.min(100, Math.max(0, score));
  const offset = RING_CIRCUMFERENCE * (1 - clamped / 100);

  return (
    <svg
      width={RING_SIZE}
      height={RING_SIZE}
      viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`}
      className="shrink-0 -rotate-90"
      aria-hidden="true"
      data-testid="radial-ring"
    >
      {/* Background track */}
      <circle
        cx={RING_SIZE / 2}
        cy={RING_SIZE / 2}
        r={RING_RADIUS}
        fill="none"
        stroke="var(--neutral-200, #E5E5E5)"
        strokeWidth={RING_STROKE}
      />
      {/* Progress arc */}
      <circle
        cx={RING_SIZE / 2}
        cy={RING_SIZE / 2}
        r={RING_RADIUS}
        fill="none"
        stroke={strokeColour}
        strokeWidth={RING_STROKE}
        strokeDasharray={RING_CIRCUMFERENCE}
        strokeDashoffset={offset}
        strokeLinecap="round"
        className="transition-[stroke-dashoffset] duration-300 ease-out motion-reduce:transition-none"
      />
    </svg>
  );
}

// ─── Component ──────────────────────────────────────────────────

export function PillarRadialCard({
  code,
  name,
  score,
  weightPct,
  confidence,
  expanded,
  onToggle,
  subFeatures,
  focusRef,
  className,
}: PillarRadialCardProps) {
  const internalRef = useRef<HTMLButtonElement>(null);
  const confBadge = CONFIDENCE_BADGE[confidence];

  // Merge focusRef with internal ref
  useEffect(() => {
    if (focusRef && typeof focusRef === "object" && "current" in focusRef) {
      (focusRef as React.MutableRefObject<HTMLButtonElement | null>).current =
        internalRef.current;
    }
  });

  return (
    <Card
      data-testid={`pillar-card-${code}`}
      className={cn(
        "overflow-hidden transition-shadow duration-200",
        expanded && "ring-2 ring-brand-primary-500/30",
        className,
      )}
    >
      {/* ─── Header button (always visible) ────────────── */}
      <button
        ref={internalRef}
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        aria-controls={`pillar-detail-${code}`}
        data-testid={`pillar-toggle-${code}`}
        className="flex w-full items-center gap-4 px-4 py-3 text-left transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {/* Radial ring */}
        <RadialRing
          score={score}
          strokeColour={PILLAR_STROKE_COLOURS[code]}
        />

        {/* Text block */}
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="text-sm font-semibold text-foreground">
            {code} &middot; {name}
          </span>
          <span className="text-xs text-muted-foreground">
            Weight in TRUST &middot; {weightPct}%
          </span>
          <span className="text-xs tabular-nums text-foreground">
            {score} / 100
          </span>
        </div>

        {/* Confidence badge */}
        <span
          data-testid={`confidence-badge-${code}`}
          className={cn(
            "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium",
            confBadge.className,
          )}
        >
          {confBadge.label}
        </span>

        {/* Chevron */}
        <ChevronDown
          className={cn(
            "size-4 shrink-0 text-muted-foreground transition-transform duration-200 motion-reduce:transition-none",
            expanded && "rotate-180",
          )}
          aria-hidden="true"
        />
      </button>

      {/* ─── Expandable detail (BandLadder) ────────────── */}
      <div
        id={`pillar-detail-${code}`}
        data-testid={`pillar-detail-${code}`}
        className={cn(
          "grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none",
          expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        )}
      >
        <div className="overflow-hidden">
          <CardContent className="border-t border-border px-4 pb-4 pt-3">
            <BandLadder subFeatures={subFeatures} />
          </CardContent>
        </div>
      </div>
    </Card>
  );
}

export default PillarRadialCard;
