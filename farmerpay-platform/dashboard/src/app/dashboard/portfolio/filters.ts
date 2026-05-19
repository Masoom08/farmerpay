/**
 * Portfolio filter state management (D1).
 *
 * Spec §2.1 — 6 filters: Product, Village, Score band, Decision, Last refresh, Crop.
 * All filter values are synced to URL search params for shareability.
 */

// ─── Filter options (spec §2.1) ─────────────────────────────────

export const FILTER_DEFS = {
  product: {
    key: "product",
    label: "Product",
    options: [
      { value: "KCC", label: "KCC" },
      { value: "CROP_LOAN", label: "Crop Loan" },
      { value: "DAIRY_LOAN", label: "Dairy Loan" },
      { value: "FISHERY_LOAN", label: "Fishery Loan" },
      { value: "HORTICULTURE", label: "Horticulture" },
    ],
  },
  village: {
    key: "village",
    label: "Village",
    /** Dynamic — populated from portfolio data */
    options: [] as { value: string; label: string }[],
  },
  scoreBand: {
    key: "scoreBand",
    label: "Score band",
    options: [
      { value: "HIGH", label: "High (>750)" },
      { value: "MEDIUM", label: "Medium (500–750)" },
      { value: "LOW", label: "Low (<500)" },
    ],
  },
  decision: {
    key: "decision",
    label: "Decision",
    options: [
      { value: "SANCTION", label: "Sanction" },
      { value: "RECONSIDER", label: "Reconsider" },
      { value: "REJECT", label: "Reject" },
      { value: "PENDING", label: "Pending" },
    ],
  },
  lastRefresh: {
    key: "lastRefresh",
    label: "Last refresh",
    options: [
      { value: "7d", label: "Last 7 days" },
      { value: "30d", label: "Last 30 days" },
      { value: "90d", label: "Last 90 days" },
      { value: "stale", label: "Stale (>30d)" },
    ],
  },
  crop: {
    key: "crop",
    label: "Crop",
    /** Dynamic — populated from portfolio data */
    options: [] as { value: string; label: string }[],
  },
} as const;

export type FilterKey = keyof typeof FILTER_DEFS;

export const ALL_FILTER_KEYS: FilterKey[] = [
  "product",
  "village",
  "scoreBand",
  "decision",
  "lastRefresh",
  "crop",
];

// ─── Filter state type ─────────────────────────────────────────

export type FilterState = Record<FilterKey, string[]>;

export const EMPTY_FILTERS: FilterState = {
  product: [],
  village: [],
  scoreBand: [],
  decision: [],
  lastRefresh: [],
  crop: [],
};

// ─── URL sync helpers ──────────────────────────────────────────

/**
 * Parse filter state from URLSearchParams.
 * Each filter key maps to a comma-separated list: `?product=KCC,CROP_LOAN&decision=SANCTION`
 */
export function parseFiltersFromParams(
  searchParams: URLSearchParams,
): FilterState {
  const filters: FilterState = { ...EMPTY_FILTERS };
  for (const key of ALL_FILTER_KEYS) {
    const raw = searchParams.get(key);
    if (raw) {
      filters[key] = raw
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    }
  }
  return filters;
}

/**
 * Serialize filter state to URLSearchParams string.
 * Omits keys with empty arrays.
 */
export function filtersToParams(filters: FilterState): string {
  const params = new URLSearchParams();
  for (const key of ALL_FILTER_KEYS) {
    const values = filters[key];
    if (values.length > 0) {
      params.set(key, values.join(","));
    }
  }
  return params.toString();
}

/**
 * Toggle a single value within a filter key.
 * Returns a new FilterState (immutable).
 */
export function toggleFilterValue(
  filters: FilterState,
  key: FilterKey,
  value: string,
): FilterState {
  const current = filters[key];
  const next = current.includes(value)
    ? current.filter((v) => v !== value)
    : [...current, value];
  return { ...filters, key: undefined, [key]: next } as unknown as FilterState;
}

/**
 * Remove a specific value from a filter key.
 */
export function removeFilterValue(
  filters: FilterState,
  key: FilterKey,
  value: string,
): FilterState {
  return {
    ...filters,
    [key]: filters[key].filter((v) => v !== value),
  };
}

/**
 * Count total active filter values.
 */
export function countActiveFilters(filters: FilterState): number {
  return ALL_FILTER_KEYS.reduce(
    (sum, key) => sum + filters[key].length,
    0,
  );
}

/**
 * Check if any filter is active.
 */
export function hasActiveFilters(filters: FilterState): boolean {
  return countActiveFilters(filters) > 0;
}

// ─── Portfolio item type ───────────────────────────────────────

export interface PortfolioFarmer {
  farmerId: number;
  farmerName: string;
  village: string;
  product: string;
  crop: string;
  score: number;
  scoreBand: "HIGH" | "MEDIUM" | "LOW";
  decision: "SANCTION" | "RECONSIDER" | "REJECT" | "PENDING";
  loanAmountInr: number;
  lastRefreshedAt: string;
  computedAt: string;
}

// ─── Client-side filtering ─────────────────────────────────────

export function applyFilters(
  farmers: PortfolioFarmer[],
  filters: FilterState,
): PortfolioFarmer[] {
  return farmers.filter((f) => {
    // Product
    if (filters.product.length > 0 && !filters.product.includes(f.product)) {
      return false;
    }
    // Village
    if (filters.village.length > 0 && !filters.village.includes(f.village)) {
      return false;
    }
    // Score band
    if (
      filters.scoreBand.length > 0 &&
      !filters.scoreBand.includes(f.scoreBand)
    ) {
      return false;
    }
    // Decision
    if (
      filters.decision.length > 0 &&
      !filters.decision.includes(f.decision)
    ) {
      return false;
    }
    // Crop
    if (filters.crop.length > 0 && !filters.crop.includes(f.crop)) {
      return false;
    }
    // Last refresh
    if (filters.lastRefresh.length > 0) {
      const refreshed = new Date(f.lastRefreshedAt);
      const now = new Date();
      const diffDays = Math.floor(
        (now.getTime() - refreshed.getTime()) / (1000 * 60 * 60 * 24),
      );
      const matches = filters.lastRefresh.some((v) => {
        switch (v) {
          case "7d":
            return diffDays <= 7;
          case "30d":
            return diffDays <= 30;
          case "90d":
            return diffDays <= 90;
          case "stale":
            return diffDays > 30;
          default:
            return true;
        }
      });
      if (!matches) return false;
    }
    return true;
  });
}

/**
 * Extract dynamic filter options from portfolio data.
 */
export function extractDynamicOptions(
  farmers: PortfolioFarmer[],
): { villages: { value: string; label: string }[]; crops: { value: string; label: string }[] } {
  const villageSet = new Set<string>();
  const cropSet = new Set<string>();
  for (const f of farmers) {
    if (f.village) villageSet.add(f.village);
    if (f.crop) cropSet.add(f.crop);
  }
  return {
    villages: Array.from(villageSet)
      .sort()
      .map((v) => ({ value: v, label: v })),
    crops: Array.from(cropSet)
      .sort()
      .map((c) => ({ value: c, label: c })),
  };
}
