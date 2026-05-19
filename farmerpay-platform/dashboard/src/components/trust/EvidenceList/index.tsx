"use client";

import * as React from "react";
import { useState, useMemo, useCallback } from "react";
import { cn } from "@/lib/utils";
import {
  EvidenceRow,
  type Evidence,
  type EvidenceSource,
} from "@/components/trust/EvidenceRow";

// ─── Types ──────────────────────────────────────────────────────

export interface EvidenceListProps {
  evidence: Evidence[];
  filter: EvidenceSource[];
  onFilterChange: (sources: EvidenceSource[]) => void;
  /** Called when "view raw" is clicked — opens the raw dialog */
  onViewRaw?: (evidenceUuid: string) => void;
  className?: string;
}

// ─── All known sources ──────────────────────────────────────────

const ALL_SOURCES: EvidenceSource[] = [
  "AA",
  "CIBIL",
  "ROOTS",
  "POP",
  "SATHI",
  "FARMER_DECLARED",
  "PMFBY",
];

const SOURCE_CHIP_STYLES: Record<string, { active: string; inactive: string }> = {
  AA: { active: "bg-brand-primary-500 text-white", inactive: "bg-brand-primary-100 text-brand-primary-700" },
  CIBIL: { active: "bg-purple-600 text-white", inactive: "bg-purple-100 text-purple-700" },
  ROOTS: { active: "bg-emerald-600 text-white", inactive: "bg-emerald-100 text-emerald-700" },
  POP: { active: "bg-orange-600 text-white", inactive: "bg-orange-100 text-orange-700" },
  SATHI: { active: "bg-amber-600 text-white", inactive: "bg-amber-100 text-amber-700" },
  FARMER_DECLARED: { active: "bg-blue-600 text-white", inactive: "bg-blue-100 text-blue-700" },
  PMFBY: { active: "bg-teal-600 text-white", inactive: "bg-teal-100 text-teal-700" },
};

// ─── Pillar labels ──────────────────────────────────────────────

const PILLAR_LABELS: Record<string, string> = {
  P1: "P1 \u00B7 Personal",
  P2: "P2 \u00B7 Farm Details",
  P3: "P3 \u00B7 Financial",
  P4: "P4 \u00B7 Repayment",
  P5: "P5 \u00B7 Collateral",
  P6: "P6 \u00B7 Network",
};

// ─── Component ──────────────────────────────────────────────────

export function EvidenceList({
  evidence,
  filter,
  onFilterChange,
  onViewRaw,
  className,
}: EvidenceListProps) {
  // Determine which sources exist in the data
  const availableSources = useMemo(() => {
    const set = new Set(evidence.map((e) => e.source));
    return ALL_SOURCES.filter((s) => set.has(s));
  }, [evidence]);

  const filterSet = useMemo(() => new Set(filter), [filter]);

  // Filter evidence
  const filtered = useMemo(
    () =>
      filterSet.size === 0
        ? evidence
        : evidence.filter((e) => filterSet.has(e.source)),
    [evidence, filterSet],
  );

  // Group by pillar
  const grouped = useMemo(() => {
    const map = new Map<string, Evidence[]>();
    for (const e of filtered) {
      const key = e.pillarCode;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(e);
    }
    return map;
  }, [filtered]);

  // All pillar codes from original evidence (for stable ordering)
  const allPillarCodes = useMemo(() => {
    const codes: string[] = [];
    const seen = new Set<string>();
    for (const e of evidence) {
      if (!seen.has(e.pillarCode)) {
        seen.add(e.pillarCode);
        codes.push(e.pillarCode);
      }
    }
    return codes.sort();
  }, [evidence]);

  const toggleSource = useCallback(
    (source: EvidenceSource) => {
      const next = new Set(filter);
      if (next.has(source)) {
        next.delete(source);
      } else {
        next.add(source);
      }
      onFilterChange(Array.from(next));
    },
    [filter, onFilterChange],
  );

  const handleViewRaw = useCallback(
    (uuid: string) => {
      onViewRaw?.(uuid);
    },
    [onViewRaw],
  );

  return (
    <div data-testid="evidence-list" className={cn("flex flex-col gap-4", className)}>
      {/* ─── Source filter chips ──────────────────────── */}
      <div
        data-testid="source-filters"
        className="flex flex-wrap items-center gap-2"
        role="group"
        aria-label="Filter by source"
      >
        <span className="text-xs font-medium text-muted-foreground mr-1">
          Filter:
        </span>
        {availableSources.map((source) => {
          const isActive = filterSet.has(source);
          const styles = SOURCE_CHIP_STYLES[source] ?? {
            active: "bg-neutral-600 text-white",
            inactive: "bg-neutral-200 text-neutral-700",
          };

          return (
            <button
              key={source}
              type="button"
              data-testid={`filter-chip-${source}`}
              aria-pressed={isActive}
              onClick={() => toggleSource(source)}
              className={cn(
                "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                isActive ? styles.active : styles.inactive,
              )}
            >
              {source}
            </button>
          );
        })}
      </div>

      {/* ─── Grouped evidence rows ───────────────────── */}
      <div className="flex flex-col gap-6" role="list" aria-label="Evidence items">
        {allPillarCodes.map((pillarCode) => {
          const rows = grouped.get(pillarCode);
          if (!rows || rows.length === 0) return null;

          return (
            <div
              key={pillarCode}
              data-testid={`evidence-group-${pillarCode}`}
              id={`evidence-pillar-${pillarCode}`}
            >
              {/* Pillar heading (anchor for jump-to-pillar) */}
              <h3 className="mb-2 text-sm font-semibold text-foreground">
                {PILLAR_LABELS[pillarCode] ?? pillarCode}
              </h3>

              <div className="flex flex-col gap-1.5">
                {rows.map((e) => (
                  <EvidenceRow
                    key={e.evidenceUuid}
                    evidence={e}
                    onViewRaw={handleViewRaw}
                  />
                ))}
              </div>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <p
            data-testid="evidence-empty"
            className="py-8 text-center text-sm text-muted-foreground"
          >
            No evidence matches the selected filters.
          </p>
        )}
      </div>
    </div>
  );
}

export default EvidenceList;
