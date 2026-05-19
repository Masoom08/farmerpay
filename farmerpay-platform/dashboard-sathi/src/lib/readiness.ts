/**
 * Readiness API helper — Sathi dashboard.
 *
 * Sathis see TRUST band + coaching priority only.
 * The backend enforces this via role-based gating.
 */

import { apiGet } from "./api";
import { instrumentReadiness } from "./readinessShadowLog";

// ─── Feature flags ────────────────────────────────────────────────

export interface ReadinessFlags {
  farmerBadge: boolean;
  sathiCoachingPriority: boolean;
  bankerMatrix: boolean;
  sathiShadowLog: boolean;
}

let _flagsCache: ReadinessFlags | null = null;

/**
 * Fetch readiness feature flags. Cached for the session.
 */
export async function getReadinessFlags(token: string): Promise<ReadinessFlags> {
  if (_flagsCache) return _flagsCache;
  try {
    const res = await apiGet("/readiness/flags", token);
    if (res?.success && res?.data) {
      // Bind to a local so TS narrows it to non-null on the return.
      // Direct `return _flagsCache;` keeps the union `ReadinessFlags | null`
      // because module-level var assignment doesn't narrow across awaits.
      const flags: ReadinessFlags = res.data;
      _flagsCache = flags;
      return flags;
    }
  } catch { /* fall through */ }
  return { farmerBadge: false, sathiCoachingPriority: false, bankerMatrix: false, sathiShadowLog: false };
}

/** Reset cached flags (for testing). */
export function _resetFlagsCache(): void { _flagsCache = null; }

// ─── Types ────────────────────────────────────────────────────────

export interface SathiReadinessData {
  state: "ready" | "almost_ready" | "not_ready" | "needs_data";
  trust?: { band?: string; score?: number } | null;
  coachingPriority?: string;
  reasons?: Array<{ field: string; status: string; labelKey?: string; band?: string }>;
}

/**
 * Fetch readiness state for a farmer (Sathi role — TRUST only).
 * When sathiShadowLog is on, wraps the response in a tracking Proxy.
 */
export async function getReadiness(farmerUuid: string, token: string): Promise<SathiReadinessData | null> {
  try {
    const res = await apiGet(`/readiness/${farmerUuid}`, token);
    const data = res?.data ?? null;
    if (data && _flagsCache?.sathiShadowLog) {
      return instrumentReadiness(data, "farmer-detail", token);
    }
    return data;
  } catch {
    return null;
  }
}

/**
 * Batch-fetch readiness for multiple farmers.
 * Returns a map of farmerUuid → SathiReadinessData.
 */
/**
 * Batch-fetch readiness for multiple farmers.
 * Shadow logging is handled inside getReadiness() per-response.
 */
export async function getReadinessBatch(
  farmerUuids: string[],
  token: string,
): Promise<Record<string, SathiReadinessData>> {
  const results: Record<string, SathiReadinessData> = {};
  const batchSize = 5;
  for (let i = 0; i < farmerUuids.length; i += batchSize) {
    const batch = farmerUuids.slice(i, i + batchSize);
    const fetches = batch.map(async (uuid) => {
      const data = await getReadiness(uuid, token);
      if (data) results[uuid] = data;
    });
    await Promise.all(fetches);
  }
  return results;
}
