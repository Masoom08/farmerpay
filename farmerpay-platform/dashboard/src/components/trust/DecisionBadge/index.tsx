"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

// ─── Constants (matching B3 thresholds) ─────────────────────────

const THRESHOLDS = {
  SANCTION: 600,
  RECONSIDER: 500,
} as const;

// ─── Types ──────────────────────────────────────────────────────

export type Decision = "SANCTION" | "RECONSIDER" | "REJECT";
export type BadgeSize = "sm" | "md" | "lg";

export interface DecisionBadgeProps {
  decision: Decision;
  /** Score (0–1000) shown in the tooltip */
  score?: number;
  size?: BadgeSize;
  className?: string;
}

// ─── Config ─────────────────────────────────────────────────────

const DECISION_CONFIG: Record<
  Decision,
  { label: string; className: string; thresholdText: string }
> = {
  SANCTION: {
    label: "Sanction",
    className: "bg-decision-sanction text-decision-sanction-fg",
    thresholdText: `Threshold for Sanction: above ${THRESHOLDS.SANCTION}`,
  },
  RECONSIDER: {
    label: "Reconsider",
    className: "bg-decision-reconsider text-decision-reconsider-fg",
    thresholdText: `Threshold for Reconsider: ${THRESHOLDS.RECONSIDER}\u2013${THRESHOLDS.SANCTION}`,
  },
  REJECT: {
    label: "Reject",
    className: "bg-decision-reject text-decision-reject-fg",
    thresholdText: `Threshold for Reject: below ${THRESHOLDS.RECONSIDER}`,
  },
};

const SIZE_CLASSES: Record<BadgeSize, string> = {
  sm: "h-5 px-2 text-xs",
  md: "h-6 px-3 text-xs",
  lg: "h-8 px-4 text-sm",
};

// ─── Component ──────────────────────────────────────────────────

/**
 * Decision badge with size variants and tooltip.
 *
 * Tooltip text per spec §1.3:
 *   "Score {score} · Threshold for Sanction: above 600"
 */
export function DecisionBadge({
  decision,
  score,
  size = "md",
  className,
}: DecisionBadgeProps) {
  const config = DECISION_CONFIG[decision];

  const tooltipContent =
    score != null
      ? `Score ${score} \u00B7 ${config.thresholdText}`
      : config.thresholdText;

  return (
    <span
      data-testid="decision-badge"
      className={cn(
        "group/badge relative inline-flex shrink-0 items-center justify-center rounded-full font-semibold whitespace-nowrap",
        config.className,
        SIZE_CLASSES[size],
        className,
      )}
      aria-label={`Decision: ${config.label}`}
    >
      {config.label}

      {/* Tooltip — 120ms fade */}
      <span
        role="tooltip"
        className="pointer-events-none absolute -top-9 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-md bg-neutral-900 px-3 py-1.5 text-xs font-normal text-white opacity-0 transition-opacity duration-[120ms] group-hover/badge:opacity-100"
        data-testid="decision-tooltip"
      >
        {tooltipContent}
      </span>
    </span>
  );
}

export default DecisionBadge;
