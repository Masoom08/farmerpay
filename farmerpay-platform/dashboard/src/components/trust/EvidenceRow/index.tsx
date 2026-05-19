"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

// ─── Types ──────────────────────────────────────────────────────

export type EvidenceSource =
  | "AA"
  | "CIBIL"
  | "ROOTS"
  | "POP"
  | "SATHI"
  | "FARMER_DECLARED"
  | "PMFBY";

export interface Evidence {
  evidenceUuid: string;
  pillarCode: string;
  featureName: string;
  band: 1 | 2 | 3 | 4 | 5;
  source: EvidenceSource;
  fetchedAt: string;
  rawRef: string;
}

export interface EvidenceRowProps {
  evidence: Evidence;
  onViewRaw: (evidenceUuid: string) => void;
}

// ─── Source chip colours ────────────────────────────────────────

const SOURCE_STYLES: Record<string, string> = {
  AA: "bg-brand-primary-100 text-brand-primary-700",
  CIBIL: "bg-purple-100 text-purple-700",
  ROOTS: "bg-emerald-100 text-emerald-700",
  POP: "bg-orange-100 text-orange-700",
  SATHI: "bg-amber-100 text-amber-700",
  FARMER_DECLARED: "bg-blue-100 text-blue-700",
  PMFBY: "bg-teal-100 text-teal-700",
};

// ─── Helpers ────────────────────────────────────────────────────

function formatDdMmm(iso: string): string {
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "—";
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  } catch {
    return "—";
  }
}

// ─── Component ──────────────────────────────────────────────────

/**
 * Single evidence row per spec §1.3:
 *   "{feature} · Band {n}/5 · {sourceChip} · Fetched {date} · [view raw]"
 */
export function EvidenceRow({ evidence, onViewRaw }: EvidenceRowProps) {
  const { evidenceUuid, featureName, band, source, fetchedAt } = evidence;

  return (
    <div
      data-testid={`evidence-row-${evidenceUuid}`}
      className="flex items-center gap-3 rounded-md bg-muted/40 px-3 py-2 text-xs"
      role="listitem"
    >
      {/* Feature name */}
      <span className="min-w-[160px] shrink-0 font-medium text-foreground">
        {featureName}
      </span>

      {/* Band */}
      <span className="text-muted-foreground">
        Band {band}/5
      </span>

      {/* Source chip */}
      <span
        data-testid={`source-chip-${evidenceUuid}`}
        className={cn(
          "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium",
          SOURCE_STYLES[source] ?? "bg-neutral-200 text-neutral-700",
        )}
      >
        {source}
      </span>

      {/* Fetched date */}
      <span className="text-muted-foreground">
        Fetched {formatDdMmm(fetchedAt)}
      </span>

      {/* View raw button */}
      <button
        type="button"
        data-testid={`view-raw-${evidenceUuid}`}
        onClick={() => onViewRaw(evidenceUuid)}
        className="ml-auto text-brand-primary-700 underline underline-offset-2 transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        view raw
      </button>
    </div>
  );
}

export default EvidenceRow;
