/**
 * Dismiss store — 7-day cooldown persistence for GapCards (E4).
 *
 * Stores dismissed card IDs + timestamps in AsyncStorage.
 * A card is hidden if dismissed < 7 days ago.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";

// ─── Constants ─────────────────────────────────────────────────

export const DISMISS_STORAGE_KEY = "farmerpay:gap_dismissals";
export const COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

// ─── Types ─────────────────────────────────────────────────────

/** Map of cardId → dismissal timestamp (epoch ms) */
export type DismissMap = Record<string, number>;

// ─── Read ──────────────────────────────────────────────────────

export async function loadDismissals(): Promise<DismissMap> {
  try {
    const raw = await AsyncStorage.getItem(DISMISS_STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as DismissMap;
  } catch {
    return {};
  }
}

// ─── Write ─────────────────────────────────────────────────────

export async function persistDismissal(cardId: string): Promise<void> {
  const map = await loadDismissals();
  map[cardId] = Date.now();
  await AsyncStorage.setItem(DISMISS_STORAGE_KEY, JSON.stringify(map));
}

// ─── Filter ────────────────────────────────────────────────────

/**
 * Return the set of card IDs that are currently dismissed (within cooldown).
 */
export function getActiveDismissals(
  map: DismissMap,
  now: number = Date.now(),
): Set<string> {
  const active = new Set<string>();
  for (const [id, ts] of Object.entries(map)) {
    if (now - ts < COOLDOWN_MS) {
      active.add(id);
    }
  }
  return active;
}

/**
 * Prune expired dismissals from the map (housekeeping).
 */
export function pruneExpired(
  map: DismissMap,
  now: number = Date.now(),
): DismissMap {
  const pruned: DismissMap = {};
  for (const [id, ts] of Object.entries(map)) {
    if (now - ts < COOLDOWN_MS) {
      pruned[id] = ts;
    }
  }
  return pruned;
}
