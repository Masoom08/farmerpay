/**
 * TRUST review — state selectors and UI state derivation.
 *
 * Spec §1.4 defines 9 visual states. This module provides:
 *   - Pure selector functions
 *   - `deriveUiState()` to resolve the single highest-precedence state
 *   - Banner copy and configuration
 *
 * Precedence (highest wins, top-down):
 *   Error > Offline > AdverseCibil > Stale > NoAa > Incomplete > FreshCompute > Default
 */

import type { TrustSnapshot, FarmerProfile } from "@/lib/trust";

// ─── Constants ─────────────────────────────────────────────────

export const STALE_THRESHOLD_DAYS = 30;

// ─── Selector functions ────────────────────────────────────────

/** Snapshot data is still loading (server fetch not resolved) */
export function isLoading(snapshot: TrustSnapshot | null | undefined): boolean {
  return snapshot === undefined;
}

/** Snapshot exists but is marked incomplete */
export function isIncomplete(snapshot: TrustSnapshot | null): boolean {
  if (!snapshot) return false;
  return (snapshot as TrustSnapshot & { status?: string }).status === "INCOMPLETE";
}

/** Days since last computation */
export function daysSinceCompute(computedAt: string, now: Date = new Date()): number {
  const computed = new Date(computedAt);
  if (isNaN(computed.getTime())) return 0;
  const diff = now.getTime() - computed.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

/** Score is older than STALE_THRESHOLD_DAYS */
export function isStale(snapshot: TrustSnapshot | null, now?: Date): boolean {
  if (!snapshot) return false;
  return daysSinceCompute(snapshot.computedAt, now) > STALE_THRESHOLD_DAYS;
}

/** Farmer has no AA consent */
export function hasNoAa(
  farmer: FarmerProfile | null,
  snapshot: TrustSnapshot | null,
): boolean {
  // Check farmer-level aaStatus if available
  const farmerAny = farmer as FarmerProfile & { aaStatus?: string } | null;
  if (farmerAny?.aaStatus === "NONE") return true;
  // Fallback: check if any AA evidence exists in snapshot
  if (snapshot?.evidence) {
    return !snapshot.evidence.some((e) => e.source === "AA");
  }
  return false;
}

/** Snapshot has adverse CIBIL flag */
export function hasCibilFlag(snapshot: TrustSnapshot | null): boolean {
  if (!snapshot) return false;
  return snapshot.cibil?.flag === true;
}

// ─── Derived UI state ──────────────────────────────────────────

export type UiState =
  | "error"
  | "offline"
  | "adverse-cibil"
  | "stale"
  | "no-aa"
  | "incomplete"
  | "fresh-compute"
  | "loading"
  | "default";

export interface UiStateResult {
  state: UiState;
  /** Additional info for banner rendering */
  staleDays?: number;
  computedAt?: string;
}

export function deriveUiState(opts: {
  snapshot: TrustSnapshot | null | undefined;
  farmer: FarmerProfile | null;
  isOnline: boolean;
  hasError: boolean;
  now?: Date;
}): UiStateResult {
  const { snapshot, farmer, isOnline, hasError, now } = opts;

  // 1. Error (fetch failed, snapshot=null with hasError flag)
  if (hasError) {
    return { state: "error" };
  }

  // 2. Loading
  if (snapshot === undefined) {
    return { state: "loading" };
  }

  // 3. Offline — show banner but still render stale data
  if (!isOnline) {
    return {
      state: "offline",
      computedAt: snapshot?.computedAt,
    };
  }

  // 4. Adverse CIBIL
  if (hasCibilFlag(snapshot)) {
    // Also check stale — stale + cibil both show their banners
    // But adverse-cibil wins as the primary state for footer gating
    const days = snapshot ? daysSinceCompute(snapshot.computedAt, now) : 0;
    return {
      state: "adverse-cibil",
      staleDays: days > STALE_THRESHOLD_DAYS ? days : undefined,
      computedAt: snapshot?.computedAt,
    };
  }

  // 5. Stale (>30 days)
  if (isStale(snapshot, now)) {
    const days = snapshot ? daysSinceCompute(snapshot.computedAt, now) : 0;
    return {
      state: "stale",
      staleDays: days,
      computedAt: snapshot?.computedAt,
    };
  }

  // 6. No AA consent
  if (hasNoAa(farmer, snapshot)) {
    return { state: "no-aa" };
  }

  // 7. Incomplete
  if (isIncomplete(snapshot)) {
    return { state: "incomplete" };
  }

  // 8. No snapshot at all
  if (snapshot === null) {
    return { state: "error" };
  }

  // 9. Default — everything looks good
  return { state: "default" };
}

// ─── Banner copy (spec §1.4 keys) ─────────────────────────────

export interface BannerConfig {
  variant: "warning" | "error" | "info";
  message: string;
  showRefresh?: boolean;
}

export function getStaleBanner(days: number): BannerConfig {
  return {
    variant: "warning",
    message: `Score is ${days} days old. Refresh from AA and CIBIL before sanctioning.`,
    showRefresh: true,
  };
}

export function getNoAaBanner(): BannerConfig {
  return {
    variant: "info",
    message:
      "AA not consented. Income pillar will be computed from farmer-declared only (low confidence).",
  };
}

export function getOfflineBanner(computedAt?: string | null): BannerConfig {
  const dateStr = computedAt
    ? new Date(computedAt).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "unknown";
  return {
    variant: "warning",
    message: `Offline — showing last fetched data (${dateStr}).`,
  };
}

export function getErrorBanner(): BannerConfig {
  return {
    variant: "error",
    message: "Failed to load TRUST data. Please try again.",
    showRefresh: true,
  };
}
