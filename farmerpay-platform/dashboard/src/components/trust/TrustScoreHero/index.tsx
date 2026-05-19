"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/primitives/Skeleton";
import { CountUp } from "./CountUp";

// ─── Types ──────────────────────────────────────────────────────

export type Decision = "SANCTION" | "RECONSIDER" | "REJECT";

export interface TrustScoreHeroProps {
  persona: "banker";
  /** 0–1000. Pass undefined/null to show skeleton. */
  score?: number | null;
  decision?: Decision;
  previousScore?: number;
  /** ISO date string — when this score was computed */
  asOf: string;
  /** If true, plays 320ms count-up from 0 */
  isFreshCompute?: boolean;
  /** Callback when "View evidence" CTA is clicked */
  onViewEvidence: () => void;
}

// ─── Decision pill config ───────────────────────────────────────

const DECISION_STYLES: Record<Decision, string> = {
  SANCTION: "bg-decision-sanction text-decision-sanction-fg",
  RECONSIDER: "bg-decision-reconsider text-decision-reconsider-fg",
  REJECT: "bg-decision-reject text-decision-reject-fg",
};

const DECISION_LABELS: Record<Decision, string> = {
  SANCTION: "Sanction",
  RECONSIDER: "Reconsider",
  REJECT: "Reject",
};

// ─── Delta helpers ──────────────────────────────────────────────

function buildDelta(score: number, previousScore?: number) {
  if (previousScore == null) return null;

  const diff = score - previousScore;

  if (diff > 0) {
    return {
      arrow: "\u25B2", // ▲
      sign: "+",
      label: `\u25B2 +${diff} vs last month (${previousScore} \u2192 ${score})`,
      colorClass: "text-brand-primary-700",
    };
  }
  if (diff < 0) {
    return {
      arrow: "\u25BC", // ▼
      sign: "",
      label: `\u25BC ${diff} vs last month (${previousScore} \u2192 ${score})`,
      colorClass: "text-decision-reject",
    };
  }
  return {
    arrow: "\u2022", // •
    sign: "",
    label: `\u2022 0 vs last month (${previousScore} \u2192 ${score})`,
    colorClass: "text-muted-foreground",
  };
}

function formatDateTime(iso: string): string {
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "—";
    return d.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

// ─── Component ──────────────────────────────────────────────────

export function TrustScoreHero({
  score,
  decision,
  previousScore,
  asOf,
  isFreshCompute = false,
  onViewEvidence,
}: TrustScoreHeroProps) {
  const hasScore = score != null && score > 0;
  const delta = hasScore ? buildDelta(score!, previousScore) : null;

  // Build aria-label per spec §1.3
  const ariaLabel = hasScore
    ? `TRUST score ${score} out of 1000. Decision: ${DECISION_LABELS[decision!] ?? decision}.`
    : "TRUST score loading.";

  const tooltipText = hasScore
    ? `Computed ${formatDateTime(asOf)}`
    : undefined;

  // ─── Loading / error: show skeleton, never "0 / 1000" ─────

  if (!hasScore) {
    return (
      <div
        data-testid="trust-score-hero"
        className="flex flex-col items-center justify-center gap-4 p-6"
        aria-label="TRUST score loading."
      >
        <Skeleton.Score data-testid="skeleton-score" />
        <p className="text-sm text-muted-foreground">
          Score unavailable
        </p>
      </div>
    );
  }

  return (
    <div
      data-testid="trust-score-hero"
      className="group/hero relative flex flex-col items-center justify-center gap-3 p-6"
      aria-label={ariaLabel}
      title={tooltipText}
    >
      {/* ─── Score number ────────────────────────────────── */}
      <div
        role="status"
        aria-live="polite"
        className="flex items-baseline gap-1"
      >
        <CountUp
          value={score!}
          animate={isFreshCompute}
          duration={320}
          className="text-6xl font-bold tabular-nums tracking-tight text-foreground"
        />
      </div>

      <span className="text-sm text-muted-foreground">/ 1000</span>

      {/* ─── Decision pill ───────────────────────────────── */}
      {decision && (
        <span
          data-testid="decision-pill"
          className={cn(
            "inline-flex items-center rounded-full px-4 py-1.5 text-sm font-semibold",
            DECISION_STYLES[decision],
          )}
        >
          {DECISION_LABELS[decision]}
        </span>
      )}

      {/* ─── Delta chip ──────────────────────────────────── */}
      {delta && (
        <span
          data-testid="delta-chip"
          className={cn("text-xs font-medium", delta.colorClass)}
        >
          {delta.label}
        </span>
      )}

      {/* ─── Computed date ───────────────────────────────── */}
      <span className="text-xs text-muted-foreground" data-testid="computed-date">
        Computed: {formatDateTime(asOf)}
      </span>

      {/* ─── View evidence CTA ───────────────────────────── */}
      <button
        type="button"
        data-testid="view-evidence-cta"
        onClick={onViewEvidence}
        className="mt-1 text-xs font-medium text-brand-primary-700 underline underline-offset-2 transition-opacity hover:opacity-80"
      >
        View evidence
      </button>

      {/* ─── Hover tooltip (120ms fade) ──────────────────── */}
      {tooltipText && (
        <div
          role="tooltip"
          className="pointer-events-none absolute -top-10 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-neutral-900 px-3 py-1.5 text-xs text-white opacity-0 transition-opacity duration-[120ms] group-hover/hero:opacity-100"
        >
          {tooltipText}
        </div>
      )}
    </div>
  );
}

export default TrustScoreHero;
