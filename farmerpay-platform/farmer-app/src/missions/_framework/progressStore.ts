/**
 * progressStore — Per-mission abandonment resume + point-lift honesty (F6 — Spec §4.5).
 *
 * Manages saved mission progress with a 24-hour resume window.
 * After 24h, progress expires and the mission starts fresh.
 *
 * Point-lift honesty: when the server returns both estimatedLift and actualLift,
 * this module provides the comparison logic for transparent display.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";

// ─── Types ──────────────────────────────────────────────────────

export interface MissionProgressEntry {
  missionId: string;
  step: string;
  data: Record<string, unknown>;
  savedAt: number;
}

export interface PointLiftResult {
  estimated: number;
  actual: number;
  /** Whether estimated and actual differ */
  differs: boolean;
  /** Absolute delta between estimated and actual */
  delta: number;
  /** Display string for the actual lift (always shown) */
  displayLift: number;
  /** Whether the actual lift was better than estimated */
  betterThanEstimated: boolean;
}

// ─── Constants ──────────────────────────────────────────────────

export const PROGRESS_PREFIX = "farmerpay:mission:";
export const RESUME_WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours

// ─── Progress persistence ───────────────────────────────────────

/**
 * Save mission progress with timestamp for the 24h resume window.
 */
export async function saveProgress(
  missionId: string,
  step: string,
  data: Record<string, unknown> = {},
): Promise<void> {
  const entry: MissionProgressEntry = {
    missionId,
    step,
    data,
    savedAt: Date.now(),
  };
  await AsyncStorage.setItem(
    `${PROGRESS_PREFIX}${missionId}`,
    JSON.stringify(entry),
  );
}

/**
 * Load saved progress. Returns null if not found or expired (>24h).
 */
export async function loadProgress(
  missionId: string,
  now: number = Date.now(),
): Promise<MissionProgressEntry | null> {
  try {
    const raw = await AsyncStorage.getItem(`${PROGRESS_PREFIX}${missionId}`);
    if (!raw) return null;

    const entry: MissionProgressEntry = JSON.parse(raw);

    // Check 24h window
    if (now - entry.savedAt > RESUME_WINDOW_MS) {
      // Expired — clean up
      await AsyncStorage.removeItem(`${PROGRESS_PREFIX}${missionId}`);
      return null;
    }

    return entry;
  } catch {
    return null;
  }
}

/**
 * Check if a mission has resumable progress within the 24h window.
 */
export async function hasResumableProgress(
  missionId: string,
  now: number = Date.now(),
): Promise<boolean> {
  const entry = await loadProgress(missionId, now);
  return entry !== null && entry.step !== "INTRO" && entry.step !== "RESULT";
}

/**
 * Clear saved progress for a mission (call on completion or fresh start).
 */
export async function clearProgress(missionId: string): Promise<void> {
  await AsyncStorage.removeItem(`${PROGRESS_PREFIX}${missionId}`);
}

/**
 * Get all saved mission progresses (for resume prompt listing).
 * Returns only non-expired entries that are past INTRO.
 */
export async function getAllResumable(
  missionIds: string[],
  now: number = Date.now(),
): Promise<MissionProgressEntry[]> {
  const results: MissionProgressEntry[] = [];

  for (const id of missionIds) {
    const entry = await loadProgress(id, now);
    if (entry && entry.step !== "INTRO" && entry.step !== "RESULT") {
      results.push(entry);
    }
  }

  return results;
}

// ─── Point-lift honesty (§4.5) ──────────────────────────────────

/**
 * Compare estimated vs actual point lift for honest display.
 *
 * When the server returns both estimatedLift and actualLift after a mission,
 * this function determines:
 *   - Whether they differ (triggers the honesty display)
 *   - The delta between them
 *   - Which value to show as the primary lift
 *
 * Spec §4.5: if actualLift differs from estimatedLift, show both + explanation line.
 */
export function comparePointLift(
  estimated: number,
  actual: number,
): PointLiftResult {
  return {
    estimated,
    actual,
    differs: estimated !== actual,
    delta: Math.abs(actual - estimated),
    displayLift: actual,
    betterThanEstimated: actual > estimated,
  };
}

/**
 * Build the honesty display strings for MissionResult.
 */
export function buildHonestyStrings(
  result: PointLiftResult,
  locale: "en" | "hi" = "en",
): {
  estimatedLine: string;
  actualLine: string;
  explanationLine: string;
} | null {
  if (!result.differs) return null;

  if (locale === "hi") {
    return {
      estimatedLine: `अनुमानित: +${result.estimated} अंक`,
      actualLine: `वास्तविक: +${result.actual} अंक`,
      explanationLine:
        "वास्तविक अंक अन्य कारकों के आधार पर भिन्न हो सकते हैं।",
    };
  }

  return {
    estimatedLine: `Estimated: +${result.estimated} points`,
    actualLine: `Actual: +${result.actual} points`,
    explanationLine: "Actual points may differ based on other factors.",
  };
}
