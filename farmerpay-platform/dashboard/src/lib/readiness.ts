/**
 * Readiness feature flags — banker dashboard.
 */

import { apiGet } from "./api";

export interface ReadinessFlags {
  farmerBadge: boolean;
  sathiCoachingPriority: boolean;
  bankerMatrix: boolean;
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
  return { farmerBadge: false, sathiCoachingPriority: false, bankerMatrix: false };
}

/** Reset cached flags (for testing). */
export function _resetFlagsCache(): void { _flagsCache = null; }
