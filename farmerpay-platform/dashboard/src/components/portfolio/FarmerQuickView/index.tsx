"use client";

import * as React from "react";
import { useState, useEffect, useCallback, useRef } from "react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/primitives/Skeleton";
import { Button } from "@/components/primitives";
import { apiGet } from "@/lib/api";
import { MiniPillarChart, type MiniPillar } from "./MiniPillarChart";

// ─── Re-exports ─────────────────────────────────────────────────

export { MiniPillarChart } from "./MiniPillarChart";
export type { MiniPillar, MiniPillarChartProps } from "./MiniPillarChart";

// ─── Types ──────────────────────────────────────────────────────

export interface FarmerQuickViewProps {
  farmerId: number | null;
  onClose: () => void;
  onOpenFull: (id: number) => void;
  className?: string;
}

interface SnapshotData {
  farmerName: string;
  village: string;
  score: number;
  decision: string;
  computedAt: string;
  pillars: MiniPillar[];
}

// ─── Decision styles ────────────────────────────────────────────

const DECISION_STYLES: Record<string, { bg: string; text: string }> = {
  SANCTION: { bg: "bg-green-100", text: "text-green-800" },
  RECONSIDER: { bg: "bg-amber-100", text: "text-amber-800" },
  REJECT: { bg: "bg-red-100", text: "text-red-800" },
};

// ─── Component ──────────────────────────────────────────────────

export function FarmerQuickView({
  farmerId,
  onClose,
  onOpenFull,
  className,
}: FarmerQuickViewProps) {
  const [data, setData] = useState<SnapshotData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // ─── Fetch snapshot on farmerId change ──────────────────────
  useEffect(() => {
    if (farmerId == null) {
      setData(null);
      return;
    }

    let cancelled = false;
    async function fetchSnapshot() {
      setLoading(true);
      setError(null);
      try {
        const token = localStorage.getItem("fp_token") ?? "";
        const res = await apiGet(`/trust/farmer/${farmerId}/snapshot`, token);
        if (cancelled) return;

        const snap = res?.data ?? res;
        setData({
          farmerName:
            snap?.farmer?.name ??
            `${snap?.farmer?.firstName ?? ""} ${snap?.farmer?.lastName ?? ""}`.trim() ??
            "Farmer",
          village: snap?.farmer?.village ?? "—",
          score: snap?.score ?? 0,
          decision: snap?.decision ?? "PENDING",
          computedAt: snap?.computedAt ?? "",
          pillars: (snap?.pillars ?? []).map(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (p: any) => ({
              code: p.code,
              name: p.name,
              score: p.score,
            }),
          ),
        });
      } catch (err: unknown) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Failed to load farmer data",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchSnapshot();
    return () => {
      cancelled = true;
    };
  }, [farmerId]);

  // ─── Esc to close ──────────────────────────────────────────
  useEffect(() => {
    if (farmerId == null) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [farmerId, onClose]);

  // ─── Not visible when no farmer selected ────────────────────
  const isOpen = farmerId != null;

  return (
    <div
      data-testid="quick-view-panel"
      ref={panelRef}
      className={cn(
        "fixed right-0 top-0 z-50 flex h-full w-[360px] flex-col border-l bg-card shadow-xl",
        "transition-transform duration-200 ease-out",
        isOpen ? "translate-x-0" : "translate-x-full",
        className,
      )}
      role="complementary"
      aria-label="Farmer quick view"
      aria-hidden={!isOpen}
    >
      {/* ─── Header ────────────────────────────────────── */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <h2 className="text-sm font-semibold text-foreground">
          Quick View
        </h2>
        <button
          type="button"
          data-testid="quick-view-close"
          onClick={onClose}
          aria-label="Close quick view"
          className={cn(
            "inline-flex h-6 w-6 items-center justify-center rounded-md",
            "text-muted-foreground hover:text-foreground",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          )}
        >
          ×
        </button>
      </div>

      {/* ─── Content ───────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {/* Loading skeleton */}
        {loading && (
          <div data-testid="quick-view-loading" className="flex flex-col gap-3">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-8 w-20" />
            <div className="mt-4 flex flex-col gap-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-2 w-full rounded-full" />
              ))}
            </div>
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div data-testid="quick-view-error" role="alert" className="flex flex-col gap-2">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        {/* Data */}
        {!loading && !error && data && (
          <div data-testid="quick-view-content" className="flex flex-col gap-4">
            {/* Farmer info */}
            <div>
              <h3
                data-testid="quick-view-name"
                className="text-base font-semibold text-foreground"
              >
                {data.farmerName}
              </h3>
              <p
                data-testid="quick-view-village"
                className="text-xs text-muted-foreground"
              >
                {data.village}
              </p>
            </div>

            {/* Score + decision */}
            <div className="flex items-center gap-3">
              <span
                data-testid="quick-view-score"
                className="text-2xl font-bold tabular-nums text-foreground"
              >
                {data.score}
              </span>
              <span className="text-xs text-muted-foreground">/ 1000</span>
              <span
                data-testid="quick-view-decision"
                className={cn(
                  "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium",
                  DECISION_STYLES[data.decision]?.bg ?? "bg-neutral-100",
                  DECISION_STYLES[data.decision]?.text ?? "text-neutral-700",
                )}
              >
                {data.decision}
              </span>
            </div>

            {/* Computed date */}
            {data.computedAt && (
              <p
                data-testid="quick-view-date"
                className="text-[10px] text-muted-foreground"
              >
                Computed:{" "}
                {new Date(data.computedAt).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </p>
            )}

            {/* Mini pillar chart */}
            <div>
              <h4 className="mb-2 text-xs font-medium text-muted-foreground">
                Pillar Scores
              </h4>
              <MiniPillarChart pillars={data.pillars} />
            </div>
          </div>
        )}

        {/* No farmer selected */}
        {!loading && !error && !data && isOpen && (
          <p
            data-testid="quick-view-empty"
            className="py-8 text-center text-sm text-muted-foreground"
          >
            Select a farmer to view details.
          </p>
        )}
      </div>

      {/* ─── Footer CTA ───────────────────────────────── */}
      {isOpen && data && !loading && (
        <div className="border-t px-4 py-3">
          <Button
            variant="primary"
            size="sm"
            data-testid="open-full-review-btn"
            onClick={() => onOpenFull(farmerId!)}
            className="w-full"
          >
            Open full review →
          </Button>
        </div>
      )}
    </div>
  );
}

export default FarmerQuickView;
