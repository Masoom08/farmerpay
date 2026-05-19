"use client";

import { useCallback, useRef } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import {
  PillarRadialCard,
  type PillarCode,
} from "@/components/trust/PillarRadialCard";
import type { SubFeature } from "@/components/trust/BandLadder";

// ─── Types ──────────────────────────────────────────────────────

export interface PillarData {
  code: PillarCode;
  name: string;
  score: number;
  weightPct: number;
  confidence: "HIGH" | "MEDIUM" | "LOW";
  subFeatures: SubFeature[];
}

export interface PillarsPanelProps {
  pillars: PillarData[];
}

// ─── Component ──────────────────────────────────────────────────

/**
 * Pillars tab content — 6 expandable cards in 2 rows × 3 cols.
 *
 * Expansion state is tracked in the URL via `?expand=P1,P3` so that
 * shareable links preserve the open cards.
 */
export function PillarsPanel({ pillars }: PillarsPanelProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // Parse expanded set from URL
  const expandParam = searchParams.get("expand") ?? "";
  const expandedSet = new Set(
    expandParam
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  );

  // Refs for keyboard shortcut targets (1–6)
  const focusRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const getFocusRef = useCallback(
    (code: PillarCode): React.RefObject<HTMLButtonElement | null> => {
      return {
        get current() {
          return focusRefs.current[code] ?? null;
        },
        set current(el: HTMLButtonElement | null) {
          focusRefs.current[code] = el;
        },
      };
    },
    [],
  );

  const togglePillar = useCallback(
    (code: PillarCode) => {
      const next = new Set(expandedSet);
      if (next.has(code)) {
        next.delete(code);
      } else {
        next.add(code);
      }
      const params = new URLSearchParams(searchParams.toString());
      const expandStr = Array.from(next).join(",");
      if (expandStr) {
        params.set("expand", expandStr);
      } else {
        params.delete("expand");
      }
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [expandedSet, searchParams, router, pathname],
  );

  return (
    <div
      data-testid="pillars-panel"
      className="grid grid-cols-3 gap-4"
    >
      {pillars.map((p) => (
        <PillarRadialCard
          key={p.code}
          code={p.code}
          name={p.name}
          score={p.score}
          weightPct={p.weightPct}
          confidence={p.confidence}
          expanded={expandedSet.has(p.code)}
          onToggle={() => togglePillar(p.code)}
          subFeatures={p.subFeatures}
          focusRef={getFocusRef(p.code)}
        />
      ))}
    </div>
  );
}

export default PillarsPanel;
