"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

// ─── Types ──────────────────────────────────────────────────────

export type EvidenceSource =
  | "QUESTIONNAIRE"
  | "AA"
  | "CIBIL"
  | "SATHI"
  | "SYSTEM"
  | "EXTERNAL";

export interface SubFeature {
  featureCode: string;
  featureName: string;
  /** Band score 1–5 */
  band: 1 | 2 | 3 | 4 | 5;
  bandLabel: string;
  source: EvidenceSource;
}

export interface BandLadderProps {
  subFeatures: SubFeature[];
  className?: string;
}

// ─── Source chip config ─────────────────────────────────────────

const SOURCE_STYLES: Record<EvidenceSource, string> = {
  QUESTIONNAIRE: "bg-blue-100 text-blue-700",
  AA: "bg-brand-primary-100 text-brand-primary-700",
  CIBIL: "bg-purple-100 text-purple-700",
  SATHI: "bg-amber-100 text-amber-700",
  SYSTEM: "bg-neutral-200 text-neutral-700",
  EXTERNAL: "bg-pink-100 text-pink-700",
};

// ─── 5-dot indicator ────────────────────────────────────────────

function BandDots({ band, max = 5 }: { band: number; max?: number }) {
  return (
    <span
      className="inline-flex gap-0.5"
      role="img"
      aria-label={`${band} of ${max}`}
    >
      {Array.from({ length: max }).map((_, i) => (
        <span
          key={i}
          className={cn(
            "inline-block size-2 rounded-full",
            i < band ? "bg-brand-primary-500" : "bg-neutral-200",
          )}
        />
      ))}
    </span>
  );
}

// ─── Component ──────────────────────────────────────────────────

export function BandLadder({ subFeatures, className }: BandLadderProps) {
  if (subFeatures.length === 0) {
    return (
      <p
        data-testid="band-ladder-empty"
        className="py-2 text-xs text-muted-foreground"
      >
        No sub-features available
      </p>
    );
  }

  return (
    <div
      data-testid="band-ladder"
      className={cn("flex flex-col gap-2", className)}
      role="list"
      aria-label="Sub-feature bands"
    >
      {subFeatures.map((sf) => (
        <div
          key={sf.featureCode}
          data-testid={`ladder-row-${sf.featureCode}`}
          className="flex items-center gap-3 rounded-md bg-muted/50 px-3 py-2 text-xs"
          role="listitem"
        >
          {/* Feature name */}
          <span className="min-w-[140px] shrink-0 font-medium text-foreground">
            {sf.featureName}
          </span>

          {/* Band dots + label */}
          <BandDots band={sf.band} />
          <span className="text-muted-foreground">
            {sf.bandLabel} ({sf.band} / 5)
          </span>

          {/* Source chip */}
          <span
            data-testid={`source-chip-${sf.featureCode}`}
            className={cn(
              "ml-auto inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium",
              SOURCE_STYLES[sf.source] ?? SOURCE_STYLES.SYSTEM,
            )}
          >
            {sf.source}
          </span>
        </div>
      ))}
    </div>
  );
}

export default BandLadder;
