"use client";

/**
 * StressBar — DRISHTI stress-test toggle (D6 — Spec §2.4).
 *
 * Shows a "[DRISHTI stress test]" button. When active, shows a summary
 * bar with change counts and a "Reset" CTA.
 * Includes an aria-live region to announce mode changes.
 */

import * as React from "react";
import { useReducer, useCallback, useRef } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/primitives";
import {
  stressReducer,
  INITIAL_STRESS_STATE,
  fetchStressResults,
  countChanges,
  type Decision,
  type StressState,
} from "@/app/dashboard/portfolio/stressMode";

// ─── Props ─────────────────────────────────────────────────────

export interface StressBarProps {
  /** All farmer IDs + original decisions for change-count calculation */
  farmers: { farmerId: number; decision: Decision }[];
  /** Called when stress state changes — parent passes to heatmap */
  onStressChange: (state: StressState) => void;
  className?: string;
}

// ─── Component ──────────────────────────────────────────────────

export function StressBar({
  farmers,
  onStressChange,
  className,
}: StressBarProps) {
  const [state, dispatch] = useReducer(stressReducer, INITIAL_STRESS_STATE);
  const liveRef = useRef<HTMLDivElement>(null);

  const announce = useCallback((msg: string) => {
    if (liveRef.current) {
      liveRef.current.textContent = msg;
    }
  }, []);

  // ─── Run stress test ──────────────────────────────────────

  const handleRunStress = useCallback(async () => {
    if (state.loading) return;

    dispatch({ type: "FETCH_START" });
    announce("Running DRISHTI stress test…");

    try {
      const token = localStorage.getItem("fp_token") ?? "";
      const farmerIds = farmers.map((f) => f.farmerId);
      const results = await fetchStressResults(farmerIds, token);

      dispatch({ type: "FETCH_SUCCESS", results });

      const newState = stressReducer(
        { ...INITIAL_STRESS_STATE, loading: true, error: null },
        { type: "FETCH_SUCCESS", results },
      );
      onStressChange(newState);
      announce("Stress test complete. Heatmap updated with stressed decisions.");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Stress test failed";
      dispatch({ type: "FETCH_ERROR", error: msg });
      announce(`Stress test failed: ${msg}`);
    }
  }, [state.loading, farmers, onStressChange, announce]);

  // ─── Reset ────────────────────────────────────────────────

  const handleReset = useCallback(() => {
    dispatch({ type: "RESET" });
    onStressChange(INITIAL_STRESS_STATE);
    announce("Stress test reset. Heatmap restored to original decisions.");
  }, [onStressChange, announce]);

  // ─── Change counts ────────────────────────────────────────

  const changes = state.active ? countChanges(farmers, state) : null;

  return (
    <div
      data-testid="stress-bar"
      className={cn(
        "flex items-center gap-3 rounded-md border px-3 py-2",
        state.active
          ? "border-amber-300 bg-amber-50"
          : "border-border bg-card",
        className,
      )}
    >
      {/* ─── Trigger button ──────────────────────── */}
      {!state.active && (
        <Button
          variant="secondary"
          size="sm"
          data-testid="stress-trigger-btn"
          onClick={handleRunStress}
          disabled={state.loading || farmers.length === 0}
        >
          {state.loading ? "Running…" : "DRISHTI stress test"}
        </Button>
      )}

      {/* ─── Loading indicator ───────────────────── */}
      {state.loading && (
        <span
          data-testid="stress-loading"
          className="text-xs text-muted-foreground"
        >
          Applying stress scenario…
        </span>
      )}

      {/* ─── Error message ───────────────────────── */}
      {state.error && (
        <span
          data-testid="stress-error"
          className="text-xs text-destructive"
          role="alert"
        >
          {state.error}
        </span>
      )}

      {/* ─── Active: summary + reset ─────────────── */}
      {state.active && changes && (
        <>
          <span
            data-testid="stress-badge"
            className="inline-flex items-center rounded-full bg-amber-200 px-2 py-0.5 text-[10px] font-semibold text-amber-900"
          >
            STRESS MODE
          </span>

          <span
            data-testid="stress-summary"
            className="text-xs text-foreground"
          >
            <span data-testid="stress-worsened" className="font-medium text-red-700">
              ▼ {changes.worsened} worsened
            </span>
            {" · "}
            <span data-testid="stress-improved" className="font-medium text-green-700">
              ▲ {changes.improved} improved
            </span>
            {" · "}
            <span data-testid="stress-unchanged" className="text-muted-foreground">
              {changes.unchanged} unchanged
            </span>
          </span>

          <Button
            variant="secondary"
            size="sm"
            data-testid="stress-reset-btn"
            onClick={handleReset}
            className="ml-auto"
          >
            Reset
          </Button>
        </>
      )}

      {/* ─── a11y live region ────────────────────── */}
      <div
        ref={liveRef}
        data-testid="stress-live-region"
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      />
    </div>
  );
}

export default StressBar;
