/**
 * Stress-mode state management (D6 — Spec §2.4).
 *
 * Fetches DRISHTI stress output and builds a parallel decision map
 * keyed by farmerId. The heatmap reads from this map in stress mode.
 *
 * Original decisions are never mutated — the stressed map is overlaid.
 */

import { apiPost } from "@/lib/api";

// ─── Types ─────────────────────────────────────────────────────

export type Decision = "SANCTION" | "RECONSIDER" | "REJECT";

export interface StressResult {
  farmerId: number;
  stressedDecision: Decision;
  stressedScore: number;
}

export interface StressState {
  /** Whether stress mode is currently active */
  active: boolean;
  /** Loading state while fetching stress data */
  loading: boolean;
  /** Error message if stress fetch failed */
  error: string | null;
  /** Map of farmerId → stressed decision */
  stressedDecisions: Map<number, Decision>;
  /** Map of farmerId → stressed score */
  stressedScores: Map<number, number>;
}

export const INITIAL_STRESS_STATE: StressState = {
  active: false,
  loading: false,
  error: null,
  stressedDecisions: new Map(),
  stressedScores: new Map(),
};

// ─── Reducer ───────────────────────────────────────────────────

export type StressAction =
  | { type: "FETCH_START" }
  | { type: "FETCH_SUCCESS"; results: StressResult[] }
  | { type: "FETCH_ERROR"; error: string }
  | { type: "RESET" };

export function stressReducer(
  state: StressState,
  action: StressAction,
): StressState {
  switch (action.type) {
    case "FETCH_START":
      return {
        ...state,
        loading: true,
        error: null,
      };

    case "FETCH_SUCCESS": {
      const decisions = new Map<number, Decision>();
      const scores = new Map<number, number>();
      for (const r of action.results) {
        decisions.set(r.farmerId, r.stressedDecision);
        scores.set(r.farmerId, r.stressedScore);
      }
      return {
        active: true,
        loading: false,
        error: null,
        stressedDecisions: decisions,
        stressedScores: scores,
      };
    }

    case "FETCH_ERROR":
      return {
        ...state,
        loading: false,
        error: action.error,
      };

    case "RESET":
      return { ...INITIAL_STRESS_STATE };

    default:
      return state;
  }
}

// ─── API helper ────────────────────────────────────────────────

/**
 * Fetch DRISHTI stress results for a list of farmer IDs.
 * POST /drishti/portfolio/stress with { farmerIds: number[] }
 */
export async function fetchStressResults(
  farmerIds: number[],
  token: string,
): Promise<StressResult[]> {
  const res = await apiPost(
    "/drishti/portfolio/stress",
    { farmerIds },
    token,
  );
  const items = res?.data ?? res?.results ?? res ?? [];
  return (items as Array<Record<string, unknown>>).map((r) => ({
    farmerId: Number(r.farmerId ?? r.farmer_id),
    stressedDecision: (r.stressedDecision ?? r.stressed_decision ?? "RECONSIDER") as Decision,
    stressedScore: Number(r.stressedScore ?? r.stressed_score ?? 0),
  }));
}

// ─── Selectors ─────────────────────────────────────────────────

/**
 * Resolve the effective decision for a farmer.
 * In stress mode, returns the stressed decision if available;
 * otherwise falls back to the original decision.
 */
export function resolveDecision(
  farmerId: number,
  originalDecision: Decision,
  stressState: StressState,
): Decision {
  if (!stressState.active) return originalDecision;
  return stressState.stressedDecisions.get(farmerId) ?? originalDecision;
}

/**
 * Count how many decisions changed under stress.
 */
export function countChanges(
  farmers: { farmerId: number; decision: Decision }[],
  stressState: StressState,
): { worsened: number; improved: number; unchanged: number } {
  const RANK: Record<Decision, number> = {
    SANCTION: 3,
    RECONSIDER: 2,
    REJECT: 1,
  };

  let worsened = 0;
  let improved = 0;
  let unchanged = 0;

  for (const f of farmers) {
    const stressed = stressState.stressedDecisions.get(f.farmerId);
    if (!stressed || stressed === f.decision) {
      unchanged++;
    } else if (RANK[stressed] < RANK[f.decision]) {
      worsened++;
    } else {
      improved++;
    }
  }

  return { worsened, improved, unchanged };
}
