"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

// ─── Types ──────────────────────────────────────────────────────

export interface HeatmapFarmer {
  farmerId: number;
  name: string;
  village: string;
  score: number;
  decision: "SANCTION" | "RECONSIDER" | "REJECT";
  dataAgeDays: number;
}

export interface CellProps {
  farmer: HeatmapFarmer;
  cellSize: number;
  showLetter: boolean;
  selected: boolean;
  /** Transition duration in ms for stress-mode colour tween (default 100) */
  tweenMs?: number;
  onSelect: (farmerId: number) => void;
  /** Called on Shift+Enter — opens full review */
  onOpenReview?: (farmerId: number) => void;
}

// ─── Decision colour tokens ─────────────────────────────────────

const DECISION_COLORS: Record<string, { bg: string; hoverBg: string }> = {
  SANCTION: { bg: "bg-green-600", hoverBg: "hover:bg-green-700" },
  RECONSIDER: { bg: "bg-amber-500", hoverBg: "hover:bg-amber-600" },
  REJECT: { bg: "bg-red-600", hoverBg: "hover:bg-red-700" },
};

const DECISION_LETTER: Record<string, string> = {
  SANCTION: "S",
  RECONSIDER: "R",
  REJECT: "J", // "J" for reJect per spec §2.6
};

// ─── Helpers ────────────────────────────────────────────────────

/**
 * Darkness: shade = clamp((60 - dataAgeDays) / 60, 0.2, 1)
 * Fresh data (0 days) → 1.0 (fully dark)
 * Stale data (≥60 days) → 0.2 (mostly faded)
 */
export function computeOpacity(dataAgeDays: number): number {
  return Math.min(1, Math.max(0.2, (60 - dataAgeDays) / 60));
}

// ─── Component ──────────────────────────────────────────────────

export const Cell = React.forwardRef<HTMLButtonElement, CellProps>(
  function Cell(
    { farmer, cellSize, showLetter, selected, tweenMs = 100, onSelect, onOpenReview },
    ref,
  ) {
    const { farmerId, name, village, score, decision, dataAgeDays } = farmer;
    const opacity = computeOpacity(dataAgeDays);
    const colors = DECISION_COLORS[decision] ?? DECISION_COLORS.RECONSIDER;
    const letter = DECISION_LETTER[decision] ?? "?";

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && e.shiftKey) {
        e.preventDefault();
        onOpenReview?.(farmerId);
      } else if (e.key === "Enter") {
        e.preventDefault();
        onSelect(farmerId);
      }
      // Arrow navigation handled by parent grid
    };

    return (
      <button
        ref={ref}
        type="button"
        data-testid={`cell-${farmerId}`}
        data-farmer-id={farmerId}
        aria-label={`${name}, ${village}, score ${score}, ${decision}`}
        aria-pressed={selected}
        onClick={() => onSelect(farmerId)}
        onKeyDown={handleKeyDown}
        title={`${name} · ${village} · Score ${score}`}
        className={cn(
          "relative inline-flex items-center justify-center rounded-sm",
          "transition-all",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:z-10",
          colors.bg,
          colors.hoverBg,
          selected && "ring-2 ring-foreground ring-offset-1",
        )}
        style={{
          width: cellSize,
          height: cellSize,
          opacity,
          transitionDuration: `${tweenMs}ms`,
        }}
      >
        {showLetter && (
          <span
            data-testid={`letter-${farmerId}`}
            className="pointer-events-none select-none text-white"
            style={{ fontSize: 11, fontWeight: 600 }}
            aria-hidden="true"
          >
            {letter}
          </span>
        )}
      </button>
    );
  },
);

export default Cell;
