"use client";

import * as React from "react";
import { useState, useCallback, useRef, useMemo } from "react";
import { cn } from "@/lib/utils";
import { Cell, type HeatmapFarmer } from "./Cell";
import { HeatmapLegend } from "./legend";
import type { StressState } from "@/app/dashboard/portfolio/stressMode";
import { resolveDecision } from "@/app/dashboard/portfolio/stressMode";

// ─── Re-exports ─────────────────────────────────────────────────

export type { HeatmapFarmer } from "./Cell";
export { computeOpacity } from "./Cell";
export { HeatmapLegend } from "./legend";

// ─── Types ──────────────────────────────────────────────────────

export interface PortfolioHeatmapProps {
  farmers: HeatmapFarmer[];
  cellSize?: number; // default 32
  groupBy?: "village" | "none"; // default 'none'; 'village' when > 500
  showLetters?: boolean; // initial toggle state
  /** Stress state from DRISHTI — overrides farmer decisions when active */
  stressState?: StressState | null;
  onSelect: (farmerId: number) => void;
  /** Called on Shift+Enter — navigates to full review */
  onOpenReview?: (farmerId: number) => void;
  className?: string;
}

/**
 * MVP DOM limit documentation:
 * This component renders one <button> per farmer, which is fine up to ~2000 cells.
 * Beyond 2000, consider virtualisation (e.g. react-window grid) or canvas rendering.
 * For the typical portfolio of 200-500 farmers this is well within limits.
 */

// ─── Component ──────────────────────────────────────────────────

export function PortfolioHeatmap({
  farmers,
  cellSize = 32,
  groupBy = "none",
  showLetters: initialShowLetters = false,
  stressState = null,
  onSelect,
  onOpenReview,
  className,
}: PortfolioHeatmapProps) {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [showLetters, setShowLetters] = useState(initialShowLetters);
  const [expandedVillage, setExpandedVillage] = useState<string | null>(null);
  const cellRefs = useRef<Map<number, HTMLButtonElement>>(new Map());
  const gridRef = useRef<HTMLDivElement>(null);

  // ─── Stress-mode: resolve effective decisions ───────────────
  const isStressed = stressState?.active === true;

  const effectiveFarmers = useMemo(() => {
    if (!isStressed || !stressState) return farmers;
    return farmers.map((f) => ({
      ...f,
      decision: resolveDecision(f.farmerId, f.decision, stressState),
    }));
  }, [farmers, isStressed, stressState]);

  // ─── Columns: ~30/row at 32px cells in an 8-col layout ─────
  // 8/12 * typical 1440px = ~960px; 960 / (32+4gap) ≈ 26-30
  const gap = 4;
  const columnsPerRow = Math.max(
    1,
    Math.floor(960 / (cellSize + gap)),
  );

  // ─── Village clustering ─────────────────────────────────────
  const shouldCluster = groupBy === "village";

  const villageGroups = useMemo(() => {
    if (!shouldCluster) return null;
    const map = new Map<string, HeatmapFarmer[]>();
    for (const f of effectiveFarmers) {
      const key = f.village || "Unknown";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(f);
    }
    return map;
  }, [effectiveFarmers, shouldCluster]);

  // ─── Flat list for non-clustered mode ───────────────────────
  const flatFarmers = useMemo(
    () => (shouldCluster ? [] : effectiveFarmers),
    [effectiveFarmers, shouldCluster],
  );

  // ─── Selection handler ──────────────────────────────────────
  const handleSelect = useCallback(
    (farmerId: number) => {
      setSelectedId(farmerId);
      onSelect(farmerId);
    },
    [onSelect],
  );

  const handleToggleLetters = useCallback(() => {
    setShowLetters((p) => !p);
  }, []);

  // ─── Arrow key navigation ──────────────────────────────────
  const handleGridKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const arrowKeys = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"];
      if (!arrowKeys.includes(e.key)) return;

      e.preventDefault();

      // Build ordered list of farmer IDs currently in DOM
      const ids = shouldCluster
        ? expandedVillage && villageGroups
          ? villageGroups.get(expandedVillage)?.map((f) => f.farmerId) ?? []
          : []
        : flatFarmers.map((f) => f.farmerId);

      if (ids.length === 0) return;

      const activeEl = document.activeElement as HTMLElement;
      const activeFarmerId = activeEl?.dataset?.farmerId
        ? parseInt(activeEl.dataset.farmerId, 10)
        : null;

      let currentIdx = activeFarmerId != null
        ? ids.indexOf(activeFarmerId)
        : -1;

      if (currentIdx === -1) currentIdx = 0;

      let nextIdx = currentIdx;
      switch (e.key) {
        case "ArrowRight":
          nextIdx = Math.min(ids.length - 1, currentIdx + 1);
          break;
        case "ArrowLeft":
          nextIdx = Math.max(0, currentIdx - 1);
          break;
        case "ArrowDown":
          nextIdx = Math.min(ids.length - 1, currentIdx + columnsPerRow);
          break;
        case "ArrowUp":
          nextIdx = Math.max(0, currentIdx - columnsPerRow);
          break;
      }

      const nextId = ids[nextIdx];
      const nextEl = cellRefs.current.get(nextId);
      nextEl?.focus();
    },
    [flatFarmers, shouldCluster, expandedVillage, villageGroups, columnsPerRow],
  );

  // ─── Ref setter ─────────────────────────────────────────────
  const setCellRef = useCallback(
    (farmerId: number) => (el: HTMLButtonElement | null) => {
      if (el) cellRefs.current.set(farmerId, el);
      else cellRefs.current.delete(farmerId);
    },
    [],
  );

  return (
    <div
      data-testid="portfolio-heatmap"
      className={cn("flex flex-col gap-3", className)}
    >
      {/* ─── Legend ─────────────────────────────────────── */}
      <HeatmapLegend
        showLetters={showLetters}
        onToggleLetters={handleToggleLetters}
      />

      {/* ─── Grid (flat mode) ──────────────────────────── */}
      {!shouldCluster && (
        <div
          ref={gridRef}
          data-testid="heatmap-grid"
          role="grid"
          aria-label="Portfolio heatmap"
          onKeyDown={handleGridKeyDown}
          className="flex flex-wrap"
          style={{ gap }}
        >
          {flatFarmers.map((f) => (
            <Cell
              key={f.farmerId}
              ref={setCellRef(f.farmerId)}
              farmer={f}
              cellSize={cellSize}
              showLetter={showLetters}
              selected={selectedId === f.farmerId}
              tweenMs={isStressed ? 320 : 100}
              onSelect={handleSelect}
              onOpenReview={onOpenReview}
            />
          ))}
        </div>
      )}

      {/* ─── Grid (cluster mode) ───────────────────────── */}
      {shouldCluster && villageGroups && !expandedVillage && (
        <div
          data-testid="heatmap-clusters"
          role="grid"
          aria-label="Portfolio heatmap (clustered)"
          className="flex flex-wrap"
          style={{ gap: gap * 2 }}
        >
          {Array.from(villageGroups.entries()).map(([village, vFarmers]) => {
            const sideLen = Math.ceil(Math.sqrt(vFarmers.length));
            const clusterSize = sideLen * cellSize + (sideLen - 1) * gap;

            return (
              <button
                key={village}
                type="button"
                data-testid={`cluster-${village}`}
                aria-label={`${village}: ${vFarmers.length} farmers`}
                onClick={() => setExpandedVillage(village)}
                className={cn(
                  "flex flex-col items-center justify-center rounded-md border-2 border-dashed border-border",
                  "bg-muted/30 transition-colors hover:bg-muted/60",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                )}
                style={{
                  width: Math.max(clusterSize, cellSize * 3),
                  height: Math.max(clusterSize, cellSize * 3),
                }}
              >
                <span className="text-sm font-semibold text-foreground">
                  {village}
                </span>
                <span className="text-xs text-muted-foreground">
                  {vFarmers.length} farmers
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* ─── Expanded village sub-grid ─────────────────── */}
      {shouldCluster && expandedVillage && villageGroups && (
        <div data-testid="heatmap-expanded" className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              data-testid="cluster-back-btn"
              onClick={() => setExpandedVillage(null)}
              className={cn(
                "inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium",
                "text-brand-primary-700 hover:bg-brand-primary-50",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              )}
            >
              ← All villages
            </button>
            <span className="text-sm font-semibold text-foreground">
              {expandedVillage}
            </span>
            <span className="text-xs text-muted-foreground">
              ({villageGroups.get(expandedVillage)?.length ?? 0} farmers)
            </span>
          </div>

          <div
            data-testid="heatmap-grid"
            role="grid"
            aria-label={`${expandedVillage} heatmap`}
            onKeyDown={handleGridKeyDown}
            className="flex flex-wrap"
            style={{ gap }}
          >
            {(villageGroups.get(expandedVillage) ?? []).map((f) => (
              <Cell
                key={f.farmerId}
                ref={setCellRef(f.farmerId)}
                farmer={f}
                cellSize={cellSize}
                showLetter={showLetters}
                selected={selectedId === f.farmerId}
                tweenMs={isStressed ? 320 : 100}
                onSelect={handleSelect}
                onOpenReview={onOpenReview}
              />
            ))}
          </div>
        </div>
      )}

      {/* ─── Empty state ───────────────────────────────── */}
      {farmers.length === 0 && (
        <p
          data-testid="heatmap-empty"
          className="py-8 text-center text-sm text-muted-foreground"
        >
          No farmers to display.
        </p>
      )}
    </div>
  );
}

export default PortfolioHeatmap;
