/**
 * Readiness API service — fetches loan-readiness data from the backend.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import { apiGet, getUser } from "./api";

// ─── Types ─────────────────────────────────────────────────────────

export interface ReadinessData {
  state: "ready" | "almost_ready" | "not_ready" | "needs_data";
  trust?: { band?: string; score?: number } | null;
  financialHealth?: { band?: string; score?: number } | null;
  reasons?: Array<{ field: string; status: string; labelKey?: string; band?: string }>;
  stalenessFlags?: { trust?: boolean | null; fhs?: boolean | null };
  coachingPriority?: string;
  matrixCell?: string;
}

export interface ReadinessWhyData {
  state: "ready" | "almost_ready" | "not_ready" | "needs_data";
  reasons: Array<{ field: string; status: string; labelKey?: string; band?: string }>;
  components: {
    trust?: { band: string; met: boolean; threshold: number; score?: number; sectionScores?: any };
    financialHealth?: { band: string; met: boolean; threshold: number; score?: number; breakdown?: any };
  };
  nextSteps: Array<{ labelKey: string; action: string }>;
  coachingPriority?: string;
  matrixCell?: string;
  thresholds?: { trustCutoff: number; fhsCutoff: number };
}

// ─── Preference: showNumericScores ─────────────────────────────────

const PREF_KEY = "fp_readiness_showNumericScores";

export async function getShowNumericScores(): Promise<boolean> {
  const val = await AsyncStorage.getItem(PREF_KEY);
  return val === "true";
}

export async function setShowNumericScores(value: boolean): Promise<void> {
  await AsyncStorage.setItem(PREF_KEY, value ? "true" : "false");
}

// ─── Feature flags ────────────────────────────────────────────────

export interface ReadinessFlags {
  farmerBadge: boolean;
  sathiCoachingPriority: boolean;
  bankerMatrix: boolean;
}

let _flagsCache: ReadinessFlags | null = null;

/**
 * Fetch readiness feature flags from the backend.
 * Cached for the session — flags don't change at runtime.
 */
export async function getReadinessFlags(): Promise<ReadinessFlags> {
  if (_flagsCache) return _flagsCache;
  try {
    const res = await apiGet("/readiness/flags");
    if (res?.success && res?.data) {
      _flagsCache = res.data;
      return _flagsCache;
    }
  } catch { /* fall through */ }
  return { farmerBadge: false, sathiCoachingPriority: false, bankerMatrix: false };
}

/** Reset cached flags (for testing). */
export function _resetFlagsCache(): void { _flagsCache = null; }

// ─── API calls ─────────────────────────────────────────────────────

async function getFarmerUuid(): Promise<string> {
  const user = await getUser();
  if (!user?.userId) throw new Error("Not logged in");
  return user.userId;
}

/**
 * Fetch the readiness state for the logged-in farmer.
 */
export async function getReadiness(showNumericScores?: boolean): Promise<ReadinessData | null> {
  const uuid = await getFarmerUuid();
  const qs = showNumericScores ? "?showNumericScores=true" : "";
  const res = await apiGet(`/readiness/${uuid}${qs}`);
  if (res?.success && res?.data) return res.data;
  return null;
}

/**
 * Fetch the readiness drill-down (/why) for the logged-in farmer.
 */
export async function getReadinessWhy(): Promise<ReadinessWhyData | null> {
  const uuid = await getFarmerUuid();
  const res = await apiGet(`/readiness/${uuid}/why`);
  if (res?.success && res?.data) return res.data;
  return null;
}

// ─── Helpers ───────────────────────────────────────────────────────

/**
 * Map backend state string to the component-friendly state key.
 * Backend uses snake_case; the badge component uses camelCase.
 */
export function mapState(backendState: string): "ready" | "almost" | "notReady" | "needsData" {
  switch (backendState) {
    case "ready": return "ready";
    case "almost_ready": return "almost";
    case "not_ready": return "notReady";
    case "needs_data": return "needsData";
    default: return "needsData";
  }
}
