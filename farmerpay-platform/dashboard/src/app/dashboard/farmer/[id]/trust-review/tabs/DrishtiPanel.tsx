"use client";

import * as React from "react";
import { useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import {
  getFarmerScenarios,
  getScenarioResult,
  ENGINE_LABELS,
  type Scenario,
} from "@/lib/drishti";
import { previewTrustScore, type TrustPreview } from "@/lib/trustPreview";

// ─── Types ──────────────────────────────────────────────────────

export interface DrishtiScenarioOption {
  runUuid: string;
  engineType: string;
  label: string;
  createdAt: string;
}

export interface DrishtiPanelProps {
  farmerId: number;
  currentScore: number;
  /** Pre-loaded scenario list (from RSC or parent) */
  scenarios?: DrishtiScenarioOption[];
  className?: string;
}

type PanelState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | {
      status: "ready";
      scenarioLabel: string;
      projectedScore: number;
      delta: number;
    };

// ─── Component ──────────────────────────────────────────────────

export function DrishtiPanel({
  farmerId,
  currentScore,
  scenarios: initialScenarios,
  className,
}: DrishtiPanelProps) {
  const [scenarios, setScenarios] = useState<DrishtiScenarioOption[]>(
    initialScenarios ?? [],
  );
  const [scenariosLoading, setScenariosLoading] = useState(false);
  const [selectedRunUuid, setSelectedRunUuid] = useState<string>("");
  const [state, setState] = useState<PanelState>({ status: "idle" });

  // Load scenarios on mount if not pre-loaded
  const loadScenarios = useCallback(async () => {
    if (scenarios.length > 0) return;
    setScenariosLoading(true);
    try {
      const token = localStorage.getItem("fp_token") ?? "";
      const result = await getFarmerScenarios(token, farmerId);
      const mapped: DrishtiScenarioOption[] = (result ?? []).map(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (r: any) => ({
          runUuid: r.run_uuid ?? r.runUuid,
          engineType: r.engine_type ?? r.engineType,
          label:
            r.label ??
            ENGINE_LABELS[r.engine_type ?? r.engineType] ??
            "Scenario",
          createdAt: r.created_at ?? r.createdAt,
        }),
      );
      setScenarios(mapped);
    } catch {
      // Silently fail — user can still see the selector
    } finally {
      setScenariosLoading(false);
    }
  }, [farmerId, scenarios.length]);

  // Auto-load on first render if no initial scenarios
  React.useEffect(() => {
    if (!initialScenarios || initialScenarios.length === 0) {
      loadScenarios();
    }
  }, [initialScenarios, loadScenarios]);

  const handleSelect = useCallback(
    async (runUuid: string) => {
      setSelectedRunUuid(runUuid);
      if (!runUuid) {
        setState({ status: "idle" });
        return;
      }

      setState({ status: "loading" });
      try {
        const token = localStorage.getItem("fp_token") ?? "";

        // 1. Fetch the full scenario result
        const scenarioResult = await getScenarioResult(token, runUuid);

        // 2. Call TRUST preview endpoint (read-only, non-persisting)
        const preview: TrustPreview = await previewTrustScore(
          farmerId,
          runUuid,
          token,
        );

        const selectedScenario = scenarios.find((s) => s.runUuid === runUuid);
        const label = selectedScenario?.label ?? "Scenario";

        setState({
          status: "ready",
          scenarioLabel: label,
          projectedScore: preview.projectedScore,
          delta: preview.projectedScore - currentScore,
        });
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : "Failed to load projection";
        setState({ status: "error", message });
      }
    },
    [farmerId, currentScore, scenarios],
  );

  const handleRetry = useCallback(() => {
    if (selectedRunUuid) {
      handleSelect(selectedRunUuid);
    }
  }, [selectedRunUuid, handleSelect]);

  return (
    <div
      data-testid="drishti-panel"
      className={cn("flex flex-col gap-4", className)}
    >
      {/* ─── Scenario selector ─────────────────────── */}
      <div className="flex flex-col gap-2">
        <label
          htmlFor="scenario-select"
          className="text-xs font-medium text-muted-foreground"
        >
          Select a DRISHTI scenario to preview projected TRUST score
        </label>
        <select
          id="scenario-select"
          data-testid="scenario-select"
          value={selectedRunUuid}
          onChange={(e) => handleSelect(e.target.value)}
          disabled={scenariosLoading}
          className={cn(
            "h-9 rounded-md border border-input bg-background px-3 text-sm",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            "disabled:opacity-50",
          )}
        >
          <option value="">
            {scenariosLoading
              ? "Loading scenarios…"
              : "— Choose a scenario —"}
          </option>
          {scenarios.map((s) => (
            <option key={s.runUuid} value={s.runUuid}>
              {s.label} ({ENGINE_LABELS[s.engineType] ?? s.engineType})
            </option>
          ))}
        </select>
      </div>

      {/* ─── Projection result ─────────────────────── */}
      <div data-testid="projection-result" className="min-h-[80px]">
        {/* Idle */}
        {state.status === "idle" && (
          <p
            data-testid="projection-idle"
            className="py-6 text-center text-sm text-muted-foreground"
          >
            Select a scenario above to see projected TRUST impact.
          </p>
        )}

        {/* Loading skeleton */}
        {state.status === "loading" && (
          <div
            data-testid="projection-loading"
            className="flex items-center justify-center py-6"
          >
            <div className="flex flex-col items-center gap-2">
              <div
                data-testid="skeleton-score"
                className="h-8 w-32 animate-pulse rounded-md bg-muted"
                role="status"
                aria-label="Loading projected score"
              />
              <div className="h-4 w-48 animate-pulse rounded bg-muted" />
            </div>
          </div>
        )}

        {/* Error with retry */}
        {state.status === "error" && (
          <div
            data-testid="projection-error"
            className="flex flex-col items-center gap-2 py-6"
            role="alert"
          >
            <p className="text-sm text-destructive">{state.message}</p>
            <button
              type="button"
              data-testid="retry-btn"
              onClick={handleRetry}
              className={cn(
                "inline-flex items-center rounded-md px-3 py-1.5 text-xs font-medium",
                "bg-destructive/10 text-destructive",
                "transition-colors hover:bg-destructive/20",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              )}
            >
              Retry
            </button>
          </div>
        )}

        {/* Ready — projected score delta */}
        {state.status === "ready" && (
          <div
            data-testid="projection-ready"
            className={cn(
              "rounded-lg border px-4 py-4",
              state.delta > 0
                ? "border-emerald-200 bg-emerald-50"
                : state.delta < 0
                  ? "border-red-200 bg-red-50"
                  : "border-neutral-200 bg-neutral-50",
            )}
          >
            <p className="text-xs font-medium text-muted-foreground">
              Projected TRUST under{" "}
              <span className="font-semibold text-foreground">
                {state.scenarioLabel}
              </span>
            </p>
            <div className="mt-1 flex items-baseline gap-2">
              <span
                data-testid="current-score"
                className="text-lg font-bold text-muted-foreground"
              >
                {currentScore}
              </span>
              <span className="text-muted-foreground" aria-hidden="true">
                →
              </span>
              <span
                data-testid="projected-score"
                className="text-2xl font-extrabold text-foreground"
              >
                {state.projectedScore}
              </span>
              <span
                data-testid="score-delta"
                className={cn(
                  "text-sm font-bold",
                  state.delta > 0
                    ? "text-emerald-700"
                    : state.delta < 0
                      ? "text-red-700"
                      : "text-neutral-500",
                )}
              >
                ({state.delta > 0 ? "+" : ""}
                {state.delta})
              </span>
            </div>
            <p className="sr-only">
              Current score {currentScore}, projected score{" "}
              {state.projectedScore}, delta {state.delta > 0 ? "plus" : "minus"}{" "}
              {Math.abs(state.delta)}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default DrishtiPanel;
